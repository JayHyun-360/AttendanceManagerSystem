-- Manual, forward-only upgrade for an existing Adesse database.
-- Do not run this on a fresh project or as part of supabase/rebuild/.
-- This targets the previously deployed, pre-feature supabase/rebuild baseline.
-- Compare live objects with that baseline before running; do not use archived
-- historical migrations as the compatibility reference.
-- This script is intentionally run-once and does not backfill or rewrite data.

begin;

do $$
declare
  required_column text;
  required_table text;
begin
  if to_regclass('public.student_id_exception_requests') is not null then
    raise exception 'student_id_exception_requests already exists; inspect the database and do not rerun this upgrade.';
  end if;

  if to_regclass('public.profiles') is null
     or to_regclass('public.events') is null
     or to_regclass('public.attendance_scans') is null
     or to_regclass('public.fines') is null
     or to_regclass('public.excuse_requests') is null
     or to_regclass('public.system_settings') is null
     or to_regclass('public.programs') is null then
    raise exception 'Required Adesse tables are missing; verify the deployed schema before applying this upgrade.';
  end if;

  foreach required_column in array array[
    'profiles.role',
    'profiles.first_name',
    'profiles.middle_initial',
    'profiles.surname',
    'profiles.student_id',
    'profiles.program',
    'profiles.year_level',
    'profiles.section',
    'profiles.phone',
    'profiles.contact_email',
    'profiles.photo_url',
    'profiles.id_photo_url',
    'profiles.cover_photo_url',
    'events.event_date',
    'events.start_time',
    'events.morning_start',
    'events.morning_end',
    'events.afternoon_start',
    'events.afternoon_end',
    'events.end_time',
    'events.multi_session',
    'events.program',
    'events.status',
    'events.sanctions_enabled',
    'events.absent_fine',
    'events.late_fine',
    'events.morning_absent_fine',
    'events.morning_late_fine',
    'events.afternoon_absent_fine',
    'events.afternoon_late_fine',
    'attendance_scans.event_id',
    'attendance_scans.student_id',
    'attendance_scans.session_label',
    'attendance_scans.status',
    'attendance_scans.scan_in_at',
    'attendance_scans.scanned_by',
    'attendance_scans.fine_policy_enabled',
    'fines.attendance_scan_id',
    'fines.student_id',
    'fines.event_id',
    'fines.session_label',
    'fines.amount',
    'fines.reason',
    'fines.status',
    'excuse_requests.student_id',
    'excuse_requests.event_id',
    'excuse_requests.session_label',
    'excuse_requests.status',
    'system_settings.id',
    'system_settings.settings',
    'programs.name',
    'programs.legacy_aliases',
    'programs.active'
  ] loop
    required_table := split_part(required_column, '.', 1);
    if not exists (
      select 1
      from information_schema.columns column_info
      where column_info.table_schema = 'public'
        and column_info.table_name = required_table
        and column_info.column_name = split_part(required_column, '.', 2)
    ) then
      raise exception 'Required column public.% is missing; stop and verify the live schema.', required_column;
    end if;
  end loop;

  if exists (
    select 1
    from (
      values
        ('profiles', 'middle_initial', 'text'),
        ('profiles', 'section', 'text'),
        ('profiles', 'photo_url', 'text'),
        ('profiles', 'id_photo_url', 'text'),
        ('profiles', 'cover_photo_url', 'text'),
        ('events', 'event_date', 'date'),
        ('events', 'start_time', 'time without time zone'),
        ('events', 'morning_start', 'time without time zone'),
        ('events', 'morning_end', 'time without time zone'),
        ('events', 'afternoon_start', 'time without time zone'),
        ('events', 'afternoon_end', 'time without time zone'),
        ('events', 'end_time', 'time without time zone'),
        ('events', 'multi_session', 'boolean'),
        ('events', 'program', 'text'),
        ('events', 'sanctions_enabled', 'boolean'),
        ('events', 'absent_fine', 'numeric'),
        ('events', 'late_fine', 'numeric'),
        ('events', 'morning_absent_fine', 'numeric'),
        ('events', 'morning_late_fine', 'numeric'),
        ('events', 'afternoon_absent_fine', 'numeric'),
        ('events', 'afternoon_late_fine', 'numeric'),
        ('system_settings', 'settings', 'jsonb'),
        ('programs', 'legacy_aliases', 'ARRAY'),
        ('programs', 'active', 'boolean'),
        ('attendance_scans', 'fine_policy_enabled', 'boolean'),
        ('attendance_scans', 'scan_in_at', 'timestamp with time zone'),
        ('attendance_scans', 'status', 'USER-DEFINED'),
        ('fines', 'amount', 'numeric'),
        ('fines', 'status', 'USER-DEFINED')
    ) as expected(table_name, column_name, data_type)
    left join information_schema.columns actual
      on actual.table_schema = 'public'
      and actual.table_name = expected.table_name
      and actual.column_name = expected.column_name
    where actual.data_type is distinct from expected.data_type
  ) then
    raise exception 'One or more required columns have unexpected types; stop and inspect the live schema before applying this upgrade.';
  end if;

  if not exists (
    select 1
    from information_schema.columns column_info
    where column_info.table_schema = 'public'
      and column_info.table_name = 'attendance_scans'
      and column_info.column_name = 'status'
      and column_info.udt_schema = 'public'
      and column_info.udt_name = 'attendance_status'
  ) then
    raise exception 'attendance_scans.status is not public.attendance_status; inspect the live schema before applying this upgrade.';
  end if;

  if not exists (
    select 1
    from information_schema.columns column_info
    where column_info.table_schema = 'public'
      and column_info.table_name = 'fines'
      and column_info.column_name = 'status'
      and column_info.udt_schema = 'public'
      and column_info.udt_name = 'fine_status'
  ) then
    raise exception 'fines.status is not public.fine_status; inspect the live schema before applying this upgrade.';
  end if;

  if not exists (
    select 1
    from pg_constraint constraint_info
    where constraint_info.conrelid = 'public.attendance_scans'::regclass
      and constraint_info.conname =
        'attendance_scans_event_student_session_unique'
      and constraint_info.contype = 'u'
  ) then
    raise exception 'The attendance event/student/session uniqueness constraint is missing; inspect the live schema before applying this upgrade.';
  end if;

  if to_regprocedure('public.is_admin()') is null
     or to_regprocedure('public.is_fines_enabled()') is null
     or to_regprocedure('public.event_session_has_ended(date,time)') is null
     or to_regprocedure('public.event_session_fine_amount(uuid,text,public.attendance_status)') is null
     or to_regprocedure('public.event_program_matches(text,text)') is null
     or to_regprocedure('public.materialize_student_absences_after_profile_change()') is null
     or to_regprocedure('public.materialize_event_absences_after_change()') is null
     or to_regprocedure('public.capture_attendance_fine_policy()') is null
     or to_regprocedure('public.materialize_student_inferred_absences(uuid)') is null
     or to_regprocedure('public.materialize_event_inferred_absences(uuid)') is null
     or to_regprocedure('public.reconcile_attendance_fine()') is null
     or to_regprocedure('public.get_admin_report_aggregates(date,date,integer,integer)') is null then
    raise exception 'One or more required Adesse routines are missing; verify the pre-feature rebuild baseline before applying this upgrade.';
  end if;

  if to_regprocedure('public.submit_student_id_exception(text,text,text,text,text,text,text,text,text)') is not null
     or to_regprocedure('public.approve_student_id_exception(uuid)') is not null
     or to_regprocedure('public.acknowledge_student_id_exception()') is not null
     or to_regprocedure('public.resolve_pending_id_exception_by_photo()') is not null
     or to_regprocedure('public.event_session_starts_at(date,time)') is not null then
    raise exception 'One or more feature-specific routines already exist; inspect the database and do not rerun this upgrade.';
  end if;

  if (
    select pg_get_function_result(
      'public.get_admin_report_aggregates(date,date,integer,integer)'::regprocedure
    )
  ) <> 'jsonb' then
    raise exception 'get_admin_report_aggregates has an unexpected return type; inspect its live definition before applying this upgrade.';
  end if;

  if position(
    'event_program_matches' in
      pg_get_functiondef(
        'public.get_admin_report_aggregates(date,date,integer,integer)'::regprocedure
      )
  ) = 0 then
    raise exception 'The deployed report routine does not match the pre-feature rebuild report contract; inspect its definition before applying this upgrade.';
  end if;

  -- tgtype encodes row/timing/event bits: after insert=5, after update=17,
  -- before insert=7, and before update=19.
  if exists (
    select 1
    from (
      values
        (
          'public.profiles'::regclass,
          'profiles_materialize_student_absences_insert'::text,
          'public.materialize_student_absences_after_profile_change()'::regprocedure::oid,
          5,
          null::text[]
        ),
        (
          'public.profiles'::regclass,
          'profiles_materialize_student_absences_update'::text,
          'public.materialize_student_absences_after_profile_change()'::regprocedure::oid,
          17,
          array['role', 'program']::text[]
        ),
        (
          'public.events'::regclass,
          'events_materialize_inferred_absences_insert'::text,
          'public.materialize_event_absences_after_change()'::regprocedure::oid,
          5,
          null::text[]
        ),
        (
          'public.events'::regclass,
          'events_materialize_inferred_absences_update'::text,
          'public.materialize_event_absences_after_change()'::regprocedure::oid,
          17,
          array[
            'status', 'event_date', 'program', 'multi_session',
            'morning_end', 'afternoon_end', 'end_time'
          ]::text[]
        ),
        (
          'public.attendance_scans'::regclass,
          'attendance_scans_capture_fine_policy_insert'::text,
          'public.capture_attendance_fine_policy()'::regprocedure::oid,
          7,
          null::text[]
        ),
        (
          'public.attendance_scans'::regclass,
          'attendance_scans_capture_fine_policy_update'::text,
          'public.capture_attendance_fine_policy()'::regprocedure::oid,
          19,
          array['status']::text[]
        ),
        (
          'public.attendance_scans'::regclass,
          'attendance_scans_reconcile_fine_insert'::text,
          'public.reconcile_attendance_fine()'::regprocedure::oid,
          5,
          null::text[]
        ),
        (
          'public.attendance_scans'::regclass,
          'attendance_scans_reconcile_fine_update'::text,
          'public.reconcile_attendance_fine()'::regprocedure::oid,
          17,
          array[
            'event_id', 'student_id', 'session_label', 'status',
            'fine_policy_enabled'
          ]::text[]
        )
    ) as expected(
      table_oid,
      trigger_name,
      function_oid,
      expected_tgtype,
      expected_update_columns
    )
    where not exists (
      select 1
      from pg_trigger trigger_info
      where trigger_info.tgrelid = expected.table_oid
        and trigger_info.tgname = expected.trigger_name
        and not trigger_info.tgisinternal
        and trigger_info.tgenabled = 'O'
        and trigger_info.tgfoid = expected.function_oid
        and trigger_info.tgtype = expected.expected_tgtype
        and (
          expected.expected_update_columns is null
          or (
            select coalesce(
              array_agg(attribute_info.attname::text order by attribute_info.attname::text),
              array[]::text[]
            )
            from unnest(trigger_info.tgattr::smallint[]) as trigger_column(attnum)
            join pg_attribute attribute_info
              on attribute_info.attrelid = trigger_info.tgrelid
              and attribute_info.attnum = trigger_column.attnum
              and not attribute_info.attisdropped
          ) = (
            select array_agg(column_name order by column_name)
            from unnest(expected.expected_update_columns) as expected_column(column_name)
          )
        )
    )
  ) then
    raise exception 'Expected pre-feature rebuild attendance triggers are missing or have unexpected timing, events, columns, enabled state, or function bindings; inspect live trigger definitions before applying this upgrade.';
  end if;

  if exists (
    select 1
    from pg_trigger trigger_info
    where not trigger_info.tgisinternal
      and (
        (
          trigger_info.tgrelid = 'public.profiles'::regclass
          and trigger_info.tgname = 'profiles_materialize_student_absences'
        )
        or (
          trigger_info.tgrelid = 'public.events'::regclass
          and trigger_info.tgname = 'events_materialize_inferred_absences'
        )
        or (
          trigger_info.tgrelid = 'public.attendance_scans'::regclass
          and trigger_info.tgname = 'attendance_scans_reconcile_fine'
        )
        or (
          trigger_info.tgrelid = 'public.attendance_scans'::regclass
          and trigger_info.tgname = 'attendance_scans_capture_fine_policy'
        )
      )
  ) then
    raise exception 'Archived-migration attendance trigger names were found; this upgrade requires the pre-feature rebuild trigger structure.';
  end if;

  if exists (
    select 1
    from pg_trigger trigger_info
    where trigger_info.tgrelid = 'public.profiles'::regclass
      and trigger_info.tgname = 'profiles_resolve_pending_id_exception_by_photo'
      and not trigger_info.tgisinternal
  ) then
    raise exception 'The ID-photo resolution trigger already exists; inspect the database and do not rerun this upgrade.';
  end if;
