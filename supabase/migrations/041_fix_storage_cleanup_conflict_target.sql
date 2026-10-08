begin;

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
  on conflict do nothing;
end;
$function$;

revoke all on function public.enqueue_storage_cleanup_value(text, text) from public;
grant execute on function public.enqueue_storage_cleanup_value(text, text) to service_role;

commit;