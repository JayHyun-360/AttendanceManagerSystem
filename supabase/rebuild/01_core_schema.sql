-- Consolidated fresh-project schema baseline.
-- Does not import historical rows or Auth users.

begin;

create extension if not exists pgcrypto;

create type public.user_role as enum ('student', 'admin');
create type public.attendance_status as enum ('present', 'late', 'absent');
create type public.fine_status as enum ('unpaid', 'paid', 'excused');
create type public.excuse_status as enum ('pending', 'approved', 'denied');

create table public.profiles (
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
  id_photo_url text,
  cover_photo_url text,
  qr_version integer default 1,
  created_at timestamptz default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  location text,
  event_date date not null,
  start_time time,
  end_time time,
  image_url text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  multi_session boolean not null default false,
  strict_morning boolean not null default false,
  strict_afternoon boolean not null default false,
  morning_start time,
  morning_end time,
  morning_late_cutoff time,
  afternoon_start time,
  afternoon_end time,
  afternoon_late_cutoff time,
  absent_fine numeric(10,2) not null default 0,
  late_fine numeric(10,2) not null default 0,
  morning_absent_fine numeric(10,2),
  morning_late_fine numeric(10,2),
  afternoon_absent_fine numeric(10,2),
  afternoon_late_fine numeric(10,2),
  status text not null default 'upcoming'
    check (status in ('active', 'upcoming', 'closed', 'cancelled')),
  feedback_enabled boolean not null default false,
  program text not null default 'All Programs',
  version integer not null default 1,
  media_urls text[] not null default '{}',
  archived_at timestamptz,
  sanctions_enabled boolean not null default false
);

create table public.attendance_logs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete cascade,
  scanned_at timestamptz default now(),
  scanned_by uuid references public.profiles(id),
  status public.attendance_status default 'present'
);

create table public.attendance_scans (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  session_label text not null default 'morning'
    check (session_label in ('morning', 'afternoon')),
  scan_in_at timestamptz,
  scan_out_at timestamptz,
  status public.attendance_status default 'present',
  scanned_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  method text check (method in ('qr_scan', 'manual')),
  fine_policy_enabled boolean not null default false,
  constraint attendance_scans_event_student_session_unique
    unique (event_id, student_id, session_label)
);

create table public.fines (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  amount numeric(10,2) not null,
  reason text,
  status public.fine_status default 'unpaid',
  created_at timestamptz default now(),
  attendance_scan_id uuid references public.attendance_scans(id) on delete set null,
  session_label text
);

create table public.excuse_requests (
  id uuid primary key default gen_random_uuid(),
  fine_id uuid references public.fines(id) on delete set null,
  student_id uuid references public.profiles(id) on delete cascade,
  reason text not null,
  document_url text,
  status public.excuse_status default 'pending',
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz default now(),
  event_id uuid references public.events(id) on delete set null,
  attendance_scan_id uuid references public.attendance_scans(id) on delete set null,
  session_label text
    check (session_label is null or session_label in ('morning', 'afternoon'))
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  media_url text,
  posted_by uuid references public.profiles(id),
  target_role public.user_role default 'student',
  created_at timestamptz default now()
);

create table public.system_settings (
  id integer primary key default 1,
  system_name text default 'Adesse',
  qr_expiration_minutes integer default 5,
  updated_at timestamptz default now(),
  settings jsonb not null default '{}'::jsonb
);

create table public.attendance_scan_corrections (
  id uuid primary key default gen_random_uuid(),
  attendance_scan_id uuid,
  event_id uuid not null,
  student_id uuid not null,
  session_label text not null
    check (session_label in ('morning', 'afternoon')),
  previous_status public.attendance_status not null,
  corrected_status public.attendance_status not null,
  previous_scan_in_at timestamptz,
  previous_scan_out_at timestamptz,
  previous_method text,
  previous_scanned_by uuid,
  previous_fine_policy_enabled boolean not null,
  reason text not null
    check (char_length(btrim(reason)) between 1 and 1000),
  changed_by uuid not null,
  changed_at timestamptz not null default now()
);

create table public.event_feedback (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (
    comment is null or char_length(btrim(comment)) <= 2000
  ),
  created_at timestamptz not null default now(),
  constraint event_feedback_event_student_unique unique (event_id, student_id)
);

