-- TapIn: AI-Assisted Attendance & Fee System
-- Initial Supabase PostgreSQL schema and storage policy script

create extension if not exists pgcrypto;

create type public.user_role as enum ('student', 'admin');
create type public.attendance_status as enum ('present', 'late', 'absent');
create type public.fine_status as enum ('unpaid', 'paid', 'excused');
create type public.excuse_status as enum ('pending', 'approved', 'denied');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  first_name text,
  middle_initial text,
  surname text,
  student_id text unique,
  role public.user_role default 'student',
  program text,
  year_level text,
  section text,
  phone text,
  contact_email text,
  photo_url text,
  qr_version int default 1,
  created_at timestamptz default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  location text,
  event_date date not null,
  start_time time,
  end_time time,
  image_url text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

create table if not exists public.attendance_logs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete cascade,
  scanned_at timestamptz default now(),
  scanned_by uuid references public.profiles(id),
  status public.attendance_status default 'present'
);

create table if not exists public.fines (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  amount numeric(10,2) not null,
  reason text,
  status public.fine_status default 'unpaid',
  created_at timestamptz default now()
);

create table if not exists public.excuse_requests (
  id uuid primary key default gen_random_uuid(),
  fine_id uuid references public.fines(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete cascade,
  reason text not null,
  document_url text,
  status public.excuse_status default 'pending',
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  media_url text,
  posted_by uuid references public.profiles(id),
  target_role public.user_role default 'student',
  created_at timestamptz default now()
);

create table if not exists public.system_settings (
  id int primary key default 1,
  system_name text default 'TapIn',
  qr_expiration_minutes int default 5,
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.attendance_logs enable row level security;
alter table public.fines enable row level security;
alter table public.excuse_requests enable row level security;
alter table public.announcements enable row level security;
alter table public.system_settings enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    first_name,
    middle_initial,
    surname,
    contact_email,
    role,
    photo_url
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'middle_initial', ''),
    coalesce(new.raw_user_meta_data ->> 'surname', ''),
    new.email,
    'student',
    coalesce(new.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create policy profiles_select_students
  on public.profiles
  for select
  using (auth.uid() = id or public.is_admin());

create policy profiles_insert_students
  on public.profiles
  for insert
  with check (auth.uid() = id);

create policy profiles_update_students
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy profiles_admin_full_access
  on public.profiles
  for all
  using (public.is_admin())
  with check (public.is_admin());

create policy events_select_public
  on public.events
  for select
  using (true);

create policy events_insert_admin
  on public.events
  for insert
  with check (public.is_admin());

create policy events_update_admin
  on public.events
  for update
  using (public.is_admin());

create policy events_delete_admin
  on public.events
  for delete
  using (public.is_admin());

create policy attendance_select_auth
  on public.attendance_logs
  for select
  using (auth.uid() is not null);

create policy attendance_insert_admin
  on public.attendance_logs
  for insert
  with check (public.is_admin());

create policy attendance_update_admin
  on public.attendance_logs
  for update
  using (public.is_admin());

create policy fines_student_select
  on public.fines
  for select
  using (auth.uid() = student_id or public.is_admin());

create policy fines_insert_admin
  on public.fines
  for insert
  with check (public.is_admin());

create policy fines_update_admin
  on public.fines
  for update
  using (public.is_admin());

create policy excuse_select_auth
  on public.excuse_requests
  for select
  using (auth.uid() = student_id or public.is_admin());

create policy excuse_insert_student
  on public.excuse_requests
  for insert
  with check (auth.uid() = student_id);

create policy excuse_update_admin
  on public.excuse_requests
  for update
  using (public.is_admin());

create policy announcements_select_public
  on public.announcements
  for select
  using (true);

create policy announcements_insert_admin
  on public.announcements
  for insert
  with check (public.is_admin());

create policy announcements_update_admin
  on public.announcements
  for update
  using (public.is_admin());

create policy announcements_delete_admin
  on public.announcements
  for delete
  using (public.is_admin());

create policy settings_select_public
  on public.system_settings
  for select
  using (true);

create policy settings_update_admin
  on public.system_settings
  for update
  using (public.is_admin());

insert into public.system_settings (id, system_name, qr_expiration_minutes)
values (1, 'TapIn', 5)
on conflict (id) do nothing;

create policy storage_avatars_authenticated_upload
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

create policy storage_excuse_documents_authenticated_upload
  on storage.objects for insert
  with check (bucket_id = 'excuse-documents' and auth.role() = 'authenticated');

create policy storage_public_read
  on storage.objects for select
  using (bucket_id in ('avatars', 'excuse-documents', 'media') and auth.role() in ('authenticated', 'anon'));

create policy storage_admin_all_access
  on storage.objects for all
  using (public.is_admin())
  with check (public.is_admin());

-- Bucket creation
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('excuse-documents', 'excuse-documents', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;
