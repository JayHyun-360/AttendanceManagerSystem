-- Automatic inferred-absence and fine persistence.
-- Run after 015_attendance_fine_lifecycle.sql and 021_fines_sanctions_policy.sql.
-- This migration supports both signup-time historical materialization and
-- event-finish materialization for students already enrolled.

begin;

-- Attendance is evaluated in the school's local timezone. A session with no
-- configured end time is considered finished only on the following local day;
-- this prevents a same-day event from being marked absent prematurely.
create or replace function public.event_session_has_ended(
  p_event_date date,
  p_session_end time
)
returns boolean
language sql
stable
set search_path = public
as $$
  select
    p_event_date < timezone('Asia/Manila', now())::date
    or (
      p_session_end is not null
      and ((p_event_date + p_session_end) at time zone 'Asia/Manila') <= now()
    );
$$;

revoke all on function public.event_session_has_ended(date, time) from public;

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

  -- The auth trigger creates an incomplete profile first. Wait until the
  -- onboarding flow has supplied the student's program.
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
    and coalesce(e.status, '') <> 'upcoming'
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

revoke all on function public.materialize_student_inferred_absences(uuid) from public;

create or replace function public.materialize_student_absences_after_profile_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'student'
     and nullif(trim(coalesce(new.program, '')), '') is not null
  then
    if tg_op = 'INSERT' then
      perform public.materialize_student_inferred_absences(new.id);
    elsif old.role is distinct from new.role
       or old.program is distinct from new.program then
      perform public.materialize_student_inferred_absences(new.id);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_materialize_student_absences
  on public.profiles;

create trigger profiles_materialize_student_absences
after insert or update of role, program
on public.profiles
for each row
execute function public.materialize_student_absences_after_profile_change();

-- Materialize all eligible students when an event is finished. The current
-- schema uses 'closed'; the date predicate also covers an event whose status
-- remains active after its event date or is edited after it has passed.
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
     or coalesce(v_event.status, '') = 'upcoming' then
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

revoke all on function public.materialize_event_inferred_absences(uuid) from public;

create or replace function public.materialize_event_absences_after_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.materialize_event_inferred_absences(new.id);
  elsif old.status is distinct from new.status
     or old.event_date is distinct from new.event_date
     or old.program is distinct from new.program
     or old.multi_session is distinct from new.multi_session
     or old.morning_end is distinct from new.morning_end
     or old.afternoon_end is distinct from new.afternoon_end
     or old.end_time is distinct from new.end_time then
    perform public.materialize_event_inferred_absences(new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists events_materialize_inferred_absences
  on public.events;

create trigger events_materialize_inferred_absences
after insert or update of status, event_date, program, multi_session,
  morning_end, afternoon_end, end_time
on public.events
for each row
execute function public.materialize_event_absences_after_change();

-- Remove only automatically inferred absent rows that were created before the
-- session ended. Manual attendance rows and any row with paid/excused history
-- are preserved. This repairs the old event-date-only behavior safely.
do $$
declare
  early_scan record;
begin
  for early_scan in
    select s.id
    from public.attendance_scans s
    join public.events e on e.id = s.event_id
    cross join lateral (
      select case
        when s.session_label = 'afternoon' then e.afternoon_end
        when coalesce(e.multi_session, false) then e.morning_end
        else coalesce(e.morning_end, e.end_time)
      end as session_end
    ) session_meta
    where s.status = 'absent'
      and s.scan_in_at is null
      and s.scanned_by is null
      and s.method is null
      and not public.event_session_has_ended(e.event_date, session_meta.session_end)
      and not exists (
        select 1
        from public.fines f
        where f.attendance_scan_id = s.id
          and f.status in ('paid', 'excused')
      )
  loop
    delete from public.fines
    where attendance_scan_id = early_scan.id
      and status = 'unpaid';

    delete from public.attendance_scans
    where id = early_scan.id;
  end loop;
end;
$$;

-- Repair current students and already-finished event sessions once. All
-- inserts are conflict-safe, so rerunning this migration is safe.
do $$
declare
  student_row record;
  event_row record;
begin
  for student_row in
    select id
    from public.profiles
    where role = 'student'
      and nullif(trim(coalesce(program, '')), '') is not null
  loop
    perform public.materialize_student_inferred_absences(student_row.id);
  end loop;

  for event_row in
    select id
    from public.events
    where coalesce(status, '') <> 'upcoming'
  loop
    perform public.materialize_event_inferred_absences(event_row.id);
  end loop;
end;
$$;

commit;
