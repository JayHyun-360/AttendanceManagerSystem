begin;

alter table public.events
  drop constraint if exists events_status_check;

alter table public.events
  add constraint events_status_check
  check (status in ('active', 'upcoming', 'closed', 'cancelled'));

create or replace function public.materialize_student_inferred_absences(
  p_student_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted integer := 0;
  v_profile public.profiles%rowtype;
begin
  select *
  into v_profile
  from public.profiles
  where id = p_student_id;

  if not found or v_profile.role <> 'student' then
    return 0;
  end if;

  if nullif(trim(coalesce(v_profile.program, '')), '') is null then
    return 0;
  end if;

  insert into public.attendance_scans (
    event_id,
    student_id,
    session_label,
    status,
    scan_in_at,
    scanned_by
  )
  select
    e.id,
    v_profile.id,
    sessions.session_label,
    'absent'::public.attendance_status,
    null,
    null
  from public.events e
  cross join lateral (
    values
      (
        'morning'::text,
        case
          when coalesce(e.multi_session, false)
            then e.morning_end
          else coalesce(e.morning_end, e.end_time)
        end
      ),
      ('afternoon'::text, e.afternoon_end)
  ) as sessions(session_label, session_end)
  where public.event_session_has_ended(e.event_date, sessions.session_end)
    and coalesce(e.status, '') not in ('upcoming', 'cancelled')
    and (
      (coalesce(e.multi_session, false) = false and sessions.session_label = 'morning')
      or coalesce(e.multi_session, false) = true
    )
    and (
      e.program is null
      or e.program = 'All Programs'
      or e.program = v_profile.program
    )
    and not exists (
      select 1
      from public.attendance_scans existing_scan
      where existing_scan.event_id = e.id
        and existing_scan.student_id = v_profile.id
        and existing_scan.session_label = sessions.session_label
    )
  on conflict (event_id, student_id, session_label) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

create or replace function public.materialize_event_inferred_absences(
  p_event_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted integer := 0;
  v_event public.events%rowtype;
begin
  select *
  into v_event
  from public.events
  where id = p_event_id;

  if not found
     or coalesce(v_event.status, '') in ('upcoming', 'cancelled') then
    return 0;
  end if;

  insert into public.attendance_scans (
    event_id,
    student_id,
    session_label,
    status,
    scan_in_at,
    scanned_by
  )
  select
    v_event.id,
    p.id,
    sessions.session_label,
    'absent'::public.attendance_status,
    null,
    null
  from public.profiles p
  cross join lateral (
    values
      (
        'morning'::text,
        case
          when coalesce(v_event.multi_session, false)
            then v_event.morning_end
          else coalesce(v_event.morning_end, v_event.end_time)
        end
      ),
      ('afternoon'::text, v_event.afternoon_end)
  ) as sessions(session_label, session_end)
  where p.role = 'student'
    and nullif(trim(coalesce(p.program, '')), '') is not null
    and public.event_session_has_ended(v_event.event_date, sessions.session_end)
    and (
      v_event.program is null
      or v_event.program = 'All Programs'
      or v_event.program = p.program
    )
    and (
      (coalesce(v_event.multi_session, false) = false and sessions.session_label = 'morning')
      or coalesce(v_event.multi_session, false) = true
    )
    and not exists (
      select 1
      from public.attendance_scans existing_scan
      where existing_scan.event_id = v_event.id
        and existing_scan.student_id = p.id
        and existing_scan.session_label = sessions.session_label
    )
  on conflict (event_id, student_id, session_label) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

create or replace function public.guard_attendance_scan_event_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  event_status text;
begin
  select event.status
    into event_status
  from public.events event
  where event.id = new.event_id;

  if event_status is null then
    raise exception 'Cannot record attendance: event does not exist.'
      using errcode = 'foreign_key_violation';
  end if;

  if event_status in ('upcoming', 'cancelled') then
    raise exception 'Attendance can only be recorded for active events. Current event status: %.', event_status
      using errcode = 'check_violation';
  end if;

  if event_status = 'closed'
     and not (
       new.status = 'absent'::public.attendance_status
       and new.scan_in_at is null
       and new.scanned_by is null
       and new.method is null
     ) then
    raise exception 'New attendance scans cannot be recorded for closed events.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_attendance_scan_event_status() from public;

create or replace function public.guard_event_cancellation_without_attendance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'cancelled'
     and new.status not in ('cancelled', 'upcoming') then
    raise exception 'Cancelled events must be restored to upcoming before being activated or closed.'
      using errcode = 'check_violation';
  end if;

  if new.status = 'cancelled'
     and old.status is distinct from new.status
     and exists (
       select 1
       from public.attendance_scans scan
       where scan.event_id = new.id
     ) then
    raise exception 'Events with attendance records cannot be cancelled. Mark the event closed instead.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_event_cancellation_without_attendance()
  from public;

drop trigger if exists events_cancel_only_without_attendance
  on public.events;
create trigger events_cancel_only_without_attendance
before update of status
on public.events
for each row
execute function public.guard_event_cancellation_without_attendance();

commit;