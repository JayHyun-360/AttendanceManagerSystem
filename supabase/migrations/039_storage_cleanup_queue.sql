begin;

create table if not exists public.storage_cleanup_queue (
  id bigint primary key,
  bucket_id text not null,
  object_path text not null,
  status text not null default 'pending',
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  available_at timestamptz not null default now(),
  last_error text,
  processed_at timestamptz
);

create sequence if not exists public.storage_cleanup_queue_id_seq;

do $function$
begin
  if not exists (
    select 1
    from pg_attribute
    where attrelid = 'public.storage_cleanup_queue'::regclass
      and attname = 'id'
      and attidentity <> ''
  ) then
    alter sequence public.storage_cleanup_queue_id_seq
      owned by public.storage_cleanup_queue.id;

    alter table public.storage_cleanup_queue
      alter column id set default nextval('public.storage_cleanup_queue_id_seq'::regclass);
  end if;
end;
$function$;

select setval(
  'public.storage_cleanup_queue_id_seq'::regclass,
  coalesce((select max(id) from public.storage_cleanup_queue), 1),
  (select max(id) is not null from public.storage_cleanup_queue)
);

-- Reconcile check constraints without changing existing values. The live queue
-- already uses the worker-supported statuses and non-negative attempt counts.
do $function$
declare
  constraint_record record;
begin
  for constraint_record in
    select con.conname
    from pg_constraint as con
    where con.conrelid = 'public.storage_cleanup_queue'::regclass
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%status%'
  loop
    execute format(
      'alter table public.storage_cleanup_queue drop constraint %I',
      constraint_record.conname
    );
  end loop;

  if not exists (
    select 1
    from pg_constraint as con
    where con.conrelid = 'public.storage_cleanup_queue'::regclass
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%status%'
  ) then
    alter table public.storage_cleanup_queue
      add constraint storage_cleanup_queue_status_check
      check (status in ('pending', 'processing', 'completed', 'failed', 'quarantined'));
  end if;

  if not exists (
    select 1
    from pg_constraint as con
    where con.conrelid = 'public.storage_cleanup_queue'::regclass
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%attempts%'
      and pg_get_constraintdef(con.oid) ilike '%>= 0%'
  ) then
    alter table public.storage_cleanup_queue
      add constraint storage_cleanup_queue_attempts_nonnegative
      check (attempts >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint as con
    where con.conrelid = 'public.storage_cleanup_queue'::regclass
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%object_path%'
  ) then
    alter table public.storage_cleanup_queue
      add constraint storage_cleanup_queue_object_path_nonempty
      check (length(btrim(object_path)) > 0);
  end if;
end;
$function$;

-- Do not discard data to make the active-only index fit. Abort instead if the
-- live queue contains duplicate rows that would conflict after reconciliation.
do $function$
begin
  if exists (
    select 1
    from public.storage_cleanup_queue
    where status in ('pending', 'processing', 'failed')
    group by bucket_id, object_path
    having count(*) > 1
  ) then
    raise exception
      'Cannot replace storage cleanup uniqueness: duplicate active queue rows exist';
  end if;
end;
$function$;

-- The live database may represent the old full uniqueness as either a unique
-- constraint or a standalone unique index. Remove only that exact index shape.
do $function$
declare
  index_record record;
begin
  for index_record in
    select
      index_class.relname as index_name,
      constraint_class.conname as constraint_name
    from pg_index as index_metadata
    join pg_class as index_class
      on index_class.oid = index_metadata.indexrelid
    left join pg_constraint as constraint_class
      on constraint_class.conindid = index_metadata.indexrelid
    where index_metadata.indrelid = 'public.storage_cleanup_queue'::regclass
      and index_metadata.indisunique
      and index_metadata.indpred is null
      and (
        select array_agg(attribute.attname::text order by key.ordinality)
        from unnest(index_metadata.indkey) with ordinality as key(attnum, ordinality)
        join pg_attribute as attribute
          on attribute.attrelid = index_metadata.indrelid
         and attribute.attnum = key.attnum
      ) = array['bucket_id', 'object_path']::text[]
  loop
    if index_record.constraint_name is not null then
      execute format(
        'alter table public.storage_cleanup_queue drop constraint %I',
        index_record.constraint_name
      );
    else
      execute format(
        'drop index if exists public.%I',
        index_record.index_name
      );
    end if;
  end loop;