end;
$$;

create table public.student_id_exception_requests (
  student_id uuid primary key
    references public.profiles(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'temporarily_approved', 'resolved_by_photo')),
  requested_at timestamptz not null default now(),
  approved_by uuid,
  approved_at timestamptz,
  attendance_eligible_from timestamptz,
  continued_at timestamptz,
  constraint student_id_exception_request_state_check check (
    (
      status = 'pending'
      and approved_by is null
      and approved_at is null
      and attendance_eligible_from is null
      and continued_at is null
    )
    or (
      status = 'temporarily_approved'
      and approved_by is not null
      and approved_at is not null
      and attendance_eligible_from = approved_at
      and (continued_at is null or continued_at >= approved_at)
    )
    or (
      status = 'resolved_by_photo'
      and approved_by is null
      and approved_at is null
      and attendance_eligible_from is not null
      and continued_at is null
    )
  )
);

alter table public.student_id_exception_requests enable row level security;

create policy student_id_exception_requests_select_owner_or_admin
  on public.student_id_exception_requests for select to authenticated
  using (auth.uid() = student_id or public.is_admin());

revoke all privileges on table public.student_id_exception_requests
  from public, anon, authenticated, service_role;
grant select on table public.student_id_exception_requests to authenticated;

create or replace function public.submit_student_id_exception(
  p_first_name text,
  p_middle_initial text,
  p_surname text,
  p_student_id text,
  p_program text,
  p_year_level text,
  p_section text,
  p_phone text,
  p_contact_email text
)
returns public.student_id_exception_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_request public.student_id_exception_requests%rowtype;
begin
  if v_student_id is null then
    raise exception 'Sign in before submitting an ID exception request.'
      using errcode = '42501';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = v_student_id
  for update;

  if not found or v_profile.role <> 'student' then
    raise exception 'Only student accounts can submit an ID exception request.'
      using errcode = '42501';
  end if;

  if nullif(btrim(v_profile.id_photo_url), '') is not null then
    raise exception 'An ID photo is already on file.'
      using errcode = '22023';
  end if;

  if nullif(btrim(p_first_name), '') is null
     or nullif(btrim(p_surname), '') is null
     or nullif(btrim(p_student_id), '') is null
     or p_student_id !~ '^[0-9]{7,}$'
     or nullif(btrim(p_program), '') is null
     or lower(btrim(coalesce(p_year_level, ''))) <> '1st year'
     or nullif(btrim(p_phone), '') is null
     or regexp_replace(btrim(p_phone), '[^0-9+]', '', 'g')
       !~ '^(09[0-9]{9}|\+639[0-9]{9})$'
     or nullif(btrim(p_contact_email), '') is null
     or btrim(p_contact_email) !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Complete the required student information before requesting an ID exception.'
      using errcode = '22023';
  end if;

  select *
  into v_request
  from public.student_id_exception_requests
  where student_id = v_student_id
  for update;

  if found then
    if v_request.status = 'pending' then
      return v_request;
    end if;

    raise exception 'This ID exception request is no longer pending.'
      using errcode = '22023';
  end if;

  insert into public.student_id_exception_requests (student_id)
  values (v_student_id)
  returning * into v_request;

  update public.profiles
  set
    first_name = btrim(p_first_name),
    middle_initial = btrim(coalesce(p_middle_initial, '')),
    surname = btrim(p_surname),
    student_id = btrim(p_student_id),
    program = btrim(p_program),
    year_level = btrim(p_year_level),
    section = btrim(coalesce(p_section, '')),
    phone = btrim(p_phone),
    contact_email = btrim(p_contact_email)
  where id = v_student_id;

  return v_request;
