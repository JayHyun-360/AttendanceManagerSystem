begin;

-- Removing this setting invokes the existing trigger to enqueue its old files
-- for storage cleanup before the trigger stops tracking hero image URLs.
update public.system_settings
set settings = settings - 'heroImageUrls'
where settings ? 'heroImageUrls';

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

commit;
