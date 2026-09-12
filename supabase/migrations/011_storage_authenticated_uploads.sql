-- Allow authenticated users to upload onboarding/profile media.
-- Keep admin-only update/delete permissions explicit for the public-images bucket.

begin;

drop policy if exists public_images_insert_authenticated on storage.objects;
create policy public_images_insert_authenticated
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'public-images' and auth.uid() is not null);

-- Recreate the admin-only object update/delete policies so image cleanup
-- still works from protected admin routes without opening broader write access.
drop policy if exists public_images_update_admin on storage.objects;
create policy public_images_update_admin
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'public-images' and public.is_admin())
  with check (bucket_id = 'public-images' and public.is_admin());

drop policy if exists public_images_delete_admin on storage.objects;
create policy public_images_delete_admin
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'public-images' and public.is_admin());

commit;
