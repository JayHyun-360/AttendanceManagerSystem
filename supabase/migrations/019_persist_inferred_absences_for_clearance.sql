-- Adesse clearance foundation
-- Run after 015_attendance_fine_lifecycle.sql and 018_reconcile_late_absent_fines.sql.
-- Persist missing attendance sessions as explicit absent rows so every displayed
-- fine has a stable attendance_scan_id and can be cleared without reappearing.

begin;

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
  p.id,
  sessions.session_label,
  'absent'::public.attendance_status,
  null,
  null
from public.events e
join public.profiles p
  on p.role = 'student'
cross join lateral (
  values ('morning'::text),
         ('afternoon'::text)
) as sessions(session_label)
where e.event_date <= current_date
  and e.status <> 'upcoming'
  and (
    not e.multi_session
    and sessions.session_label = 'morning'
    or e.multi_session
  )
  and (
    e.program is null
    or e.program = 'All Programs'
    or e.program = p.program
  )
  and not exists (
    select 1
    from public.attendance_scans s
    where s.event_id = e.id
      and s.student_id = p.id
      and s.session_label = sessions.session_label
  )
 on conflict (event_id, student_id, session_label) do nothing;

commit;
