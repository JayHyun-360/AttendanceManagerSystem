begin;

-- Removing a hero or carousel asset must not roll back the settings update when
-- the asynchronous cleanup queue is unavailable or temporarily misconfigured.
create or replace function public.enqueue_removed_system_settings_media()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  begin
    if tg_op = 'DELETE' then
      perform public.enqueue_removed_settings_media(old.settings, '{}'::jsonb);
    else
      perform public.enqueue_removed_settings_media(old.settings, new.settings);
    end if;
  exception when others then
    raise warning 'Settings media cleanup enqueue skipped: %', sqlerrm;
  end;

  return coalesce(new, old);
end;
$function$;

commit;
