-- Prevent duplicate attendance records for the same student and session within an event.

begin;

alter table public.attendance_scans
  add constraint attendance_scans_event_student_session_unique
  unique (event_id, student_id, session_label);

commit;
