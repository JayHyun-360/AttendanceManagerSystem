-- Persist the event lifecycle state used by the admin event manager and QR scanner.

begin;

alter table public.events
  add column if not exists status text not null default 'upcoming';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_status_check'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_status_check
      check (status in ('active', 'upcoming', 'closed'));
  end if;
end;
$$;

commit;
