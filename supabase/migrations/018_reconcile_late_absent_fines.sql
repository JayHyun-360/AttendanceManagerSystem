-- Adesse late/absent fine reconciliation
-- Run after 015_attendance_fine_lifecycle.sql and 017_normalize_legacy_fines.sql.
-- This recalculates unpaid scan-linked fines from the current session-specific event prices
-- and creates missing fines for existing absent/late scans.

begin;

-- Recalculate unpaid fines so price changes apply consistently to all views.
update public.fines f
set amount = public.event_session_fine_amount(
  s.event_id,
  s.session_label,
  s.status
)
from public.attendance_scans s
where f.attendance_scan_id = s.id
  and f.status = 'unpaid'
  and s.status in ('absent', 'late')
  and coalesce(public.event_session_fine_amount(s.event_id, s.session_label, s.status), 0) > 0;

-- Remove an unpaid scan-linked fine if the current event price is zero.
delete from public.fines f
using public.attendance_scans s
where f.attendance_scan_id = s.id
  and f.status = 'unpaid'
  and s.status in ('absent', 'late')
  and coalesce(public.event_session_fine_amount(s.event_id, s.session_label, s.status), 0) = 0;

-- Backfill missing fines for both absent and late scans.
insert into public.fines (
  student_id,
  event_id,
  attendance_scan_id,
  session_label,
  amount,
  reason,
  status
)
select
  s.student_id,
  s.event_id,
  s.id,
  s.session_label,
  public.event_session_fine_amount(s.event_id, s.session_label, s.status),
  case when s.status = 'late' then 'Late attendance' else 'Absent attendance' end,
  'unpaid'
from public.attendance_scans s
where s.status in ('absent', 'late')
  and coalesce(public.event_session_fine_amount(s.event_id, s.session_label, s.status), 0) > 0
  and not exists (
    select 1
    from public.fines f
    where f.attendance_scan_id = s.id
  );

-- Keep only one unpaid fine per scan if legacy data contains duplicates.
with ranked as (
  select
    f.id,
    row_number() over (
      partition by f.attendance_scan_id
      order by f.created_at asc nulls last, f.id asc
    ) as row_number
  from public.fines f
  where f.status = 'unpaid'
    and f.attendance_scan_id is not null
)
delete from public.fines f
using ranked r
where f.id = r.id
  and r.row_number > 1;

commit;
