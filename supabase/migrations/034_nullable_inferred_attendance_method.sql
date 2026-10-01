begin;

alter table public.attendance_scans
  alter column method drop default,
  alter column method drop not null;

update public.attendance_scans
set method = null
where status = 'absent'
  and scan_in_at is null
  and scan_out_at is null
  and scanned_by is null
  and method = 'qr_scan';

commit;