end;
$$;

create or replace function public.approve_student_id_exception(
  p_student_id uuid
)
returns public.student_id_exception_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles%rowtype;
  v_request public.student_id_exception_requests%rowtype;
  v_approved_at timestamptz;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only administrators can approve ID exception requests.'
      using errcode = '42501';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = p_student_id
  for update;

  if not found
     or v_profile.role <> 'student'
     or lower(btrim(coalesce(v_profile.year_level, ''))) <> '1st year' then
    raise exception 'This student is not eligible for an ID exception approval.'
      using errcode = '22023';
  end if;

  if nullif(btrim(v_profile.first_name), '') is null
     or nullif(btrim(v_profile.surname), '') is null
     or nullif(btrim(v_profile.student_id), '') is null
     or v_profile.student_id !~ '^[0-9]{7,}$'
     or nullif(btrim(v_profile.program), '') is null
     or nullif(btrim(v_profile.phone), '') is null
     or regexp_replace(btrim(v_profile.phone), '[^0-9+]', '', 'g')
       !~ '^(09[0-9]{9}|\+639[0-9]{9})$'
     or nullif(btrim(v_profile.contact_email), '') is null
     or btrim(v_profile.contact_email)
       !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Complete student profile information is required before approval.'
      using errcode = '22023';
  end if;

  select *
  into v_request
  from public.student_id_exception_requests
  where student_id = p_student_id
  for update;

  if not found or v_request.status <> 'pending' then
    raise exception 'The ID exception request is no longer pending.'
      using errcode = '22023';
  end if;

  if nullif(btrim(v_profile.id_photo_url), '') is not null then
    raise exception 'An ID photo is already on file; the exception request cannot be approved.'
      using errcode = '22023';
  end if;

  v_approved_at := clock_timestamp();

  update public.student_id_exception_requests
  set
    status = 'temporarily_approved',
    approved_by = auth.uid(),
    approved_at = v_approved_at,
    attendance_eligible_from = v_approved_at
  where student_id = p_student_id
  returning * into v_request;

  return v_request;
