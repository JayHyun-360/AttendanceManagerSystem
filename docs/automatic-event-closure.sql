-- Automatically close active events after their final configured session ends.
-- Run after 022_automatic_fine_persistence.sql and 023_active_event_attendance_guard.sql.
-- The scheduled job is installed only when pg_cron is enabled in Supabase.

begin;

create or replace function public.close_expired_active_events()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  event_row record;
  final_session_end time;
  closed_count integer := 0;
begin
  for event_row in
    select *
    from public.events
    where status = 'active'
    order by event_date, id
  loop
    -- Single-session events use the normalized morning end, then end_time.
    -- Multi-session events require an afternoon end because it is the final
    -- session. Incomplete multi-session configuration is left open for admin
    -- correction rather than being closed prematurely.
    final_session_end := case
      when coalesce(event_row.multi_session, false)
        then event_row.afternoon_end
      else coalesce(event_row.morning_end, event_row.end_time)
    end;

    if final_session_end is null
       or not public.event_session_has_ended(
         event_row.event_date,
         final_session_end
       ) then
      continue;
    end if;

    -- Reconcile completed sessions while the event is still active. This is
    -- intentionally before the status update so the active-event attendance
    -- guard permits these system-generated absent rows.
    perform public.materialize_event_inferred_absences(event_row.id);

    update public.events
    set status = 'closed'
    where id = event_row.id
      and status = 'active';

    if found then
      closed_count := closed_count + 1;
    end if;
  end loop;

  return closed_count;
end;
$$;

revoke all on function public.close_expired_active_events() from public;

-- Install or replace the one-minute job when pg_cron is enabled. If the
-- extension is not enabled, the function above is still installed and this
-- block is skipped; enable pg_cron and rerun this script to schedule it.
do $$
declare
  existing_job record;
begin
  if to_regnamespace('cron') is not null then
    for existing_job in
      select jobid
      from cron.job
      where jobname = 'attendance-close-expired-active-events'
    loop
      perform cron.unschedule(existing_job.jobid);
    end loop;

    perform cron.schedule(
      'attendance-close-expired-active-events',
      '* * * * *',
      'select public.close_expired_active_events();'
    );
  end if;
end;
$$;

commit;
