-- Target high-frequency list, history, and reporting query patterns.
-- Existing primary/unique indexes and the student-first excuse-request index
-- remain unchanged; these indexes complement the filter/order combinations.

begin;

create index if not exists attendance_scans_student_scan_in_idx
  on public.attendance_scans (student_id, scan_in_at desc);

create index if not exists attendance_scans_event_scan_in_idx
  on public.attendance_scans (event_id, scan_in_at desc, student_id);

create index if not exists attendance_scans_status_scan_in_idx
  on public.attendance_scans (status, scan_in_at desc)
  where scan_in_at is not null;

create index if not exists fines_student_created_idx
  on public.fines (student_id, created_at desc, id asc);

create index if not exists fines_event_student_idx
  on public.fines (event_id, student_id)
  where event_id is not null;

create index if not exists excuse_requests_created_id_idx
  on public.excuse_requests (created_at desc, id asc);

create index if not exists excuse_requests_status_event_student_idx
  on public.excuse_requests (status, event_id, student_id)
  where event_id is not null;

create index if not exists profiles_role_surname_id_idx
  on public.profiles (role, surname, id);

create index if not exists events_report_date_id_idx
  on public.events (event_date desc, id asc)
  where status <> 'upcoming';

create index if not exists events_archived_at_id_idx
  on public.events (archived_at desc, id asc)
  where archived_at is not null;

create index if not exists announcements_target_created_id_idx
  on public.announcements (target_role, created_at desc, id asc);

commit;
