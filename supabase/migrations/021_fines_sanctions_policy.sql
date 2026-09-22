-- Fines and sanctions policy foundation.
-- Forward-only policy: historical attendance records are not retroactively billed.
begin;

alter table public.events
  add column if not exists sanctions_enabled boolean not null default false;

alter table public.attendance_scans
  add column if not exists fine_policy_enabled boolean not null default false;

-- Existing rows are legacy records and remain permanently fine-free.
update public.attendance_scans
set fine_policy_enabled = false
where fine_policy_enabled is null;

-- Add the independent calculation switch without changing showFees.
update public.system_settings
set settings = jsonb_set(
  coalesce(settings, '{}'::jsonb),
  '{finesEnabled}',
  to_jsonb(coalesce((settings->>'finesEnabled')::boolean, false)),
  true
)
where id = 1;

create or replace function public.is_fines_enabled()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((s.settings->>'finesEnabled')::boolean, false)
  from public.system_settings s
  where s.id = 1;
$$;

revoke all on function public.is_fines_enabled() from public;
grant execute on function public.is_fines_enabled() to authenticated;

-- Snapshot the global policy only when a scan first becomes late or absent.
create or replace function public.capture_attendance_fine_policy()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.status in ('late', 'absent') then
      new.fine_policy_enabled := public.is_fines_enabled();
    else
      new.fine_policy_enabled := false;
    end if;
  elsif new.status in ('late', 'absent') then
    if old.status not in ('late', 'absent') then
      new.fine_policy_enabled := public.is_fines_enabled();
    elsif new.fine_policy_enabled is null then
      new.fine_policy_enabled := false;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists attendance_scans_capture_fine_policy on public.attendance_scans;
create trigger attendance_scans_capture_fine_policy
before insert or update of status
on public.attendance_scans
for each row execute function public.capture_attendance_fine_policy();

create or replace function public.reconcile_attendance_fine()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  calculated_amount numeric(10,2);
  existing_fine_id uuid;
begin
  select f.id
  into existing_fine_id
  from public.fines f
  where f.attendance_scan_id = new.id
  limit 1;

  if new.status in ('absent', 'late')
     and coalesce(new.fine_policy_enabled, false) then
    calculated_amount := public.event_session_fine_amount(
      new.event_id,
      new.session_label,
      new.status
    );

    if coalesce(calculated_amount, 0) > 0 then
      if existing_fine_id is null then
        insert into public.fines (
          student_id,
          event_id,
          attendance_scan_id,
          session_label,
          amount,
          reason,
          status
        ) values (
          new.student_id,
          new.event_id,
          new.id,
          new.session_label,
          calculated_amount,
          case when new.status = 'late' then 'Late attendance' else 'Absent attendance' end,
          'unpaid'
        );
      else
        update public.fines
        set
          student_id = new.student_id,
          event_id = new.event_id,
          session_label = new.session_label,
          amount = calculated_amount,
          reason = case when new.status = 'late' then 'Late attendance' else 'Absent attendance' end,
          status = case when status = 'excused' then 'excused' else 'unpaid' end
        where id = existing_fine_id
          and status <> 'paid';
      end if;
    elsif existing_fine_id is not null then
      delete from public.fines
      where id = existing_fine_id
        and status = 'unpaid';
    end if;
  elsif new.status not in ('absent', 'late')
        and existing_fine_id is not null then
    -- Preserve paid and excused history; clear only unpaid fines.
    delete from public.fines
    where id = existing_fine_id
      and status = 'unpaid';
  end if;

  return new;
end;
$$;

drop trigger if exists attendance_scans_reconcile_fine on public.attendance_scans;
create trigger attendance_scans_reconcile_fine
after insert or update of event_id, student_id, session_label, status, fine_policy_enabled
on public.attendance_scans
for each row execute function public.reconcile_attendance_fine();

commit;