end;
$$;

create or replace function public.acknowledge_student_id_exception()
returns public.student_id_exception_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_request public.student_id_exception_requests%rowtype;
begin
  if v_student_id is null then
    raise exception 'Sign in before continuing.'
      using errcode = '42501';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = v_student_id
  for update;

  if not found or v_profile.role <> 'student' then
    raise exception 'Only student accounts can continue from this screen.'
      using errcode = '42501';
  end if;

  select *
  into v_request
  from public.student_id_exception_requests
  where student_id = v_student_id
  for update;

  if not found or v_request.status <> 'temporarily_approved' then
    raise exception 'There is no approved ID exception to continue from.'
      using errcode = '22023';
  end if;

  update public.student_id_exception_requests
  set continued_at = coalesce(continued_at, clock_timestamp())
  where student_id = v_student_id
  returning * into v_request;

  return v_request;
end;
$$;

create or replace function public.resolve_pending_id_exception_by_photo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.id_photo_url is not null
     and nullif(btrim(new.id_photo_url), '') is not null
     and nullif(btrim(old.id_photo_url), '') is null then
    update public.student_id_exception_requests
    set
      status = 'resolved_by_photo',
      attendance_eligible_from = clock_timestamp()
    where student_id = new.id
      and status = 'pending';
  end if;

  return new;
end;
$$;

create trigger profiles_resolve_pending_id_exception_by_photo
  after update of id_photo_url on public.profiles
  for each row execute function public.resolve_pending_id_exception_by_photo();

create or replace function public.event_session_starts_at(
  p_event_date date,
  p_session_start time
)
returns timestamptz
language sql
stable
set search_path = public
as $$
  select case
    when p_event_date is null or p_session_start is null then null
    else (p_event_date + p_session_start) at time zone 'Asia/Manila'
  end;
$$;

create or replace function public.reconcile_attendance_fine()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  calculated_amount numeric(10,2);
  existing_fine_id uuid;
  v_exception_status text;
  v_eligible_from timestamptz;
  v_event_date date;
  v_session_start time;
