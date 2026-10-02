begin;

revoke update on table public.profiles from public, anon, authenticated;
revoke update (
  id,
  email,
  first_name,
  middle_initial,
  surname,
  student_id,
  role,
  program,
  year_level,
  section,
  phone,
  contact_email,
  photo_url,
  qr_version,
  cover_photo_url,
  id_photo_url,
  created_at
) on table public.profiles from public, anon, authenticated;

grant update (
  id,
  first_name,
  middle_initial,
  surname,
  student_id,
  program,
  year_level,
  section,
  phone,
  contact_email,
  photo_url,
  qr_version,
  cover_photo_url,
  id_photo_url
) on table public.profiles to authenticated;

create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if tg_op = 'INSERT' then
      new.role := 'student';
    else
      new.role := old.role;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists a_profiles_role_guard_insert on public.profiles;
create trigger a_profiles_role_guard_insert
before insert on public.profiles
for each row
execute function public.guard_profile_role();

drop trigger if exists a_profiles_role_guard_update on public.profiles;
create trigger a_profiles_role_guard_update
before update of role on public.profiles
for each row
execute function public.guard_profile_role();

revoke all on function public.guard_profile_role()
  from public, anon, authenticated;

create or replace function public.admin_set_profile_role(
  p_profile_id uuid,
  p_role public.user_role
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Administrator access is required.'
      using errcode = '42501';
  end if;

  update public.profiles
  set role = p_role
  where id = p_profile_id;

  if not found then
    raise exception 'Profile not found.'
      using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.admin_set_profile_role(uuid, public.user_role)
  from public, anon;
grant execute on function public.admin_set_profile_role(uuid, public.user_role)
  to authenticated;

commit;
