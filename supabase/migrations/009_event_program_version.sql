-- Align the events table with the event manager payload.
-- These fields are used by event creation, filtering, and optimistic updates.

begin;

alter table public.events
  add column if not exists program text not null default 'All Programs',
  add column if not exists version integer not null default 1;

commit;
