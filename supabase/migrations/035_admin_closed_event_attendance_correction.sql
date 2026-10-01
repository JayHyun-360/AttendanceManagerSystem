begin;

create table if not exists public.attendance_scan_corrections (
  id uuid primary key default gen_random_uuid(),
  attendance_scan_id uuid,
  event_id uuid not null,
  student_id uuid not null,
  session_label text not null check (session_label in ('morning', 'afternoon')),
  previous_status public.attendance_status not null,
  corrected_status public.attendance_status not null,
  previous_scan_in_at timestamptz,
  previous_scan_out_at timestamptz,
  previous_method text,
  previous_scanned_by uuid,
  previous_fine_policy_enabled boolean not null,
  reason text not null check (char_length(btrim(reason)) between 1 and 1000),
  changed_by uuid not null,
  changed_at timestamptz not null default now()
);

alter table public.attendance_scan_corrections enable row level security;
revoke all on table public.attendance_scan_corrections from anon, authenticated;
grant select on table public.attendance_scan_corrections to authenticated;

drop policy if exists attendance_scan_corrections_select_admin
  on public.attendance_scan_corrections;
create policy attendance_scan_corrections_select_admin
  on public.attendance_scan_corrections
  for select to authenticated
  using (public.is_admin());

create or replace function public.correct_closed_event_inferred_absence(
  p_event_id uuid,
  p_student_id uuid,
  p_session_label text,
  p_corrected_status public.attendance_status,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin_id uuid := auth.uid();
  v_event_status text;
  v_scan public.attendance_scans%rowtype;
  v_changed_at timestamptz := now();
begin
  if v_admin_id is null or not public.is_admin() then
    raise exception 'Only authenticated admins can correct attendance.'
      using errcode = '42501';
  end if;

  if p_event_id is null
     or p_student_id is null
     or p_session_label not in ('morning', 'afternoon') then
    raise exception 'A valid event, student, and session are required.'
      using errcode = '22023';
  end if;

  if p_corrected_status is null
     or p_corrected_status not in ('present', 'late') then
    raise exception 'A closed-event correction must mark the student present or late.'
      using errcode = '22023';
  end if;

  if nullif(btrim(p_reason), '') is null or char_length(p_reason) > 1000 then
    raise exception 'A correction reason of 1 to 1000 characters is required.'
      using errcode = '22023';
  end if;

  select event.status::text
    into v_event_status
  from public.events event
  where event.id = p_event_id
  for update;

  if not found or v_event_status <> 'closed' then
    raise exception 'Attendance corrections are only allowed for closed events.'
      using errcode = '23514';
  end if;

  select scan.*
    into v_scan
  from public.attendance_scans scan
  where scan.event_id = p_event_id
    and scan.student_id = p_student_id
    and scan.session_label = p_session_label
  for update;

  if not found
     or v_scan.status <> 'absent'
     or v_scan.scan_in_at is not null
     or v_scan.scan_out_at is not null
     or v_scan.scanned_by is not null
     or v_scan.method is not null then
    raise exception 'Only an existing system-inferred absence can be corrected.'
      using errcode = '23514';
  end if;

  insert into public.attendance_scan_corrections (
    attendance_scan_id,
    event_id,
    student_id,
    session_label,
    previous_status,
    corrected_status,
    previous_scan_in_at,
    previous_scan_out_at,
    previous_method,
    previous_scanned_by,
    previous_fine_policy_enabled,
    reason,
    changed_by,
    changed_at
  ) values (
    v_scan.id,
    v_scan.event_id,
    v_scan.student_id,
    v_scan.session_label,
    v_scan.status,
    p_corrected_status,
    v_scan.scan_in_at,
    v_scan.scan_out_at,
    v_scan.method,
    v_scan.scanned_by,
    v_scan.fine_policy_enabled,
    btrim(p_reason),
    v_admin_id,
    v_changed_at
  );

  update public.attendance_scans
  set status = p_corrected_status,
      scan_in_at = v_changed_at,
      scan_out_at = null,
      method = 'manual',
      scanned_by = v_admin_id,
      updated_at = v_changed_at
  where id = v_scan.id;

  return v_scan.id;
end;
$$;

revoke all on function public.correct_closed_event_inferred_absence(
  uuid, uuid, text, public.attendance_status, text
) from public, anon;
grant execute on function public.correct_closed_event_inferred_absence(
  uuid, uuid, text, public.attendance_status, text
) to authenticated;

commit;