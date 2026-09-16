-- Adesse legacy fine normalization
-- Run this block in Supabase SQL Editor after 015_attendance_fine_lifecycle.sql.
-- It only assigns a session when the relationship is unambiguous.

begin;

-- Fine rows linked to an attendance scan inherit the scan's canonical session.
update public.fines f
set
  event_id = s.event_id,
  session_label = s.session_label
from public.attendance_scans s
where f.attendance_scan_id = s.id
  and (f.event_id is distinct from s.event_id
    or f.session_label is distinct from s.session_label);

-- A non-multi-session event has exactly one possible session: morning.
update public.fines f
set session_label = 'morning'
from public.events e
where f.event_id = e.id
  and coalesce(e.multi_session, false) = false
  and f.session_label is null;

-- Remove duplicate unpaid rows for the same student/event/session, keeping the oldest.
-- Paid and excused history is preserved.
with ranked as (
  select
    f.id,
    row_number() over (
      partition by f.student_id, f.event_id, f.session_label
      order by f.created_at asc nulls last, f.id asc
    ) as row_number
  from public.fines f
  where f.status = 'unpaid'
    and f.event_id is not null
    and f.session_label is not null
)
delete from public.fines f
using ranked r
where f.id = r.id
  and r.row_number > 1;

-- Multi-session legacy rows without a scan/session are intentionally not guessed.
-- Review them with:
-- select id, student_id, event_id, amount, status, created_at
-- from public.fines
-- where status = 'unpaid' and event_id is not null and session_label is null;

commit;
