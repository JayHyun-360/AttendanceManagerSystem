-- TapIn: storage bucket setup for public images

insert into storage.buckets (id, name, public)
values ('public-images', 'public-images', true)
on conflict (id) do nothing;

create policy public_images_select_public
  on storage.objects
  for select
  using (bucket_id = 'public-images' and auth.role() in ('authenticated', 'anon'));

create policy public_images_insert_admin
  on storage.objects
  for insert
  with check (bucket_id = 'public-images' and public.is_admin());

create policy public_images_update_admin
  on storage.objects
  for update
  using (bucket_id = 'public-images' and public.is_admin())
  with check (bucket_id = 'public-images' and public.is_admin());

create policy public_images_delete_admin
  on storage.objects
  for delete
  using (bucket_id = 'public-images' and public.is_admin());
