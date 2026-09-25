-- Read-only verification for sanction status behavior.
-- This does not modify data, policies, triggers, or settings.

-- 1) Confirm the automatic absence/session functions exist.
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'event_session_has_ended',
    'materialize_student_inferred_absences',
    'materialize_event_inferred_absences'
  )
order by p.proname;

-- 2) Show Late/Absent attendance rows for sanction-enabled events.
-- These rows must be treated as Sanctioned by the profile UI.
select
  e.id as event_id,
  e.title as event_title,
  e.event_date,
  e.sanctions_enabled,
  a.student_id,
  a.session_label,
  a.status as attendance_status,
  a.scan_in_at,
  a.scanned_by,
  case
    when e.sanctions_enabled = true
      and a.status in ('late', 'absent')
      then 'Sanctioned'
    when a.status in ('present', 'confirmed')
      then 'No Sanction'
    else 'Review status'
  end as expected_policy_status
from public.attendance_scans a
join public.events e on e.id = a.event_id
where e.sanctions_enabled = true
  and a.status in ('late', 'absent', 'present', 'confirmed')
order by e.event_date desc, e.title, a.student_id, a.session_label;

-- 3) Show sanction-enabled events and their configured session end times.
-- This helps verify when a missing attendance row should become an inferred absence.
select
  id as event_id,
  title,
  event_date,
  multi_session,
  sanctions_enabled,
  morning_end,
  afternoon_end,
  end_time,
  status
from public.events
where sanctions_enabled = true
order by event_date desc, title;
