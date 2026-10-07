begin;

-- The public listing renders the event cover image and metadata only. Gallery
-- media remains available through the events table and detail/media flows.
drop function if exists public.get_public_events();

create function public.get_public_events()
returns table (
  id uuid,
  title text,
  description text,
  location text,
  event_date date,
  start_time time,
  end_time time,
  image_url text,
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

commit;
