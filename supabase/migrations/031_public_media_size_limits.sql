begin;

drop policy if exists storage_admin_all_access on storage.objects;
create policy storage_admin_all_access
  on storage.objects
  for all
  using (public.is_admin() and bucket_id <> 'public-images')
  with check (public.is_admin() and bucket_id <> 'public-images');

drop policy if exists public_images_insert_admin on storage.objects;
create policy public_images_insert_admin
  on storage.objects
  for insert
  with check (
    bucket_id = 'public-images'
    and public.is_admin()
    and (
      (
        metadata->>'mimetype' = 'video/mp4'
        and coalesce(nullif(metadata->>'size', '')::bigint, 52428801) <= 52428800
      )
      or (
        metadata->>'mimetype' like 'image/%'
        and coalesce(nullif(metadata->>'size', '')::bigint, 20971521) <= 20971520
      )
    )
  );

drop policy if exists public_images_insert_authenticated on storage.objects;
create policy public_images_insert_authenticated
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'public-images'
    and auth.uid() is not null
    and (
      (
        metadata->>'mimetype' = 'video/mp4'
        and coalesce(nullif(metadata->>'size', '')::bigint, 52428801) <= 52428800
      )
      or (
        metadata->>'mimetype' like 'image/%'
        and coalesce(nullif(metadata->>'size', '')::bigint, 20971521) <= 20971520
      )
    )
  );

drop policy if exists public_images_update_admin on storage.objects;
create policy public_images_update_admin
  on storage.objects
  for update
  using (bucket_id = 'public-images' and public.is_admin())
  with check (
    bucket_id = 'public-images'
    and public.is_admin()
    and (
      (
        metadata->>'mimetype' = 'video/mp4'
        and coalesce(nullif(metadata->>'size', '')::bigint, 52428801) <= 52428800
      )
      or (
        metadata->>'mimetype' like 'image/%'
        and coalesce(nullif(metadata->>'size', '')::bigint, 20971521) <= 20971520
      )
    )
  );

commit;