end;
$function$;

create unique index if not exists storage_cleanup_queue_active_object_idx
  on public.storage_cleanup_queue (bucket_id, object_path)
  where status in ('pending', 'processing', 'failed');

create index if not exists storage_cleanup_queue_ready_idx
  on public.storage_cleanup_queue (bucket_id, status, available_at, created_at);

revoke all on table public.storage_cleanup_queue from anon, authenticated;
grant select, insert, update on table public.storage_cleanup_queue to service_role;
grant usage, select on sequence public.storage_cleanup_queue_id_seq to service_role;

create or replace function public.enqueue_storage_cleanup_value(
  p_value text,
  p_bucket_id text default 'public-images'
)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  object_path text;
  public_prefix text := '/storage/v1/object/public/' || p_bucket_id || '/';
  prefix_position integer;
begin
  if p_value is null or btrim(p_value) = '' or p_bucket_id is null
     or btrim(p_bucket_id) = '' or p_value like 'blob:%' then
    return;
  end if;

  if p_value ~ '^[a-z][a-z0-9+.-]*://' then
    prefix_position := strpos(p_value, public_prefix);
    if prefix_position = 0 then
      return;
    end if;
    object_path := substring(p_value from prefix_position + length(public_prefix));
  else
    object_path := regexp_replace(p_value, '^/+', '');
  end if;

  object_path := split_part(split_part(object_path, '?', 1), '#', 1);
  if object_path = '' then
    return;
  end if;

  insert into public.storage_cleanup_queue (
    bucket_id,
    object_path,
    status,
    attempts,
    available_at
  ) values (
    p_bucket_id,
    object_path,
    'pending',
    0,
    now()
  )
  on conflict (bucket_id, object_path)
    where status in ('pending', 'processing', 'failed')
  do nothing;
end;
$function$;

revoke all on function public.enqueue_storage_cleanup_value(text, text) from public;
grant execute on function public.enqueue_storage_cleanup_value(text, text) to service_role;

create or replace function public.enqueue_removed_profile_media()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if tg_op = 'DELETE' then
    perform public.enqueue_storage_cleanup_value(old.photo_url);
    perform public.enqueue_storage_cleanup_value(old.cover_photo_url);
    perform public.enqueue_storage_cleanup_value(old.id_photo_url);
  else
    if old.photo_url is distinct from new.photo_url then
      perform public.enqueue_storage_cleanup_value(old.photo_url);
    end if;
    if old.cover_photo_url is distinct from new.cover_photo_url then
      perform public.enqueue_storage_cleanup_value(old.cover_photo_url);
    end if;
    if old.id_photo_url is distinct from new.id_photo_url then
      perform public.enqueue_storage_cleanup_value(old.id_photo_url);
    end if;
  end if;
  return coalesce(new, old);
end;
$function$;

create or replace function public.enqueue_removed_event_media()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  old_url text;
  new_media text[];
begin
  if tg_op = 'DELETE' then
    perform public.enqueue_storage_cleanup_value(old.image_url);
    foreach old_url in array coalesce(old.media_urls, '{}'::text[]) loop
      perform public.enqueue_storage_cleanup_value(old_url);
    end loop;
  else
    new_media := coalesce(new.media_urls, '{}'::text[]);
    if old.image_url is distinct from new.image_url then
      perform public.enqueue_storage_cleanup_value(old.image_url);
    end if;
    foreach old_url in array coalesce(old.media_urls, '{}'::text[]) loop
      if not (old_url = any(new_media)) then
        perform public.enqueue_storage_cleanup_value(old_url);
      end if;
    end loop;
  end if;
  return coalesce(new, old);
