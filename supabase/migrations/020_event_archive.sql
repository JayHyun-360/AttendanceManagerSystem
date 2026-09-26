-- Preserve events and their attendance history while hiding them from active event lists.

begin;

alter table public.events
  add column if not exists archived_at timestamptz;

create index if not exists events_active_event_date_idx
  on public.events (event_date desc)
  where archived_at is null;

commit;