begin
  select f.id
  into existing_fine_id
  from public.fines f
  where f.attendance_scan_id = new.id
  limit 1;

  if new.status in ('absent', 'late')
     and coalesce(new.fine_policy_enabled, false) then
    select
      request.status,
      request.attendance_eligible_from,
      event.event_date,
      case
        when new.session_label = 'afternoon' then event.afternoon_start
        when coalesce(event.multi_session, false) then event.morning_start
        else coalesce(event.morning_start, event.start_time)
      end
    into
      v_exception_status,
      v_eligible_from,
      v_event_date,
      v_session_start
    from public.student_id_exception_requests request
    left join public.events event on event.id = new.event_id
    where request.student_id = new.student_id;

    if found and (
      v_exception_status = 'pending'
      or v_eligible_from is null
      or public.event_session_starts_at(v_event_date, v_session_start) is null
      or public.event_session_starts_at(v_event_date, v_session_start)
        < v_eligible_from
    ) then
      return new;
    end if;

    calculated_amount := public.event_session_fine_amount(
      new.event_id,
      new.session_label,
      new.status
    );

    if coalesce(calculated_amount, 0) > 0 then
      if existing_fine_id is null then
        insert into public.fines (
          student_id,
          event_id,
          attendance_scan_id,
          session_label,
          amount,
          reason,
          status
        ) values (
          new.student_id,
          new.event_id,
          new.id,
          new.session_label,
          calculated_amount,
          case when new.status = 'late' then 'Late attendance' else 'Absent attendance' end,
          'unpaid'
        );
      else
        update public.fines
        set
          student_id = new.student_id,
          event_id = new.event_id,
          session_label = new.session_label,
          amount = calculated_amount,
          reason = case when new.status = 'late' then 'Late attendance' else 'Absent attendance' end,
          status = case when status = 'excused' then 'excused' else 'unpaid' end
        where id = existing_fine_id
          and status <> 'paid';
      end if;
    elsif existing_fine_id is not null then
      delete from public.fines
      where id = existing_fine_id
        and status = 'unpaid';
    end if;
  elsif new.status not in ('absent', 'late')
        and existing_fine_id is not null then
    -- Preserve paid and excused history; clear only unpaid fines.
    delete from public.fines
    where id = existing_fine_id
      and status = 'unpaid';
  end if;

  return new;
end;
$$;