end;
$function$;

create or replace function public.enqueue_removed_announcement_media()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if tg_op = 'DELETE' then
    perform public.enqueue_storage_cleanup_value(old.media_url);
  elsif old.media_url is distinct from new.media_url then
    perform public.enqueue_storage_cleanup_value(old.media_url);
  end if;
  return coalesce(new, old);
end;
$function$;

create or replace function public.enqueue_removed_excuse_media()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if tg_op = 'DELETE' then
    perform public.enqueue_storage_cleanup_value(old.document_url);
  elsif old.document_url is distinct from new.document_url then
    perform public.enqueue_storage_cleanup_value(old.document_url);
  end if;
  return coalesce(new, old);
end;
$function$;

create or replace function public.enqueue_removed_settings_media(
  p_old_settings jsonb,
  p_new_settings jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  old_value text;
  old_slide jsonb;
  new_settings jsonb := coalesce(p_new_settings, '{}'::jsonb);
begin
  for old_value in
    select value
    from jsonb_array_elements_text(
      coalesce(p_old_settings -> 'heroImageUrls', '[]'::jsonb)
    ) as item(value)
  loop
    if not exists (
      select 1
      from jsonb_array_elements_text(
        coalesce(new_settings -> 'heroImageUrls', '[]'::jsonb)
      ) as item(value)
      where item.value = old_value
    ) then
      perform public.enqueue_storage_cleanup_value(old_value);
    end if;
  end loop;

  for old_slide in
    select value
    from jsonb_array_elements(
      coalesce(p_old_settings -> 'carouselSlides', '[]'::jsonb)
    ) as item(value)
  loop
    for old_value in
      select value
      from jsonb_array_elements_text(
        jsonb_build_array(old_slide ->> 'imageUrl', old_slide ->> 'posterUrl')
      ) as item(value)
      where value is not null and value <> ''
    loop
      if not exists (
        select 1
        from jsonb_array_elements(
          coalesce(new_settings -> 'carouselSlides', '[]'::jsonb)
        ) as item(value)
        where item.value ->> 'imageUrl' = old_value
           or item.value ->> 'posterUrl' = old_value
      ) then
        perform public.enqueue_storage_cleanup_value(old_value);
      end if;
    end loop;
  end loop;
end;
$function$;

create or replace function public.enqueue_removed_system_settings_media()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if tg_op = 'DELETE' then
    perform public.enqueue_removed_settings_media(old.settings, '{}'::jsonb);
  else
    perform public.enqueue_removed_settings_media(old.settings, new.settings);
  end if;
  return coalesce(new, old);
end;
$function$;

drop trigger if exists profiles_enqueue_removed_media on public.profiles;
create trigger profiles_enqueue_removed_media
after update or delete on public.profiles
for each row execute function public.enqueue_removed_profile_media();

drop trigger if exists events_enqueue_removed_media on public.events;
create trigger events_enqueue_removed_media
after update or delete on public.events
for each row execute function public.enqueue_removed_event_media();

drop trigger if exists announcements_enqueue_removed_media on public.announcements;
create trigger announcements_enqueue_removed_media
after update or delete on public.announcements
for each row execute function public.enqueue_removed_announcement_media();

drop trigger if exists excuse_requests_enqueue_removed_media on public.excuse_requests;
create trigger excuse_requests_enqueue_removed_media
after update or delete on public.excuse_requests
for each row execute function public.enqueue_removed_excuse_media();

drop trigger if exists system_settings_enqueue_removed_media on public.system_settings;
create trigger system_settings_enqueue_removed_media
after update or delete on public.system_settings
for each row execute function public.enqueue_removed_system_settings_media();

commit;
