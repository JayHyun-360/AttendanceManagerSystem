-- Adesse attendance and fine lifecycle
-- Run this block in Supabase SQL Editor before relying on automatic fine generation.

begin;

alter table public.fines
  add column if not exists attendance_scan_id uuid references public.attendance_scans(id) on delete set null,
  add column if not exists session_label text;

alter table public.excuse_requests
  add column if not exists event_id uuid references public.events(id) on delete set null,
  add column if not exists attendance_scan_id uuid references public.attendance_scans(id) on delete set null;

create unique index if not exists fines_attendance_scan_unique
  on public.fines (attendance_scan_id)
  where attendance_scan_id is not null;

create or replace function public.event_session_fine_amount(
  p_event_id uuid,
  p_session_label text,
  p_status public.attendance_status
)
returns numeric
language sql
stable
set search_path = public
as $$
  select case
    when p_status = 'late' then coalesce(
      case when p_session_label = 'morning' then e.morning_late_fine else e.afternoon_late_fine end,
      e.late_fine,
      0
    )
    when p_status = 'absent' then coalesce(
      case when p_session_label = 'morning' then e.morning_absent_fine else e.afternoon_absent_fine end,
      e.absent_fine,
      0
    )
    else 0
  end
  from public.events e
  where e.id = p_event_id;
$$;

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
  select id into existing_fine_id
  from public.fines
  where attendance_scan_id = new.id
  limit 1;

  if new.status in ('absent', 'late') then
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
  elsif existing_fine_id is not null then
    delete from public.fines
    where id = existing_fine_id
      and status = 'unpaid';
  end if;

  return new;
end;
$$;

drop trigger if exists attendance_scans_reconcile_fine on public.attendance_scans;
create trigger attendance_scans_reconcile_fine
after insert or update of event_id, student_id, session_label, status
on public.attendance_scans
for each row execute function public.reconcile_attendance_fine();

create or replace function public.reconcile_excuse_fine()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved' and new.fine_id is not null then
    update public.fines
    set status = 'excused'
    where id = new.fine_id
      and student_id = new.student_id
      and status = 'unpaid';
  elsif new.status = 'denied' and new.fine_id is not null then
    update public.fines
    set status = 'unpaid'
    where id = new.fine_id
      and student_id = new.student_id
      and status = 'excused';
  end if;

  return new;
end;
$$;

drop trigger if exists excuse_requests_reconcile_fine on public.excuse_requests;
create trigger excuse_requests_reconcile_fine
after insert or update of status, fine_id
on public.excuse_requests
for each row execute function public.reconcile_excuse_fine();

-- Backfill one linked fine for existing absent/late scan rows where no linked fine exists.
do $$
declare
  scan_row record;
  calculated_amount numeric(10,2);
begin
  for scan_row in
    select s.*
    from public.attendance_scans s
    left join public.fines f on f.attendance_scan_id = s.id
    where s.status in ('absent', 'late')
      and f.id is null
  loop
    calculated_amount := public.event_session_fine_amount(
      scan_row.event_id,
      scan_row.session_label,
      scan_row.status
    );

    if coalesce(calculated_amount, 0) > 0 then
      insert into public.fines (
        student_id,
        event_id,
        attendance_scan_id,
        session_label,
        amount,
        reason,
        status
      ) values (
        scan_row.student_id,
        scan_row.event_id,
        scan_row.id,
        scan_row.session_label,
        calculated_amount,
        case when scan_row.status = 'late' then 'Late attendance' else 'Absent attendance' end,
        'unpaid'
      ) on conflict (attendance_scan_id) do nothing;
    end if;
  end loop;
end;
$$;

commit;
