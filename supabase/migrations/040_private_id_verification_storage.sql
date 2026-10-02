begin;

alter table public.profiles
  add column if not exists id_photo_path text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_id_photo_path_owner_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_id_photo_path_owner_check
      check (
        id_photo_path is null
        or (
          split_part(id_photo_path, '/', 1) = id::text
          and split_part(id_photo_path, '/', 2) <> ''
          and position('/' in split_part(id_photo_path, '/', 2)) = 0
        )
      );
  end if;
end;
$$;

revoke update (id_photo_path)
  on table public.profiles from public, anon, authenticated;
grant update (id_photo_path)
  on table public.profiles to authenticated;
revoke update (id_photo_url)
  on table public.profiles from public, anon, authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'id-verification',
  'id-verification',
  false,
  20971520,
  array['image/*']::text[]
)
on conflict (id) do update
set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists id_verification_upload_owner
  on storage.objects;
create policy id_verification_upload_owner
  on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'id-verification'
    and split_part(name, '/', 1) = auth.uid()::text
    and split_part(name, '/', 2) <> ''
    and position('/' in split_part(name, '/', 2)) = 0
  );

drop policy if exists id_verification_read_owner_or_admin
  on storage.objects;
create policy id_verification_read_owner_or_admin
  on storage.objects
  for select to authenticated
  using (
    bucket_id = 'id-verification'
    and (split_part(name, '/', 1) = auth.uid()::text or public.is_admin())
  );

drop policy if exists id_verification_delete_owner_or_admin
  on storage.objects;
create policy id_verification_delete_owner_or_admin
  on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'id-verification'
    and (split_part(name, '/', 1) = auth.uid()::text or public.is_admin())
  );

commit;