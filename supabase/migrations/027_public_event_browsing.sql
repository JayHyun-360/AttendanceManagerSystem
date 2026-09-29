begin;

-- Anonymous visitors may browse event details, but must not read the full
-- events row, which also contains attendance policy and fee configuration.
create or replace function public.get_public_events()
returns table (
  id uuid,
  title text,
  description text,
  location text,
  event_date date,
  start_time time,
  end_time time,
  image_url text,
  media_urls text[],
  program text,
  status text,
  multi_session boolean,
  morning_start time,
  morning_end time,
  afternoon_start time,
  afternoon_end time
)
language sql
stable
security definer
set search_path = public
as $function$
  select
    event_row.id,
    event_row.title,
    event_row.description,
    event_row.location,
    event_row.event_date,
    event_row.start_time,
    event_row.end_time,
    event_row.image_url,
    event_row.media_urls,
    event_row.program,
    event_row.status,
    event_row.multi_session,
    event_row.morning_start,
    event_row.morning_end,
    event_row.afternoon_start,
    event_row.afternoon_end
  from public.events as event_row
  where event_row.archived_at is null
  order by event_row.event_date desc;
$function$;

revoke all on function public.get_public_events() from public;
grant execute on function public.get_public_events() to anon, authenticated;

-- Keep full event-row reads behind authentication; anonymous callers use the
-- deliberately limited function above.
drop policy if exists events_select_public on public.events;
drop policy if exists events_select_authenticated on public.events;
create policy events_select_authenticated
  on public.events
  for select
  to authenticated
  using (true);

revoke select on table public.events from anon, public;
grant select on table public.events to authenticated;

commit;