create sequence public.storage_cleanup_queue_id_seq;

create table public.storage_cleanup_queue (
  id bigint primary key
    default nextval('public.storage_cleanup_queue_id_seq'::regclass),
  bucket_id text not null,
  object_path text not null
    check (length(btrim(object_path)) > 0),
  status text not null default 'pending'
    check (
      status in (
        'pending', 'processing', 'completed', 'failed', 'quarantined',
        'cancelled'
      )
    ),
  constraint storage_cleanup_queue_bucket_check
    check (
      bucket_id in (
        'public-images', 'student-private-media', 'excuse-documents'
      )
    ),
  attempts integer not null default 0 check (attempts >= 0),
  created_at timestamptz not null default now(),
  available_at timestamptz not null default now(),
  last_error text,
  processed_at timestamptz
);

alter sequence public.storage_cleanup_queue_id_seq
  owned by public.storage_cleanup_queue.id;

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  sort_order integer not null default 0,
  legacy_aliases text[] not null default '{}',
  created_at timestamptz not null default now(),
  constraint programs_name_length
    check (length(btrim(name)) between 2 and 100 and name = btrim(name)),
  constraint programs_name_no_slash
    check (position('/' in name) = 0)
);

create unique index attendance_logs_event_student_unique
  on public.attendance_logs (event_id, student_id);
create unique index fines_attendance_scan_unique
  on public.fines (attendance_scan_id)
  where attendance_scan_id is not null;
create index events_active_event_date_idx
  on public.events (event_date desc)
  where archived_at is null;
create index excuse_requests_student_event_session_status_idx
  on public.excuse_requests (student_id, event_id, session_label, status);
create unique index storage_cleanup_queue_active_object_idx
  on public.storage_cleanup_queue (bucket_id, object_path)
  where status in ('pending', 'processing', 'failed');
create index storage_cleanup_queue_ready_idx
  on public.storage_cleanup_queue (bucket_id, status, available_at, created_at);
create unique index programs_name_case_insensitive_uidx
  on public.programs (lower(name));
create index attendance_scans_student_scan_in_idx
  on public.attendance_scans (student_id, scan_in_at desc);
create index attendance_scans_event_scan_in_idx
  on public.attendance_scans (event_id, scan_in_at desc, student_id);
create index attendance_scans_status_scan_in_idx
  on public.attendance_scans (status, scan_in_at desc)
  where scan_in_at is not null;
create index fines_student_created_idx
  on public.fines (student_id, created_at desc, id asc);
create index fines_event_student_idx
  on public.fines (event_id, student_id)
  where event_id is not null;
create index excuse_requests_created_id_idx
  on public.excuse_requests (created_at desc, id asc);
create index excuse_requests_status_event_student_idx
  on public.excuse_requests (status, event_id, student_id)
  where event_id is not null;
create index profiles_role_surname_id_idx
  on public.profiles (role, surname, id);
create index profiles_photo_url_media_ref_idx
  on public.profiles (photo_url) where photo_url is not null;
create index profiles_id_photo_media_ref_idx
  on public.profiles (id_photo_url) where id_photo_url is not null;
create index profiles_cover_photo_media_ref_idx
  on public.profiles (cover_photo_url) where cover_photo_url is not null;
create index events_image_media_ref_idx
  on public.events (image_url) where image_url is not null;
create index events_media_urls_media_ref_idx
  on public.events using gin (media_urls);
create index announcements_media_url_ref_idx
  on public.announcements (media_url) where media_url is not null;
create index excuses_document_url_media_ref_idx
  on public.excuse_requests (document_url)
  where document_url is not null;
create index events_report_date_id_idx
  on public.events (event_date desc, id asc)
  where status <> 'upcoming';
create index events_archived_at_id_idx
  on public.events (archived_at desc, id asc)
  where archived_at is not null;
create index announcements_target_created_id_idx
  on public.announcements (target_role, created_at desc, id asc);

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.attendance_logs enable row level security;
alter table public.attendance_scans enable row level security;
alter table public.fines enable row level security;
alter table public.excuse_requests enable row level security;
alter table public.announcements enable row level security;
alter table public.system_settings enable row level security;
alter table public.attendance_scan_corrections enable row level security;
alter table public.event_feedback enable row level security;
alter table public.programs enable row level security;

commit;
