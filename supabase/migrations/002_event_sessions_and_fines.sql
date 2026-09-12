-- 002_event_sessions_and_fines.sql
-- Align the persisted events table with the event creation/edit UI model in app/page.tsx.

begin;

alter table public.events
  add column if not exists multi_session boolean not null default false,
  add column if not exists strict_morning boolean not null default false,
  add column if not exists strict_afternoon boolean not null default false,
  add column if not exists morning_start time,
  add column if not exists morning_end time,
  add column if not exists morning_late_cutoff time,
  add column if not exists afternoon_start time,
  add column if not exists afternoon_end time,
  add column if not exists afternoon_late_cutoff time,
  add column if not exists absent_fine numeric(10,2) not null default 0,
  add column if not exists late_fine numeric(10,2) not null default 0,
  add column if not exists morning_absent_fine numeric(10,2) null,
  add column if not exists morning_late_fine numeric(10,2) null,
  add column if not exists afternoon_absent_fine numeric(10,2) null,
  add column if not exists afternoon_late_fine numeric(10,2) null;

-- Create a purpose-built attendance scan table for per-session time-in / time-out scanning.
-- The UI models the scanner around session-aware event scans, but the current schema only
-- has a generic attendance_logs table that does not carry session labels or pairwise scan-in/out.
create table if not exists public.attendance_scans (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  session_label text not null default 'morning' check (session_label in ('morning', 'afternoon')),
  scan_in_at timestamptz,
  scan_out_at timestamptz,
  status public.attendance_status default 'present',
  scanned_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.attendance_scans enable row level security;

create policy attendance_scans_select_auth
  on public.attendance_scans
  for select
  using (auth.uid() is not null);

create policy attendance_scans_insert_admin
  on public.attendance_scans
  for insert
  with check (public.is_admin());

create policy attendance_scans_update_admin
  on public.attendance_scans
  for update
  using (public.is_admin());

create policy attendance_scans_delete_admin
  on public.attendance_scans
  for delete
  using (public.is_admin());

commit;
