-- Student tab security hardening.
-- Run after 015_attendance_fine_lifecycle.sql.

begin;

alter table public.profiles
  add column if not exists qr_version integer not null default 1;

-- Attendance records are visible only to the owning student or an administrator.
drop policy if exists attendance_scans_select_auth on public.attendance_scans;
create policy attendance_scans_select_owner_or_admin
  on public.attendance_scans
  for select
  using (auth.uid() = student_id or public.is_admin());

-- Prevent an administrator from demoting their own profile through onboarding/profile updates.
create or replace function public.prevent_admin_self_demotion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role = 'admin' and new.role <> 'admin' and auth.uid() = old.id then
    new.role := old.role;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_admin_self_demotion on public.profiles;
create trigger protect_admin_self_demotion
before update on public.profiles
for each row execute function public.prevent_admin_self_demotion();

-- Excuse documents contain potentially sensitive student evidence. Keep them private
-- and expose them through authenticated admin access or a future signed-URL flow.
drop policy if exists storage_public_read on storage.objects;
create policy storage_public_read
  on storage.objects for select
  using (bucket_id in ('avatars', 'media', 'public-images') and auth.role() in ('authenticated', 'anon'));

create policy storage_excuse_documents_admin_read
  on storage.objects for select
  using (bucket_id = 'excuse-documents' and public.is_admin());

update storage.buckets
set public = false
where id = 'excuse-documents';

commit;