create or replace function public.materialize_student_inferred_absences(
  p_student_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inserted integer := 0;
  v_profile public.profiles%rowtype;
  v_request public.student_id_exception_requests%rowtype;
  v_has_exception boolean := false;
begin
  select *
  into v_profile
  from public.profiles
  where id = p_student_id;

  if not found or v_profile.role <> 'student' then
    return 0;
  end if;

  if nullif(trim(coalesce(v_profile.program, '')), '') is null then
    return 0;
  end if;

  select *
  into v_request
  from public.student_id_exception_requests
  where student_id = p_student_id;

  v_has_exception := found;
  if v_has_exception and v_request.status = 'pending' then
    return 0;
  end if;

  insert into public.attendance_scans (
    event_id,
    student_id,
    session_label,
    status,
    scan_in_at,
    scanned_by
  )
  select
    event_row.id,
    v_profile.id,
    sessions.session_label,
    'absent'::public.attendance_status,
    null,
    null
  from public.events as event_row
  cross join lateral (
    values
      (
        'morning'::text,
        case
          when coalesce(event_row.multi_session, false)
            then event_row.morning_start
          else coalesce(event_row.morning_start, event_row.start_time)
        end,
        case
          when coalesce(event_row.multi_session, false)
            then event_row.morning_end
          else coalesce(event_row.morning_end, event_row.end_time)
        end
      ),
      ('afternoon'::text, event_row.afternoon_start, event_row.afternoon_end)
  ) as sessions(session_label, session_start, session_end)
  where public.event_session_has_ended(event_row.event_date, sessions.session_end)
    and coalesce(event_row.status, '') not in ('upcoming', 'cancelled')
    and (
      (coalesce(event_row.multi_session, false) = false
        and sessions.session_label = 'morning')
      or coalesce(event_row.multi_session, false) = true
    )
    and public.event_program_matches(event_row.program, v_profile.program)
    and (
      not v_has_exception
      or (
        v_request.status in ('temporarily_approved', 'resolved_by_photo')
        and v_request.attendance_eligible_from is not null
        and public.event_session_starts_at(
          event_row.event_date,
          sessions.session_start
        ) >= v_request.attendance_eligible_from
      )
    )
    and not exists (
      select 1
      from public.attendance_scans as existing_scan
      where existing_scan.event_id = event_row.id
        and existing_scan.student_id = v_profile.id
        and existing_scan.session_label = sessions.session_label
    )
  on conflict (event_id, student_id, session_label) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

create or replace function public.materialize_event_inferred_absences(
  p_event_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inserted integer := 0;
  v_event public.events%rowtype;
begin
  select *
  into v_event
  from public.events
  where id = p_event_id;

  if not found
     or coalesce(v_event.status, '') in ('upcoming', 'cancelled') then
    return 0;
  end if;

  insert into public.attendance_scans (
    event_id,
    student_id,
    session_label,
    status,
    scan_in_at,
    scanned_by
  )
  select
    v_event.id,
    profile.id,
    sessions.session_label,
    'absent'::public.attendance_status,
    null,
    null
  from public.profiles as profile
  cross join lateral (
    values
      (
        'morning'::text,
        case
          when coalesce(v_event.multi_session, false)
            then v_event.morning_start
          else coalesce(v_event.morning_start, v_event.start_time)
        end,
        case
          when coalesce(v_event.multi_session, false)
            then v_event.morning_end
          else coalesce(v_event.morning_end, v_event.end_time)
        end
      ),
      ('afternoon'::text, v_event.afternoon_start, v_event.afternoon_end)
  ) as sessions(session_label, session_start, session_end)
  left join public.student_id_exception_requests request
    on request.student_id = profile.id
  where profile.role = 'student'
    and nullif(trim(coalesce(profile.program, '')), '') is not null
    and public.event_session_has_ended(v_event.event_date, sessions.session_end)
    and public.event_program_matches(v_event.program, profile.program)
    and (
      request.student_id is null
      or (
        request.status in ('temporarily_approved', 'resolved_by_photo')
        and request.attendance_eligible_from is not null
        and public.event_session_starts_at(
          v_event.event_date,
          sessions.session_start
        ) >= request.attendance_eligible_from
      )
    )
    and (
      (coalesce(v_event.multi_session, false) = false
        and sessions.session_label = 'morning')
      or coalesce(v_event.multi_session, false) = true
    )
    and not exists (
      select 1
      from public.attendance_scans as existing_scan
      where existing_scan.event_id = v_event.id
        and existing_scan.student_id = profile.id
        and existing_scan.session_label = sessions.session_label
    )
  on conflict (event_id, student_id, session_label) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

create or replace function public.get_admin_report_aggregates(
  p_date_from date default null,
  p_date_to date default null,
  p_event_offset integer default 0,
  p_event_limit integer default 5
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $$
declare
  v_fines_enabled boolean := public.is_fines_enabled();
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Administrator access is required.'
      using errcode = '42501';
  end if;

  if p_date_from is not null
     and p_date_to is not null
     and p_date_from > p_date_to then
    raise exception 'The report start date must not be after the end date.'
      using errcode = '22023';
  end if;

  if p_event_offset < 0 or p_event_limit < 1 or p_event_limit > 50 then
    raise exception 'Invalid event pagination values.'
      using errcode = '22023';
  end if;

  return (
    with filtered_events as materialized (
      select
        event.id,
        event.event_date,
        event.status,
        event.program,
        event.multi_session,
        event.start_time,
        event.sanctions_enabled,
        event.end_time,
        event.morning_start,
        event.morning_end,
        event.afternoon_start,
        event.afternoon_end,
        event.absent_fine,
        event.late_fine,
        event.morning_absent_fine,
        event.morning_late_fine,
        event.afternoon_absent_fine,
        event.afternoon_late_fine
      from public.events event
      where event.status <> 'upcoming'
        and (p_date_from is null or event.event_date >= p_date_from)
        and (p_date_to is null or event.event_date <= p_date_to)
    ),
    paged_events as materialized (
      select event.id
      from filtered_events event
      order by event.event_date desc, event.id asc
      offset p_event_offset
      limit p_event_limit
    ),
    completed_sessions as materialized (
      select
        event.id as event_id,
        event.event_date,
        event.program as event_program,
        event.sanctions_enabled,
        event.absent_fine,
        event.late_fine,
        event.morning_absent_fine,
        event.morning_late_fine,
        event.afternoon_absent_fine,
        event.afternoon_late_fine,
        session.session_label,
        session.session_start,
        session.session_end
      from filtered_events event
      cross join lateral (
        values
          (
            'morning'::text,
            case
              when coalesce(event.multi_session, false)
                then event.morning_start
              else coalesce(event.morning_start, event.start_time)
            end,
            case
              when coalesce(event.multi_session, false)
                then event.morning_end
              else coalesce(event.morning_end, event.end_time)
            end
          ),
          ('afternoon'::text, event.afternoon_start, event.afternoon_end)
      ) as session(session_label, session_start, session_end)
      where coalesce(event.status::text, '') not in ('upcoming', 'cancelled')
        and (
          (not coalesce(event.multi_session, false)
            and session.session_label = 'morning')
          or coalesce(event.multi_session, false)
        )
        and (
          event.event_date < timezone('Asia/Manila', now())::date
          or (
            session.session_end is not null
            and ((event.event_date + session.session_end)
              at time zone 'Asia/Manila') <= now()
          )
        )
    ),
    report_records as materialized (
      select
        session.event_id,
        session.session_label,
        profile.id as student_id,
        coalesce(nullif(profile.program, ''), 'Unassigned') as program_label,
        coalesce(scan.status::text, 'no_record') as record_status,
        scan.scan_in_at,
        case
          when request.student_id is null then true
          when request.status = 'pending' then false
          when request.status in ('temporarily_approved', 'resolved_by_photo')
               and request.attendance_eligible_from is not null then
            public.event_session_starts_at(
              session.event_date,
              session.session_start
            ) >= request.attendance_eligible_from
          else false
        end as is_attendance_eligible,
        coalesce(excuse.is_excused, false) as is_excused,
        coalesce(session.sanctions_enabled, false) as sanctions_enabled,
        coalesce(linked_fine.id, session_fine.id) as fine_id,
        case
          when linked_fine.id is not null then linked_fine.amount
          else session_fine.amount
        end as fine_amount,
        case
          when linked_fine.id is not null then linked_fine.status::text
          else session_fine.status::text
        end as fine_status,
        case
          when coalesce(excuse.is_excused, false) then 0::numeric
          when coalesce(linked_fine.id, session_fine.id) is not null then
            case
              when case
                when linked_fine.id is not null then linked_fine.status::text
                else session_fine.status::text
              end = 'unpaid' then
                case
                  when linked_fine.id is not null then coalesce(linked_fine.amount, 0)
                  else coalesce(session_fine.amount, 0)
                end
              else 0::numeric
            end
          when v_fines_enabled and
               (request.student_id is null or (
                 request.status in ('temporarily_approved', 'resolved_by_photo')
                 and request.attendance_eligible_from is not null
                 and public.event_session_starts_at(
                   session.event_date,
                   session.session_start
                 ) >= request.attendance_eligible_from
               )) then
            case
              when scan.status::text = 'late' then
                coalesce(
                  case
                    when session.session_label = 'morning'
                      then session.morning_late_fine
                    else session.afternoon_late_fine
                  end,
                  session.late_fine,
                  0
                )
              when coalesce(scan.status::text, 'no_record') in ('absent', 'no_record') then
                coalesce(
                  case
                    when session.session_label = 'morning'
                      then session.morning_absent_fine
                    else session.afternoon_absent_fine
                  end,
                  session.absent_fine,
                  0
                )
              else 0::numeric
            end
          else 0::numeric
        end as counted_fine,
        (
          not coalesce(excuse.is_excused, false)
          and coalesce(session.sanctions_enabled, false)
          and (
            request.student_id is null
            or (
              request.status in ('temporarily_approved', 'resolved_by_photo')
              and request.attendance_eligible_from is not null
              and public.event_session_starts_at(
                session.event_date,
                session.session_start
              ) >= request.attendance_eligible_from
            )
          )
          and coalesce(scan.status::text, 'no_record') in ('late', 'absent')
        ) as is_sanctioned
      from completed_sessions session
      join public.profiles profile
        on profile.role = 'student'
        and (
          session.event_program is null
          or session.event_program = ''
          or session.event_program = 'All Programs'
          or public.event_program_matches(session.event_program, profile.program)
        )
      left join public.attendance_scans scan
        on scan.event_id = session.event_id
        and scan.student_id = profile.id
        and scan.session_label = session.session_label
      left join public.student_id_exception_requests request
        on request.student_id = profile.id
      left join lateral (
        select fine.id, fine.amount, fine.status
        from public.fines fine
        where fine.attendance_scan_id = scan.id
        order by fine.id desc
        limit 1
      ) linked_fine on true
      left join lateral (
        select fine.id, fine.amount, fine.status
        from public.fines fine
        where fine.event_id = session.event_id
          and fine.session_label = session.session_label
          and fine.student_id = profile.id
        order by fine.id desc
        limit 1
      ) session_fine on linked_fine.id is null
      left join lateral (
        select true as is_excused
        from public.excuse_requests request
        where request.student_id = profile.id
          and request.event_id = session.event_id
          and request.session_label = session.session_label
          and request.status = 'approved'
        limit 1
      ) excuse on true
    ),
    student_programs as (
      select coalesce(nullif(profile.program, ''), 'Unassigned') as label
      from public.profiles profile
      where profile.role = 'student'
      group by coalesce(nullif(profile.program, ''), 'Unassigned')
    ),
    session_program_aggregates as (
      select
        record.program_label as label,
        count(*) filter (
          where not record.is_excused
            and (record.record_status <> 'no_record'
              or record.is_attendance_eligible)
        ) as total,
        count(*) filter (
          where record.record_status in ('present', 'late')
            and record.scan_in_at is not null
        ) as present,
        count(*) filter (
          where not record.is_excused
            and (
              record.record_status = 'absent'
              or (record.record_status = 'no_record'
                and record.is_attendance_eligible)
            )
        ) as absent,
        count(*) filter (where record.is_excused) as excused,
        count(*) filter (where record.record_status = 'late') as late,
        count(*) filter (where record.is_sanctioned) as sanctioned,
        count(*) filter (
          where record.is_sanctioned and record.record_status = 'late'
        ) as sanctioned_late,
        count(*) filter (
          where record.is_sanctioned and record.record_status = 'absent'
        ) as sanctioned_absent
      from report_records record
      group by record.program_label
    ),
    student_fine_aggregates as (
      select
        coalesce(nullif(profile.program, ''), 'Unassigned') as label,
        coalesce(sum(fine.amount), 0) as fine_total
      from public.fines fine
      join filtered_events event on event.id = fine.event_id
      join public.profiles profile
        on profile.id = fine.student_id
        and profile.role = 'student'
      group by coalesce(nullif(profile.program, ''), 'Unassigned')
    ),
    program_aggregates as (
      select
        program.label,
        coalesce(sessions.total, 0) as total,
        coalesce(sessions.present, 0) as present,
        coalesce(sessions.absent, 0) as absent,
        coalesce(sessions.excused, 0) as excused,
        coalesce(sessions.late, 0) as late,
        coalesce(fines.fine_total, 0) as fine_total,
        coalesce(sessions.sanctioned, 0) as sanctioned,
        coalesce(sessions.sanctioned_late, 0) as sanctioned_late,
        coalesce(sessions.sanctioned_absent, 0) as sanctioned_absent
      from student_programs program
      left join session_program_aggregates sessions using (label)
      left join student_fine_aggregates fines using (label)
    ),
    page_event_aggregates as (
      select
        record.event_id,
        count(*) filter (
          where record.record_status in ('present', 'late')
            and record.scan_in_at is not null
        ) as report_attended_sessions,
        count(*) filter (
          where not record.is_excused
            and (
              record.record_status = 'absent'
              or (record.record_status = 'no_record'
                and record.is_attendance_eligible)
            )
        ) as report_absent_sessions,
        count(*) filter (where record.is_excused) as report_excused_sessions,
        count(*) filter (where record.record_status = 'late') as report_late_sessions,
        count(*) filter (where record.is_sanctioned) as report_sanctioned_sessions
      from report_records record
      join paged_events page_event on page_event.id = record.event_id
      group by record.event_id
    ),
    page_attendees as (
      select scan.event_id, count(distinct scan.student_id) as attendees
      from public.attendance_scans scan
      join paged_events page_event on page_event.id = scan.event_id
      where scan.status in ('present', 'late')
        and scan.scan_in_at is not null
      group by scan.event_id
    ),
    page_fines as (
      select fine.event_id, coalesce(sum(fine.amount), 0) as report_fine_total
      from public.fines fine
      join paged_events page_event on page_event.id = fine.event_id
      group by fine.event_id
    ),
    fee_aggregate as (
      select
        count(fine.id) as fine_count,
        coalesce(sum(fine.amount), 0) as assessed,
        coalesce(sum(fine.amount) filter (where fine.status = 'paid'), 0) as collected,
        coalesce(sum(fine.amount) filter (where fine.status = 'unpaid'), 0) as outstanding,
        coalesce(sum(fine.amount) filter (where fine.status = 'excused'), 0) as waived
      from public.fines fine
      join filtered_events event on event.id = fine.event_id
    )
    select jsonb_build_object(
      'program_stats', coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'label', aggregate.label,
              'present', aggregate.present,
              'total', aggregate.total,
              'rate', case
                when aggregate.total > 0
                  then round(aggregate.present::numeric / aggregate.total * 100)::integer
                else 0
              end,
              'absent', aggregate.absent,
              'excused', aggregate.excused,
              'late', aggregate.late,
              'fine_total', aggregate.fine_total,
              'sanctioned', aggregate.sanctioned,
              'sanctioned_late', aggregate.sanctioned_late,
              'sanctioned_absent', aggregate.sanctioned_absent
            )
            order by aggregate.total desc
          )
          from program_aggregates aggregate
        ),
        '[]'::jsonb
      ),
      'fee_summary', (
        select jsonb_build_object(
          'fine_count', fee.fine_count,
          'assessed', fee.assessed,
          'collected', fee.collected,
          'outstanding', fee.outstanding,
          'waived', fee.waived
        )
        from fee_aggregate fee
      ),
      'event_stats', coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'event_id', event.id,
              'attendees', coalesce(attendee.attendees, 0),
              'report_attended_sessions', coalesce(metrics.report_attended_sessions, 0),
              'report_absent_sessions', coalesce(metrics.report_absent_sessions, 0),
              'report_excused_sessions', coalesce(metrics.report_excused_sessions, 0),
              'report_late_sessions', coalesce(metrics.report_late_sessions, 0),
              'report_sanctioned_sessions', coalesce(metrics.report_sanctioned_sessions, 0),
              'report_fine_total', coalesce(fines.report_fine_total, 0)
            )
            order by event.event_date desc, event.id asc
          )
          from filtered_events event
          join paged_events page_event on page_event.id = event.id
          left join page_event_aggregates metrics on metrics.event_id = event.id
          left join page_attendees attendee on attendee.event_id = event.id
          left join page_fines fines on fines.event_id = event.id
        ),
        '[]'::jsonb
      )
    )
  );
