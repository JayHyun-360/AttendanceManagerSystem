-- Prevent new attendance records from being created for upcoming or closed events.
-- Existing historical attendance rows remain editable by the existing admin workflow.
-- Run this migration once in Supabase SQL Editor if migrations are not deployed automatically.

begin;

create or replace function public.guard_attendance_scan_event_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  event_status text;
begin
  select e.status
    into event_status
  from public.events e
  where e.id = new.event_id;

  if event_status is null then
    raise exception 'Cannot record attendance: event does not exist.'
      using errcode = 'foreign_key_violation';
  end if;

  -- Upcoming events must never receive attendance rows. Closed events may
  -- receive only the system-shaped inferred-absence rows created by the
  -- reconciliation functions after a session has ended.
  if event_status = 'upcoming' then
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

drop trigger if exists attendance_scans_require_active_event
  on public.attendance_scans;

create trigger attendance_scans_require_active_event
before insert or update of event_id
on public.attendance_scans
for each row
execute function public.guard_attendance_scan_event_status();

commit;
