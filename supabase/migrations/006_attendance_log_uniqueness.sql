-- Prevent the same student from being recorded more than once for an event.
-- The scanner also checks before inserting, while this constraint closes the
-- concurrent-admin race between that check and the insert.

begin;

with ranked_duplicates as (
  select
    id,
    row_number() over (
      partition by event_id, student_id
      order by scanned_at asc nulls last, id asc
    ) as row_number
  from public.attendance_logs
)
delete from public.attendance_logs
where id in (
  select id
  from ranked_duplicates
  where row_number > 1
);

create unique index if not exists attendance_logs_event_student_unique
  on public.attendance_logs (event_id, student_id);

commit;
