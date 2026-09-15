alter table public.attendance_scans
  add column if not exists method text not null default 'qr_scan';

alter table public.attendance_scans
  add constraint attendance_scans_method_check
  check (method in ('qr_scan', 'manual'));