end;
$$;

revoke all on function public.submit_student_id_exception(
  text, text, text, text, text, text, text, text, text
) from public, anon, authenticated, service_role;
grant execute on function public.submit_student_id_exception(
  text, text, text, text, text, text, text, text, text
) to authenticated;

revoke all on function public.approve_student_id_exception(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.approve_student_id_exception(uuid)
  to authenticated;

revoke all on function public.acknowledge_student_id_exception()
  from public, anon, authenticated, service_role;
grant execute on function public.acknowledge_student_id_exception()
  to authenticated;

revoke all on function public.resolve_pending_id_exception_by_photo()
  from public, anon, authenticated, service_role;

revoke all on function public.reconcile_attendance_fine()
  from public, anon, authenticated, service_role;
revoke all on function public.materialize_student_inferred_absences(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.materialize_event_inferred_absences(uuid)
  from public, anon, authenticated, service_role;

revoke all on function public.event_session_starts_at(date, time)
  from public, anon, authenticated, service_role;
grant execute on function public.event_session_starts_at(date, time)
  to authenticated;

revoke all on function public.event_program_matches(text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.event_program_matches(text, text)
  to authenticated;

revoke all on function public.get_admin_report_aggregates(date, date, integer, integer)
  from public, anon, service_role;
grant execute on function public.get_admin_report_aggregates(date, date, integer, integer)
  to authenticated;

notify pgrst, 'reload schema';

commit;
