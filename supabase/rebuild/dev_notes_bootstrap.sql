-- New minimal app-compatible contract for the manually managed announcement table.
-- Run once after 01_core_schema.sql; the historical 032 migration is not run.
-- The original physical schema could not be verified. This is a new baseline
-- contract, not a claim that the old table used these exact SQL types.
-- Creates the table empty; no previous announcement records are copied.

begin;

create table public.dev_notes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  type text not null default 'info',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dev_notes_type_check
    check (type in ('info', 'warning', 'feature', 'update'))
);

alter table public.dev_notes enable row level security;

revoke all privileges on table public.dev_notes
  from public, anon, authenticated, service_role;
grant select on table public.dev_notes to authenticated;

-- Authenticated clients can read active announcements; maintain rows through
-- Supabase Table Editor rather than adding client-side write access.
create policy dev_notes_active_select
  on public.dev_notes
  for select
  to authenticated
  using (is_active);

commit;
