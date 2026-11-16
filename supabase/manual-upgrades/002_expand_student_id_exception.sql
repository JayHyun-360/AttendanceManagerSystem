-- Manual, forward-only upgrade from the already-applied 001 ID exception
-- upgrade. Do not run on a fresh project or replay this file.
-- Inspect the live database with 002_expand_student_id_exception_inspect.sql
-- and back it up before applying this upgrade.

begin;

do $$
declare
  v_student_id_attnum smallint;
  v_profile_id_attnum smallint;
  v_photo_attnum smallint;
  v_required_column text;
  v_required_table text;
begin
  if to_regclass('public.student_id_exception_requests') is null then
    raise exception 'The 001 student ID exception upgrade is missing; inspect the live database before proceeding.';
  end if;

  lock table public.student_id_exception_requests in access exclusive mode;

  if to_regclass('public.profiles') is null
     or to_regclass('public.attendance_scans') is null
     or to_regclass('public.events') is null
     or to_regclass('public.fines') is null
     or to_regclass('public.excuse_requests') is null
     or to_regclass('public.system_settings') is null
     or to_regclass('public.programs') is null then
    raise exception 'Required profile, attendance, event, fine, excuse, settings, or program tables are missing.';
  end if;

  foreach v_required_column in array array[
    'student_id_exception_requests.student_id',
    'student_id_exception_requests.status',
    'student_id_exception_requests.requested_at',
    'student_id_exception_requests.approved_by',
    'student_id_exception_requests.approved_at',
    'student_id_exception_requests.attendance_eligible_from',
    'student_id_exception_requests.continued_at',
    'profiles.id',
    'profiles.middle_initial',
    'profiles.section',
    'profiles.id_photo_url',
    'profiles.role',
    'profiles.first_name',
    'profiles.surname',
    'profiles.student_id',
    'profiles.program',
    'profiles.year_level',
    'profiles.phone',
    'profiles.contact_email',
    'events.status',
    'events.program',
    'events.event_date',
    'events.start_time',
    'events.end_time',
    'events.morning_start',
    'events.morning_end',
    'events.afternoon_start',
    'events.afternoon_end',
    'events.multi_session',
    'events.sanctions_enabled',
    'events.absent_fine',
    'events.late_fine',
    'events.morning_absent_fine',
    'events.morning_late_fine',
    'events.afternoon_absent_fine',
    'events.afternoon_late_fine',
    'attendance_scans.id',
    'attendance_scans.event_id',
    'attendance_scans.student_id',
    'attendance_scans.scanned_by',
    'attendance_scans.session_label',
    'attendance_scans.status',
    'attendance_scans.scan_in_at',
    'attendance_scans.fine_policy_enabled',
    'fines.id',
    'fines.event_id',
    'fines.student_id',
    'fines.session_label',
    'fines.amount',
    'fines.reason',
    'fines.status',
    'fines.attendance_scan_id',
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
    v_required_table := split_part(v_required_column, '.', 1);
    if not exists (
      select 1
      from information_schema.columns column_info
      where column_info.table_schema = 'public'
        and column_info.table_name = v_required_table
        and column_info.column_name =
          split_part(v_required_column, '.', 2)
    ) then
      raise exception 'Required deployed column public.% is missing.',
        v_required_column;
    end if;
  end loop;

  if exists (
    select 1
    from (
      values
        ('student_id_exception_requests', 'student_id', 'uuid'),
        ('student_id_exception_requests', 'status', 'text'),
        ('student_id_exception_requests', 'requested_at', 'timestamp with time zone'),
        ('student_id_exception_requests', 'approved_by', 'uuid'),
        ('student_id_exception_requests', 'approved_at', 'timestamp with time zone'),
        ('student_id_exception_requests', 'attendance_eligible_from', 'timestamp with time zone'),
        ('student_id_exception_requests', 'continued_at', 'timestamp with time zone'),
        ('profiles', 'id', 'uuid'),
        ('profiles', 'middle_initial', 'text'),
        ('profiles', 'section', 'text'),
        ('profiles', 'id_photo_url', 'text'),
        ('profiles', 'role', 'USER-DEFINED'),
        ('profiles', 'first_name', 'text'),
        ('profiles', 'surname', 'text'),
        ('profiles', 'student_id', 'text'),
        ('profiles', 'program', 'text'),
        ('profiles', 'year_level', 'text'),
        ('profiles', 'phone', 'text'),
        ('profiles', 'contact_email', 'text'),
        ('events', 'status', 'text'),
        ('events', 'program', 'text'),
        ('events', 'event_date', 'date'),
        ('events', 'start_time', 'time without time zone'),
        ('events', 'end_time', 'time without time zone'),
        ('events', 'morning_start', 'time without time zone'),
        ('events', 'morning_end', 'time without time zone'),
        ('events', 'afternoon_start', 'time without time zone'),
        ('events', 'afternoon_end', 'time without time zone'),
        ('events', 'multi_session', 'boolean'),
        ('events', 'sanctions_enabled', 'boolean'),
        ('events', 'absent_fine', 'numeric'),
        ('events', 'late_fine', 'numeric'),
        ('events', 'morning_absent_fine', 'numeric'),
        ('events', 'morning_late_fine', 'numeric'),
        ('events', 'afternoon_absent_fine', 'numeric'),
        ('events', 'afternoon_late_fine', 'numeric'),
        ('attendance_scans', 'id', 'uuid'),
        ('attendance_scans', 'event_id', 'uuid'),
        ('attendance_scans', 'student_id', 'uuid'),
        ('attendance_scans', 'scanned_by', 'uuid'),
        ('attendance_scans', 'session_label', 'text'),
        ('attendance_scans', 'status', 'USER-DEFINED'),
        ('attendance_scans', 'scan_in_at', 'timestamp with time zone'),
        ('attendance_scans', 'fine_policy_enabled', 'boolean'),
        ('fines', 'id', 'uuid'),
        ('fines', 'event_id', 'uuid'),
        ('fines', 'student_id', 'uuid'),
        ('fines', 'session_label', 'text'),
        ('fines', 'amount', 'numeric'),
        ('fines', 'reason', 'text'),
        ('fines', 'status', 'USER-DEFINED'),
        ('fines', 'attendance_scan_id', 'uuid'),
        ('excuse_requests', 'session_label', 'text'),
        ('excuse_requests', 'status', 'USER-DEFINED'),
        ('excuse_requests', 'student_id', 'uuid'),
        ('excuse_requests', 'event_id', 'uuid'),
        ('system_settings', 'id', 'integer'),
        ('system_settings', 'settings', 'jsonb'),
        ('programs', 'name', 'text'),
        ('programs', 'legacy_aliases', 'ARRAY'),
        ('programs', 'active', 'boolean')
    ) as expected(table_name, column_name, data_type)
    left join information_schema.columns actual
      on actual.table_schema = 'public'
      and actual.table_name = expected.table_name
      and actual.column_name = expected.column_name
    where actual.data_type is distinct from expected.data_type
  ) then
    raise exception 'One or more deployed exception/attendance columns have unexpected types.';
  end if;

  if not exists (
    select 1
    from information_schema.columns column_info
    where column_info.table_schema = 'public'
      and column_info.table_name = 'profiles'
      and column_info.column_name = 'role'
      and column_info.udt_schema = 'public'
      and column_info.udt_name = 'user_role'
  ) or not exists (
    select 1
    from information_schema.columns column_info
    where column_info.table_schema = 'public'
      and column_info.table_name = 'attendance_scans'
      and column_info.column_name = 'status'
      and column_info.udt_schema = 'public'
      and column_info.udt_name = 'attendance_status'
  ) or not exists (
    select 1
    from information_schema.columns column_info
    where column_info.table_schema = 'public'
      and column_info.table_name = 'fines'
      and column_info.column_name = 'status'
      and column_info.udt_schema = 'public'
      and column_info.udt_name = 'fine_status'
  ) then
    raise exception 'One or more deployed enum columns do not match the upgrade 001 schema.';
  end if;

  if not exists (
    select 1
    from information_schema.columns column_info
    where column_info.table_schema = 'public'
      and column_info.table_name = 'excuse_requests'
      and column_info.column_name = 'status'
      and column_info.udt_schema = 'public'
      and column_info.udt_name = 'excuse_status'
  ) then
    raise exception 'excuse_requests.status is not public.excuse_status.';
  end if;

  if not exists (
    select 1
    from pg_constraint constraint_info
    where constraint_info.conrelid = 'public.attendance_scans'::regclass
      and constraint_info.conname =
        'attendance_scans_event_student_session_unique'
      and constraint_info.contype = 'u'
  ) then
    raise exception 'The attendance event/student/session uniqueness constraint is missing.';
  end if;

  if not exists (
    select 1
    from information_schema.columns column_info
    where column_info.table_schema = 'public'
      and column_info.table_name = 'student_id_exception_requests'
      and column_info.column_name = 'status'
      and column_info.column_default like '%pending%'
  ) or not exists (
    select 1
    from information_schema.columns column_info
    where column_info.table_schema = 'public'
      and column_info.table_name = 'student_id_exception_requests'
      and column_info.column_name = 'requested_at'
      and column_info.column_default is not null
  ) then
    raise exception 'The request status/requested_at defaults do not match upgrade 001.';
  end if;

  if exists (
    select 1
    from information_schema.columns column_info
    where column_info.table_schema = 'public'
      and column_info.table_name = 'student_id_exception_requests'
      and column_info.column_name in ('status', 'requested_at')
      and column_info.is_nullable <> 'NO'
  ) or exists (
    select 1
    from public.student_id_exception_requests request
    where request.status is null
       or request.requested_at is null
  ) then
    raise exception 'Request status and requested_at must be NOT NULL with no NULL rows.';
  end if;

  if exists (
    select 1
    from information_schema.columns column_info
    where column_info.table_schema = 'public'
      and column_info.table_name = 'student_id_exception_requests'
      and column_info.column_name in (
        'request_id', 'reason', 'explanation', 'rejected_by', 'rejected_at',
        'continued_by'
      )
  ) then
    raise exception 'One or more 002 columns already exist; inspect the database and do not rerun this upgrade.';
  end if;

  if to_regclass(
       'public.student_id_exception_one_pending_per_student_uidx'
     ) is not null
     or to_regclass(
       'public.student_id_exception_one_approved_per_student_uidx'
     ) is not null
     or to_regclass(
       'public.student_id_exception_student_latest_idx'
     ) is not null then
    raise exception 'One or more 002 request indexes already exist; inspect the database and do not rerun this upgrade.';
  end if;

  select attribute_info.attnum
  into v_student_id_attnum
  from pg_attribute attribute_info
  where attribute_info.attrelid =
    'public.student_id_exception_requests'::regclass
    and attribute_info.attname = 'student_id'
    and not attribute_info.attisdropped;

  if v_student_id_attnum is null
     or not exists (
       select 1
       from pg_constraint constraint_info
       where constraint_info.conrelid =
         'public.student_id_exception_requests'::regclass
         and constraint_info.contype = 'p'
         and constraint_info.conname =
           'student_id_exception_requests_pkey'
         and cardinality(constraint_info.conkey) = 1
         and constraint_info.conkey[1] = v_student_id_attnum
     ) then
    raise exception 'The request table primary key is not the expected student_id key from upgrade 001.';
  end if;

  if not exists (
    select 1
    from pg_constraint constraint_info
    where constraint_info.conrelid =
      'public.student_id_exception_requests'::regclass
      and constraint_info.conname =
        'student_id_exception_request_state_check'
      and constraint_info.contype = 'c'
  ) or not exists (
    select 1
    from pg_constraint constraint_info
    where constraint_info.conrelid =
      'public.student_id_exception_requests'::regclass
      and constraint_info.conname =
        'student_id_exception_requests_status_check'
      and constraint_info.contype = 'c'
  ) then
    raise exception 'The expected 001 request status/state constraints are missing.';
  end if;

  if exists (
    select 1
    from pg_constraint constraint_info
    where constraint_info.conrelid =
      'public.student_id_exception_requests'::regclass
      and (
        (
          constraint_info.conname =
            'student_id_exception_requests_status_check'
          and (
            position(
              'pending' in lower(pg_get_constraintdef(constraint_info.oid))
            ) = 0
            or position(
              'temporarily_approved'
              in lower(pg_get_constraintdef(constraint_info.oid))
            ) = 0
            or position(
              'resolved_by_photo'
              in lower(pg_get_constraintdef(constraint_info.oid))
            ) = 0
          )
        )
        or (
          constraint_info.conname =
            'student_id_exception_request_state_check'
          and (
            position(
              'attendance_eligible_from'
              in lower(pg_get_constraintdef(constraint_info.oid))
            ) = 0
            or position(
              'continued_at'
              in lower(pg_get_constraintdef(constraint_info.oid))
            ) = 0
          )
        )
      )
  ) then
    raise exception 'The existing status/state constraint definitions do not match upgrade 001.';
  end if;

  if exists (
    select 1
    from public.student_id_exception_requests request
    where request.status not in (
      'pending', 'temporarily_approved', 'resolved_by_photo'
    )
  ) then
    raise exception 'Existing requests contain a status outside the 001 workflow; inspect the data before upgrading.';
  end if;

  select attribute_info.attnum
  into v_profile_id_attnum
  from pg_attribute attribute_info
  where attribute_info.attrelid = 'public.profiles'::regclass
    and attribute_info.attname = 'id'
    and not attribute_info.attisdropped;

  if v_profile_id_attnum is null
     or not exists (
    select 1
    from pg_constraint constraint_info
    where constraint_info.conrelid =
      'public.student_id_exception_requests'::regclass
      and constraint_info.contype = 'f'
      and constraint_info.confrelid = 'public.profiles'::regclass
      and constraint_info.conkey = array[v_student_id_attnum]::smallint[]
      and constraint_info.confkey =
        array[v_profile_id_attnum]::smallint[]
  ) then
    raise exception 'The request student_id foreign key must reference exactly public.profiles(id).';
  end if;

  if exists (
    select 1
    from pg_constraint constraint_info
    where constraint_info.contype = 'f'
      and constraint_info.confrelid =
        'public.student_id_exception_requests'::regclass
  ) then
    raise exception 'Unexpected incoming foreign keys reference student_id_exception_requests; resolve them before changing its primary key.';
  end if;

  if not exists (
    select 1
    from pg_class relation_info
    where relation_info.oid =
      'public.student_id_exception_requests'::regclass
      and relation_info.relrowsecurity
      and not relation_info.relforcerowsecurity
  ) or not exists (
    select 1
    from pg_policy policy_info
    where policy_info.polrelid =
      'public.student_id_exception_requests'::regclass
      and policy_info.polname =
        'student_id_exception_requests_select_owner_or_admin'
      and policy_info.polcmd = 'r'
      and cardinality(policy_info.polroles) = 1
      and policy_info.polroles = array[
        (select role_info.oid from pg_roles role_info
         where role_info.rolname = 'authenticated')
      ]::oid[]
      and policy_info.polpermissive
      and policy_info.polwithcheck is null
      and policy_info.polqual is not null
      and position(
        'auth.uid()' in pg_get_expr(policy_info.polqual, policy_info.polrelid)
      ) > 0
      and position(
        'is_admin' in pg_get_expr(policy_info.polqual, policy_info.polrelid)
      ) > 0
  ) then
    raise exception 'The expected owner/admin SELECT policy or RLS settings do not match upgrade 001.';
  end if;

  if exists (
    select 1
    from pg_policy policy_info
    where policy_info.polrelid =
      'public.student_id_exception_requests'::regclass
      and policy_info.polcmd <> 'r'
  ) then
    raise exception 'Unexpected write-capable request-table RLS policies exist.';
  end if;

  if (
    select count(*)
    from pg_policy policy_info
    where policy_info.polrelid =
      'public.student_id_exception_requests'::regclass
  ) <> 1 then
    raise exception 'The request table must have exactly the single owner/admin SELECT policy from upgrade 001.';
  end if;

  if not has_table_privilege(
       'authenticated',
       'public.student_id_exception_requests',
       'SELECT'
     )
     or has_table_privilege(
       'authenticated',
       'public.student_id_exception_requests',
       'INSERT'
     )
     or has_table_privilege(
       'authenticated',
       'public.student_id_exception_requests',
       'UPDATE'
     )
     or has_table_privilege(
       'authenticated',
       'public.student_id_exception_requests',
       'DELETE'
     )
     or has_table_privilege(
       'authenticated',
       'public.student_id_exception_requests',
       'TRUNCATE'
     )
     or has_table_privilege(
       'authenticated',
       'public.student_id_exception_requests',
       'REFERENCES'
     )
     or has_table_privilege(
       'authenticated',
       'public.student_id_exception_requests',
       'TRIGGER'
     )
     or has_table_privilege(
       'anon',
       'public.student_id_exception_requests',
       'SELECT'
     )
     or has_table_privilege(
       'anon',
       'public.student_id_exception_requests',
       'INSERT'
     )
     or has_table_privilege(
       'anon',
       'public.student_id_exception_requests',
       'UPDATE'
     )
     or has_table_privilege(
       'anon',
       'public.student_id_exception_requests',
       'DELETE'
     )
     or has_table_privilege(
       'anon',
       'public.student_id_exception_requests',
       'TRUNCATE'
     )
     or has_table_privilege(
       'anon',
       'public.student_id_exception_requests',
       'REFERENCES'
     )
     or has_table_privilege(
       'anon',
       'public.student_id_exception_requests',
       'TRIGGER'
     )
     or has_table_privilege(
       'service_role',
       'public.student_id_exception_requests',
       'SELECT'
     )
     or has_table_privilege(
       'service_role',
       'public.student_id_exception_requests',
       'INSERT'
     )
     or has_table_privilege(
       'service_role',
       'public.student_id_exception_requests',
       'UPDATE'
     )
     or has_table_privilege(
       'service_role',
       'public.student_id_exception_requests',
       'DELETE'
     )
     or has_table_privilege(
       'service_role',
       'public.student_id_exception_requests',
       'TRUNCATE'
     )
     or has_table_privilege(
       'service_role',
       'public.student_id_exception_requests',
       'REFERENCES'
     )
     or has_table_privilege(
       'service_role',
       'public.student_id_exception_requests',
       'TRIGGER'
     ) then
    raise exception 'The request table privileges do not match the protected 001 grant; direct writes must remain unavailable.';
  end if;

  if to_regprocedure(
       'public.submit_student_id_exception(text,text,text,text,text,text,text,text,text)'
     ) is null
     or to_regprocedure('public.approve_student_id_exception(uuid)') is null
     or to_regprocedure('public.acknowledge_student_id_exception()') is null
     or to_regprocedure(
       'public.resolve_pending_id_exception_by_photo()'
     ) is null
     or to_regprocedure('public.event_session_starts_at(date,time)') is null
     or to_regprocedure('public.is_admin()') is null
     or to_regprocedure('public.is_fines_enabled()') is null
     or to_regprocedure('public.event_session_has_ended(date,time)') is null
     or to_regprocedure(
       'public.event_session_fine_amount(uuid,text,public.attendance_status)'
     ) is null
     or to_regprocedure('public.event_program_matches(text,text)') is null
     or to_regprocedure(
       'public.materialize_student_absences_after_profile_change()'
     ) is null
     or to_regprocedure(
       'public.materialize_event_absences_after_change()'
     ) is null
     or to_regprocedure('public.capture_attendance_fine_policy()') is null
     or to_regprocedure(
       'public.guard_attendance_scan_event_status()'
     ) is null
     or to_regprocedure(
       'public.materialize_student_inferred_absences(uuid)'
     ) is null
     or to_regprocedure(
       'public.materialize_event_inferred_absences(uuid)'
     ) is null
     or to_regprocedure('public.reconcile_attendance_fine()') is null
     or to_regprocedure(
       'public.get_admin_report_aggregates(date,date,integer,integer)'
     ) is null then
    raise exception 'One or more expected 001 RPCs, trigger routines, or updated attendance/report routines are missing.';
  end if;

  if (
    select pg_get_function_result(
      'public.get_admin_report_aggregates(date,date,integer,integer)'::regprocedure
    )
  ) <> 'jsonb'
     or position(
       'student_id_exception_requests' in lower(pg_get_functiondef(
         'public.get_admin_report_aggregates(date,date,integer,integer)'::regprocedure
       ))
     ) = 0 then
    raise exception 'The installed report routine does not match the expected 001 exception-aware contract.';
  end if;

  if to_regprocedure(
       'public.reject_student_id_exception(uuid)'
     ) is not null
     or to_regprocedure(
       'public.submit_student_id_exception(text,text,text,text,text,text,text,text,text,text,text)'
     ) is not null
     or to_regprocedure(
       'public.acknowledge_student_id_exception(uuid)'
     ) is not null
     or to_regprocedure(
       'public.guard_attendance_scan_student_eligibility()'
     ) is not null then
    raise exception 'A 002 RPC or attendance eligibility guard already exists; inspect the database and do not rerun this upgrade.';
  end if;

  if to_regprocedure(
       'public.submit_student_id_exception_request(text,text)'
     ) is not null
     or to_regprocedure(
       'public.approve_student_id_exception_request(uuid)'
     ) is not null
     or to_regprocedure(
       'public.reject_student_id_exception_request(uuid)'
     ) is not null
     or to_regprocedure(
       'public.acknowledge_student_id_exception_request(uuid)'
     ) is not null
     or to_regprocedure(
       'public.get_student_id_exception_request_history(uuid)'
     ) is not null
     or to_regprocedure(
       'public.get_my_student_id_exception_access_state()'
     ) is not null
     or to_regprocedure(
       'public.student_id_exception_is_eligible_for_session(uuid,timestamp with time zone)'
     ) is not null
     or to_regprocedure(
       'public.student_id_exception_has_acknowledged_approval(uuid)'
     ) is not null
     or to_regprocedure(
       'public.student_id_exception_request_is_latest(uuid,uuid)'
     ) is not null then
    raise exception 'One or more request-history API objects already exist; inspect the database and do not rerun this upgrade.';
  end if;

  if not (
       select function_info.prosecdef
       from pg_proc function_info
       where function_info.oid = to_regprocedure(
         'public.submit_student_id_exception(text,text,text,text,text,text,text,text,text)'
       )
     )
     or not (
       select function_info.prosecdef
       from pg_proc function_info
       where function_info.oid =
         to_regprocedure('public.approve_student_id_exception(uuid)')
     )
     or not (
       select function_info.prosecdef
       from pg_proc function_info
       where function_info.oid =
         to_regprocedure('public.acknowledge_student_id_exception()')
     ) then
    raise exception 'One or more 001 request RPCs are not SECURITY DEFINER.';
  end if;

  if position(
       '1st year' in lower(pg_get_functiondef(
         'public.submit_student_id_exception(text,text,text,text,text,text,text,text,text)'::regprocedure
       ))
     ) = 0
     or position(
       '1st year' in lower(pg_get_functiondef(
         'public.approve_student_id_exception(uuid)'::regprocedure
       ))
     ) = 0 then
    raise exception 'The installed submission/approval RPC definitions do not match the 001 first-year implementation.';
  end if;

  if not has_function_privilege(
       'authenticated',
       'public.submit_student_id_exception(text,text,text,text,text,text,text,text,text)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'authenticated',
       'public.approve_student_id_exception(uuid)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'authenticated',
       'public.acknowledge_student_id_exception()',
       'EXECUTE'
     )
     or has_function_privilege(
       'anon',
       'public.submit_student_id_exception(text,text,text,text,text,text,text,text,text)',
       'EXECUTE'
     )
     or has_function_privilege(
       'service_role',
       'public.submit_student_id_exception(text,text,text,text,text,text,text,text,text)',
       'EXECUTE'
     )
     or has_function_privilege(
       'anon',
       'public.approve_student_id_exception(uuid)',
       'EXECUTE'
     )
     or has_function_privilege(
       'service_role',
       'public.approve_student_id_exception(uuid)',
       'EXECUTE'
     )
     or has_function_privilege(
       'anon',
       'public.acknowledge_student_id_exception()',
       'EXECUTE'
     )
     or has_function_privilege(
       'service_role',
       'public.acknowledge_student_id_exception()',
       'EXECUTE'
     ) then
    raise exception 'Authenticated execution grants for the 001 request RPCs are missing.';
  end if;

  select attribute_info.attnum
  into v_photo_attnum
  from pg_attribute attribute_info
  where attribute_info.attrelid = 'public.profiles'::regclass
    and attribute_info.attname = 'id_photo_url'
    and not attribute_info.attisdropped;

  if v_photo_attnum is null
     or not exists (
       select 1
       from pg_trigger trigger_info
       where trigger_info.tgrelid = 'public.profiles'::regclass
         and trigger_info.tgname =
           'profiles_resolve_pending_id_exception_by_photo'
         and not trigger_info.tgisinternal
         and trigger_info.tgenabled <> 'D'
         and trigger_info.tgtype = 17
         and trigger_info.tgfoid = to_regprocedure(
           'public.resolve_pending_id_exception_by_photo()'
         )
         and trigger_info.tgattr::smallint[] @>
           array[v_photo_attnum]::smallint[]
     ) then
    raise exception 'The enabled 001 AFTER UPDATE OF id_photo_url resolution trigger is missing or unexpected.';
  end if;

  if position(
       'resolved_by_photo' in lower(pg_get_functiondef(
         'public.resolve_pending_id_exception_by_photo()'::regprocedure
       ))
     ) = 0
     or position(
       'pending' in lower(pg_get_functiondef(
         'public.resolve_pending_id_exception_by_photo()'::regprocedure
       ))
     ) = 0 then
    raise exception 'The installed photo-resolution trigger function does not match the 001 pending-only behavior.';
  end if;

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
        ),
        (
          'public.attendance_scans'::regclass,
          'attendance_scans_require_active_event_insert'::text,
          'public.guard_attendance_scan_event_status()'::regprocedure::oid,
          7,
          null::text[]
        ),
        (
          'public.attendance_scans'::regclass,
          'attendance_scans_require_active_event_update'::text,
          'public.guard_attendance_scan_event_status()'::regprocedure::oid,
          19,
          array['event_id']::text[]
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
    raise exception 'The expected 001 attendance triggers are missing or have unexpected bindings.';
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
          and trigger_info.tgname in (
            'attendance_scans_reconcile_fine',
            'attendance_scans_capture_fine_policy',
            'attendance_scans_guard_student_eligibility'
          )
        )
      )
  ) then
    raise exception 'Unexpected legacy attendance trigger names were found.';
  end if;
end;
$$;

create temporary table student_id_exception_upgrade_002_snapshot
on commit drop
as
select
  student_id,
  status,
  requested_at,
  approved_by,
  approved_at,
  attendance_eligible_from,
  continued_at
from public.student_id_exception_requests;

alter table public.student_id_exception_requests
  add column request_id uuid;

update public.student_id_exception_requests
set request_id = gen_random_uuid()
where request_id is null;

alter table public.student_id_exception_requests
  alter column request_id set default gen_random_uuid(),
  alter column request_id set not null;

alter table public.student_id_exception_requests
  add column reason text,
  add column explanation text,
  add column rejected_by uuid,
  add column rejected_at timestamptz,
  add column continued_by uuid;

alter table public.student_id_exception_requests
  drop constraint student_id_exception_requests_pkey,
  drop constraint student_id_exception_requests_status_check,
  drop constraint student_id_exception_request_state_check;

alter table public.student_id_exception_requests
  add constraint student_id_exception_requests_pkey
    primary key (request_id),
  add constraint student_id_exception_requests_status_check
    check (
      status in (
        'pending', 'approved', 'temporarily_approved', 'rejected',
        'resolved_by_photo'
      )
    ),
  add constraint student_id_exception_reason_check
    check (
      reason is null or reason in (
        'awaiting_initial_id',
        'transferee_awaiting_id',
        'lost_id',
        'damaged_id',
        'replacement_processing',
        'other'
      )
    ),
  add constraint student_id_exception_other_explanation_check
    check (
      reason is distinct from 'other'
      or nullif(btrim(explanation), '') is not null
    ),
  add constraint student_id_exception_request_state_check
    check (
      (
        status = 'pending'
        and approved_by is null
        and approved_at is null
        and attendance_eligible_from is null
        and continued_at is null
        and continued_by is null
        and rejected_by is null
        and rejected_at is null
      )
      or (
        status in ('approved', 'temporarily_approved')
        and approved_by is not null
        and approved_at is not null
        and attendance_eligible_from = approved_at
        and (continued_at is null or continued_at >= approved_at)
        and (continued_by is null or continued_at is not null)
        and rejected_by is null
        and rejected_at is null
      )
      or (
        status = 'rejected'
        and approved_by is null
        and approved_at is null
        and attendance_eligible_from is null
        and continued_at is null
        and continued_by is null
        and rejected_by is not null
        and rejected_at is not null
      )
      or (
        status = 'resolved_by_photo'
        and approved_by is null
        and approved_at is null
        and attendance_eligible_from is not null
        and continued_at is null
        and continued_by is null
        and rejected_by is null
        and rejected_at is null
      )
    );

create unique index student_id_exception_one_pending_per_student_uidx
  on public.student_id_exception_requests (student_id)
  where status = 'pending';

create unique index student_id_exception_one_approved_per_student_uidx
  on public.student_id_exception_requests (student_id)
  where status in ('approved', 'temporarily_approved');

create index student_id_exception_student_latest_idx
  on public.student_id_exception_requests (
    student_id,
    requested_at desc,
    request_id desc
  );

create function public.submit_student_id_exception_request(
  p_reason text,
  p_explanation text
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

  if not found or v_profile.role is distinct from 'student' then
    raise exception 'Only student accounts can submit an ID exception request.'
      using errcode = '42501';
  end if;

  if nullif(btrim(v_profile.id_photo_url), '') is not null then
    raise exception 'An ID photo is already on file.'
      using errcode = '22023';
  end if;

  if nullif(btrim(v_profile.first_name), '') is null
     or nullif(btrim(v_profile.surname), '') is null
     or nullif(btrim(v_profile.student_id), '') is null
     or v_profile.student_id !~ '^[0-9]{7,}$'
     or nullif(btrim(v_profile.program), '') is null
     or nullif(btrim(v_profile.year_level), '') is null
     or nullif(btrim(v_profile.phone), '') is null
     or regexp_replace(btrim(v_profile.phone), '[^0-9+]', '', 'g')
       !~ '^(09[0-9]{9}|\+639[0-9]{9})$'
     or nullif(btrim(v_profile.contact_email), '') is null
     or btrim(v_profile.contact_email)
       !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or p_reason is null
     or p_reason not in (
       'awaiting_initial_id',
       'transferee_awaiting_id',
       'lost_id',
       'damaged_id',
       'replacement_processing',
       'other'
     )
     or (
       p_reason = 'other'
       and nullif(btrim(p_explanation), '') is null
     ) then
    raise exception 'Complete the required student profile and provide a valid ID exception reason.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.student_id_exception_requests request
    where request.student_id = v_student_id
      and request.status = 'pending'
  ) then
    raise exception 'A pending ID exception request already exists.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.student_id_exception_requests request
    where request.student_id = v_student_id
      and request.status in ('approved', 'temporarily_approved')
  ) then
    raise exception 'An approved ID exception cannot be resubmitted.'
      using errcode = '22023';
  end if;

  insert into public.student_id_exception_requests (
    student_id,
    reason,
    explanation
  )
  values (
    v_student_id,
    p_reason,
    case when p_reason = 'other' then btrim(p_explanation) else null end
  )
  returning * into v_request;

  return v_request;
end;
$$;

create function public.approve_student_id_exception_request(
  p_request_id uuid
)
returns public.student_id_exception_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student_id uuid;
  v_profile public.profiles%rowtype;
  v_request public.student_id_exception_requests%rowtype;
  v_approved_at timestamptz;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only administrators can approve ID exception requests.'
      using errcode = '42501';
  end if;

  select request.student_id
  into v_student_id
  from public.student_id_exception_requests request
  where request.request_id = p_request_id;

  if not found then
    raise exception 'The ID exception request was not found.'
      using errcode = '22023';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = v_student_id
  for update;

  if not found or v_profile.role is distinct from 'student' then
    raise exception 'This student is not eligible for an ID exception approval.'
      using errcode = '22023';
  end if;

  select *
  into v_request
  from public.student_id_exception_requests
  where request_id = p_request_id
    and student_id = v_student_id
  for update;

  if not found or v_request.status <> 'pending' then
    raise exception 'The ID exception request is no longer pending.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.student_id_exception_requests request
    where request.student_id = v_student_id
      and request.status in ('approved', 'temporarily_approved')
      and request.request_id <> p_request_id
  ) then
    raise exception 'This student already has an approved ID exception.'
      using errcode = '22023';
  end if;

  if nullif(btrim(v_profile.id_photo_url), '') is not null then
    raise exception 'An ID photo is already on file; the exception request cannot be approved.'
      using errcode = '22023';
  end if;

  if nullif(btrim(v_profile.first_name), '') is null
     or nullif(btrim(v_profile.surname), '') is null
     or nullif(btrim(v_profile.student_id), '') is null
     or v_profile.student_id !~ '^[0-9]{7,}$'
     or nullif(btrim(v_profile.program), '') is null
     or nullif(btrim(v_profile.year_level), '') is null
     or nullif(btrim(v_profile.phone), '') is null
     or regexp_replace(btrim(v_profile.phone), '[^0-9+]', '', 'g')
       !~ '^(09[0-9]{9}|\+639[0-9]{9})$'
     or nullif(btrim(v_profile.contact_email), '') is null
     or btrim(v_profile.contact_email)
       !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Complete student profile information is required before approval.'
      using errcode = '22023';
  end if;

  v_approved_at := clock_timestamp();

  update public.student_id_exception_requests
  set
    status = 'approved',
    approved_by = auth.uid(),
    approved_at = v_approved_at,
    attendance_eligible_from = v_approved_at
  where request_id = p_request_id
    and status = 'pending'
  returning * into v_request;

  return v_request;
end;
$$;

create function public.reject_student_id_exception_request(
  p_request_id uuid
)
returns public.student_id_exception_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student_id uuid;
  v_profile public.profiles%rowtype;
  v_request public.student_id_exception_requests%rowtype;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only administrators can reject ID exception requests.'
      using errcode = '42501';
  end if;

  select request.student_id
  into v_student_id
  from public.student_id_exception_requests request
  where request.request_id = p_request_id;

  if not found then
    raise exception 'The ID exception request was not found.'
      using errcode = '22023';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = v_student_id
  for update;

  if not found or v_profile.role is distinct from 'student' then
    raise exception 'This student is not eligible for an ID exception decision.'
      using errcode = '22023';
  end if;

  select *
  into v_request
  from public.student_id_exception_requests
  where request_id = p_request_id
    and student_id = v_student_id
  for update;

  if not found or v_request.status <> 'pending' then
    raise exception 'The ID exception request is no longer pending.'
      using errcode = '22023';
  end if;

  if nullif(btrim(v_profile.id_photo_url), '') is not null then
    raise exception 'An ID photo is already on file; the request was resolved.'
      using errcode = '22023';
  end if;

  update public.student_id_exception_requests
  set
    status = 'rejected',
    rejected_by = auth.uid(),
    rejected_at = clock_timestamp()
  where request_id = p_request_id
    and status = 'pending'
  returning * into v_request;

  return v_request;
end;
$$;

create function public.acknowledge_student_id_exception_request(
  p_request_id uuid
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
    raise exception 'Sign in before continuing.'
      using errcode = '42501';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = v_student_id
  for update;

  if not found or v_profile.role is distinct from 'student' then
    raise exception 'Only student accounts can continue from this screen.'
      using errcode = '42501';
  end if;

  select *
  into v_request
  from public.student_id_exception_requests
  where request_id = p_request_id
    and student_id = v_student_id
  for update;

  if not found
     or v_request.status not in ('approved', 'temporarily_approved') then
    raise exception 'There is no approved ID exception to continue from.'
      using errcode = '22023';
  end if;

  if v_request.continued_at is null then
    update public.student_id_exception_requests
    set
      continued_at = clock_timestamp(),
      continued_by = v_student_id
    where request_id = p_request_id
      and continued_at is null
    returning * into v_request;

    perform public.materialize_student_inferred_absences(v_student_id);
  end if;

  return v_request;
end;
$$;

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
begin
  raise exception 'This client must be upgraded before submitting an ID exception request.'
    using errcode = '0A000';
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
  v_request_id uuid;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only administrators can approve ID exception requests.'
      using errcode = '42501';
  end if;

  select request.request_id
  into v_request_id
  from public.student_id_exception_requests request
  where request.student_id = p_student_id
    and request.status = 'pending'
  order by request.requested_at desc, request.request_id desc
  limit 1;

  if not found then
    raise exception 'This student has no pending ID exception request.'
      using errcode = '22023';
  end if;

  return public.approve_student_id_exception_request(v_request_id);
end;
$$;

create or replace function public.acknowledge_student_id_exception()
returns public.student_id_exception_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in before continuing.'
      using errcode = '42501';
  end if;

  select request.request_id
  into v_request_id
  from public.student_id_exception_requests request
  where request.student_id = auth.uid()
    and request.status in ('approved', 'temporarily_approved')
    and request.continued_at is null
  order by request.approved_at desc, request.request_id desc
  limit 1;

  if not found then
    raise exception 'There is no unacknowledged approved ID exception.'
      using errcode = '22023';
  end if;

  return public.acknowledge_student_id_exception_request(v_request_id);
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

create function public.student_id_exception_is_eligible_for_session(
  p_student_id uuid,
  p_session_start timestamptz
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return p_session_start is not null
    and (
      auth.uid() = p_student_id
      or public.is_admin()
      or auth.role() = 'service_role'
    )
    and exists (
      select 1
      from public.student_id_exception_requests request
      where request.student_id = p_student_id
        and request.status in ('approved', 'temporarily_approved')
        and request.approved_at <= p_session_start
        and request.continued_at is not null
    );
end;
$$;

create function public.student_id_exception_has_acknowledged_approval(
  p_student_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return (
    auth.uid() = p_student_id
    or public.is_admin()
    or auth.role() = 'service_role'
  )
  and exists (
    select 1
    from public.student_id_exception_requests request
    where request.student_id = p_student_id
      and request.status in ('approved', 'temporarily_approved')
      and request.continued_at is not null
  );
end;
$$;

create function public.get_my_student_id_exception_access_state()
returns table (
  has_approved_exception boolean,
  has_unacknowledged_approval boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_student_id uuid := auth.uid();
begin
  if v_student_id is null then
    raise exception 'Sign in before checking ID exception status.'
      using errcode = '42501';
  end if;

  return query
  select
    exists (
      select 1
      from public.student_id_exception_requests request
      where request.student_id = v_student_id
        and request.status in ('approved', 'temporarily_approved')
    ),
    exists (
      select 1
      from public.student_id_exception_requests request
      where request.student_id = v_student_id
        and request.status in ('approved', 'temporarily_approved')
        and request.continued_at is null
    );
end;
$$;

create function public.get_student_id_exception_request_history(
  p_student_id uuid
)
returns setof public.student_id_exception_requests
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Administrator access is required.'
      using errcode = '42501';
  end if;

  return query
  select request.*
  from public.student_id_exception_requests request
  where request.student_id = p_student_id
  order by request.requested_at desc, request.request_id desc;
end;
$$;

create function public.student_id_exception_request_is_latest(
  p_student_id uuid,
  p_request_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (
      auth.uid() = p_student_id
      or public.is_admin()
      or auth.role() = 'service_role'
    )
    and exists (
      select 1
      from public.student_id_exception_requests request
      where request.student_id = p_student_id
        and request.request_id = p_request_id
        and request.request_id = (
          select latest.request_id
          from public.student_id_exception_requests latest
          where latest.student_id = p_student_id
          order by latest.requested_at desc, latest.request_id desc
          limit 1
        )
    );
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
  v_profile_eligible boolean;
  v_has_id_photo boolean;
  v_exception_eligible boolean;
  v_exception_status text;
  v_eligible_from timestamptz;
  v_session_start_at timestamptz;
begin
  select f.id
  into existing_fine_id
  from public.fines f
  where f.attendance_scan_id = new.id
  limit 1;

  select
      profile.role = 'student'
        and nullif(btrim(profile.first_name), '') is not null
        and nullif(btrim(profile.surname), '') is not null
        and nullif(btrim(profile.student_id), '') is not null
        and nullif(btrim(profile.program), '') is not null
        and nullif(btrim(profile.year_level), '') is not null
        and public.event_program_matches(event.program, profile.program),
      nullif(btrim(profile.id_photo_url), '') is not null,
      request.status,
      request.attendance_eligible_from,
      public.event_session_starts_at(
        event.event_date,
        case
          when new.session_label = 'afternoon' then event.afternoon_start
          when coalesce(event.multi_session, false) then event.morning_start
          else coalesce(event.morning_start, event.start_time)
        end
      )
    into
      v_profile_eligible,
      v_has_id_photo,
      v_exception_status,
      v_eligible_from,
      v_session_start_at
    from public.events event
    join public.profiles profile
      on profile.id = new.student_id
    left join lateral (
      select
        request.status,
        request.attendance_eligible_from,
        request.continued_at
      from public.student_id_exception_requests request
      where request.student_id = new.student_id
      order by request.requested_at desc, request.request_id desc
      limit 1
    ) request on true
    where event.id = new.event_id;

  if not found or not coalesce(v_profile_eligible, false) then
    return new;
  end if;

  v_exception_eligible :=
    public.student_id_exception_is_eligible_for_session(
      new.student_id,
      v_session_start_at
    );

  if not coalesce(v_has_id_photo, false)
     and not coalesce(v_exception_eligible, false) then
    return new;
  end if;

  if v_has_id_photo
     and v_exception_status = 'resolved_by_photo'
     and (
       v_eligible_from is null
       or v_session_start_at is null
       or v_session_start_at < v_eligible_from
     )
     and not coalesce(v_exception_eligible, false) then
    return new;
  end if;

  if new.status in ('absent', 'late')
     and coalesce(new.fine_policy_enabled, false) then
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
  v_has_id_photo boolean := false;
begin
  select *
  into v_profile
  from public.profiles
  where id = p_student_id;

  if not found or v_profile.role is distinct from 'student' then
    return 0;
  end if;

  if nullif(btrim(v_profile.first_name), '') is null
     or nullif(btrim(v_profile.surname), '') is null
     or nullif(btrim(v_profile.student_id), '') is null
     or nullif(btrim(v_profile.program), '') is null
     or nullif(btrim(v_profile.year_level), '') is null then
    return 0;
  end if;

  v_has_id_photo :=
    nullif(btrim(v_profile.id_photo_url), '') is not null;

  select *
  into v_request
  from public.student_id_exception_requests
  where student_id = p_student_id
  order by requested_at desc, request_id desc
  limit 1;

  if not v_has_id_photo
     and not exists (
       select 1
       from public.student_id_exception_requests request
       where request.student_id = p_student_id
         and request.status in ('approved', 'temporarily_approved')
         and request.continued_at is not null
     ) then
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
      (
        v_has_id_photo
        and (
          v_request.status is distinct from 'resolved_by_photo'
          or (
            v_request.attendance_eligible_from is not null
            and public.event_session_starts_at(
              event_row.event_date,
              sessions.session_start
            ) >= v_request.attendance_eligible_from
          )
        )
      )
      or (
        public.student_id_exception_is_eligible_for_session(
          p_student_id,
          public.event_session_starts_at(
            event_row.event_date,
            sessions.session_start
          )
        )
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
  left join lateral (
    select
      request.student_id,
      request.status,
      request.attendance_eligible_from,
      request.continued_at
    from public.student_id_exception_requests request
    where request.student_id = profile.id
    order by request.requested_at desc, request.request_id desc
    limit 1
  ) request on true
  where profile.role = 'student'
    and nullif(btrim(profile.first_name), '') is not null
    and nullif(btrim(profile.surname), '') is not null
    and nullif(btrim(profile.student_id), '') is not null
    and nullif(trim(coalesce(profile.program, '')), '') is not null
    and nullif(btrim(profile.year_level), '') is not null
    and (
      (
        nullif(btrim(profile.id_photo_url), '') is not null
        and (
          request.status is distinct from 'resolved_by_photo'
          or (
            request.attendance_eligible_from is not null
            and public.event_session_starts_at(
              v_event.event_date,
              sessions.session_start
            ) >= request.attendance_eligible_from
          )
        )
      )
      or (
        public.student_id_exception_is_eligible_for_session(
          profile.id,
          public.event_session_starts_at(
            v_event.event_date,
            sessions.session_start
          )
        )
      )
    )
    and public.event_session_has_ended(v_event.event_date, sessions.session_end)
    and public.event_program_matches(v_event.program, profile.program)
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
    eligible_profiles as materialized (
      select
        profile.id as student_id,
        profile.program as student_program,
        nullif(btrim(profile.id_photo_url), '') is not null as has_id_photo,
        request.status as exception_status,
        request.attendance_eligible_from
      from public.profiles profile
      left join lateral (
        select
          request.status,
          request.attendance_eligible_from,
          request.continued_at
        from public.student_id_exception_requests request
        where request.student_id = profile.id
        order by request.requested_at desc, request.request_id desc
        limit 1
      ) request on true
      where profile.role = 'student'
        and nullif(btrim(profile.first_name), '') is not null
        and nullif(btrim(profile.surname), '') is not null
        and nullif(btrim(profile.student_id), '') is not null
        and nullif(btrim(profile.program), '') is not null
        and nullif(btrim(profile.year_level), '') is not null
        and (
          nullif(btrim(profile.id_photo_url), '') is not null
          or public.student_id_exception_has_acknowledged_approval(
            profile.id
          )
        )
    ),
    eligible_sessions as materialized (
      select
        session.*,
        profile.student_id,
        profile.student_program,
        profile.exception_status,
        profile.attendance_eligible_from
      from completed_sessions session
      join eligible_profiles profile
        on (
          session.event_program is null
          or session.event_program = ''
          or session.event_program = 'All Programs'
          or public.event_program_matches(
            session.event_program,
            profile.student_program
          )
        )
      where (
        (
          profile.has_id_photo
          and (
            profile.exception_status is distinct from 'resolved_by_photo'
            or (
              profile.attendance_eligible_from is not null
              and public.event_session_starts_at(
                session.event_date,
                session.session_start
              ) >= profile.attendance_eligible_from
            )
          )
        )
        or (
          public.student_id_exception_is_eligible_for_session(
            profile.student_id,
            public.event_session_starts_at(
              session.event_date,
              session.session_start
            )
          )
        )
      )
    ),
    eligible_fines as materialized (
      select
        fine.id,
        fine.event_id,
        fine.student_id,
        fine.session_label,
        fine.amount,
        fine.status,
        profile.student_program
      from public.fines fine
      join filtered_events event on event.id = fine.event_id
      join eligible_profiles profile on profile.student_id = fine.student_id
      where (
        (
          profile.has_id_photo
          and (
            profile.exception_status is distinct from 'resolved_by_photo'
            or (
              profile.attendance_eligible_from is not null
              and public.event_session_starts_at(
                event.event_date,
                case
                  when fine.session_label = 'afternoon' then event.afternoon_start
                  when coalesce(event.multi_session, false) then event.morning_start
                  else coalesce(event.morning_start, event.start_time)
                end
              ) >= profile.attendance_eligible_from
            )
          )
        )
        or (
          public.student_id_exception_is_eligible_for_session(
            fine.student_id,
            public.event_session_starts_at(
              event.event_date,
              case
                when fine.session_label = 'afternoon' then event.afternoon_start
                when coalesce(event.multi_session, false) then event.morning_start
                else coalesce(event.morning_start, event.start_time)
              end
            )
          )
        )
      )
    ),
    report_records as materialized (
      select
        session.event_id,
        session.session_label,
        session.student_id,
        coalesce(nullif(session.student_program, ''), 'Unassigned') as program_label,
        coalesce(scan.status::text, 'no_record') as record_status,
        scan.scan_in_at,
        true as is_attendance_eligible,
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
          when v_fines_enabled then
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
          and coalesce(scan.status::text, 'no_record') in ('late', 'absent')
        ) as is_sanctioned
      from eligible_sessions session
      left join public.attendance_scans scan
        on scan.event_id = session.event_id
        and scan.student_id = session.student_id
        and scan.session_label = session.session_label
      left join lateral (
        select fine.id, fine.amount, fine.status
        from eligible_fines fine
        where fine.attendance_scan_id = scan.id
        order by fine.id desc
        limit 1
      ) linked_fine on true
      left join lateral (
        select fine.id, fine.amount, fine.status
        from eligible_fines fine
        where fine.event_id = session.event_id
          and fine.session_label = session.session_label
          and fine.student_id = session.student_id
        order by fine.id desc
        limit 1
      ) session_fine on linked_fine.id is null
      left join lateral (
        select true as is_excused
        from public.excuse_requests request
        where request.student_id = session.student_id
          and request.event_id = session.event_id
          and request.session_label = session.session_label
          and request.status = 'approved'
        limit 1
      ) excuse on true
    ),
    student_programs as (
      select coalesce(nullif(profile.student_program, ''), 'Unassigned') as label
      from eligible_profiles profile
      group by coalesce(nullif(profile.student_program, ''), 'Unassigned')
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
        coalesce(nullif(fine.student_program, ''), 'Unassigned') as label,
        coalesce(sum(fine.amount), 0) as fine_total
      from eligible_fines fine
      group by coalesce(nullif(fine.student_program, ''), 'Unassigned')
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
      select record.event_id, count(distinct record.student_id) as attendees
      from report_records record
      join paged_events page_event on page_event.id = record.event_id
      where record.record_status in ('present', 'late')
        and record.scan_in_at is not null
      group by record.event_id
    ),
    page_fines as (
      select fine.event_id, coalesce(sum(fine.amount), 0) as report_fine_total
      from eligible_fines fine
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
      from eligible_fines fine
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

drop policy student_id_exception_requests_select_owner_or_admin
  on public.student_id_exception_requests;

create policy student_id_exception_requests_select_owner_or_admin
  on public.student_id_exception_requests for select to authenticated
  using (
    public.student_id_exception_request_is_latest(student_id, request_id)
  );

revoke all on function public.submit_student_id_exception_request(text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.submit_student_id_exception_request(text, text)
  to authenticated;

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

revoke all on function public.approve_student_id_exception_request(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.approve_student_id_exception_request(uuid)
  to authenticated;

revoke all on function public.reject_student_id_exception_request(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.reject_student_id_exception_request(uuid)
  to authenticated;

revoke all on function public.acknowledge_student_id_exception()
  from public, anon, authenticated, service_role;
grant execute on function public.acknowledge_student_id_exception()
  to authenticated;

revoke all on function public.acknowledge_student_id_exception_request(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.acknowledge_student_id_exception_request(uuid)
  to authenticated;

revoke all on function public.get_my_student_id_exception_access_state()
  from public, anon, authenticated, service_role;
grant execute on function public.get_my_student_id_exception_access_state()
  to authenticated;

revoke all on function public.get_student_id_exception_request_history(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.get_student_id_exception_request_history(uuid)
  to authenticated;

revoke all on function public.student_id_exception_request_is_latest(uuid, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.student_id_exception_request_is_latest(uuid, uuid)
  to authenticated;

revoke all on function public.student_id_exception_is_eligible_for_session(
  uuid, timestamptz
) from public, anon, authenticated, service_role;
grant execute on function public.student_id_exception_is_eligible_for_session(
  uuid, timestamptz
) to authenticated;

revoke all on function public.student_id_exception_has_acknowledged_approval(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.student_id_exception_has_acknowledged_approval(uuid)
  to authenticated;

revoke all on function public.resolve_pending_id_exception_by_photo()
  from public, anon, authenticated, service_role;
revoke all on function public.reconcile_attendance_fine()
  from public, anon, authenticated, service_role;
revoke all on function public.materialize_student_inferred_absences(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.materialize_event_inferred_absences(uuid)
  from public, anon, authenticated, service_role;

do $$
declare
  v_student_id_attnum smallint;
  v_profile_id_attnum smallint;
  v_profile_photo_attnum smallint;
begin
  select attribute_info.attnum
  into v_student_id_attnum
  from pg_attribute attribute_info
  where attribute_info.attrelid =
    'public.student_id_exception_requests'::regclass
    and attribute_info.attname = 'student_id'
    and not attribute_info.attisdropped;

  select attribute_info.attnum
  into v_profile_id_attnum
  from pg_attribute attribute_info
  where attribute_info.attrelid = 'public.profiles'::regclass
    and attribute_info.attname = 'id'
    and not attribute_info.attisdropped;

  select attribute_info.attnum
  into v_profile_photo_attnum
  from pg_attribute attribute_info
  where attribute_info.attrelid = 'public.profiles'::regclass
    and attribute_info.attname = 'id_photo_url'
    and not attribute_info.attisdropped;

  if exists (
    select 1
    from public.student_id_exception_requests request
    where request.request_id is null
       or request.student_id is null
       or request.status is null
       or request.requested_at is null
       or request.status not in (
         'pending', 'approved', 'temporarily_approved', 'rejected',
         'resolved_by_photo'
       )
  ) then
    raise exception 'Post-upgrade request IDs, student IDs, timestamps, or statuses failed verification.';
  end if;

  if exists (
    (
      select
        student_id,
        status,
        requested_at,
        approved_by,
        approved_at,
        attendance_eligible_from,
        continued_at
      from pg_temp.student_id_exception_upgrade_002_snapshot
      except
      select
        student_id,
        status,
        requested_at,
        approved_by,
        approved_at,
        attendance_eligible_from,
        continued_at
      from public.student_id_exception_requests
    )
    union all
    (
      select
        student_id,
        status,
        requested_at,
        approved_by,
        approved_at,
        attendance_eligible_from,
        continued_at
      from public.student_id_exception_requests
      except
      select
        student_id,
        status,
        requested_at,
        approved_by,
        approved_at,
        attendance_eligible_from,
        continued_at
      from pg_temp.student_id_exception_upgrade_002_snapshot
    )
  ) then
    raise exception 'Existing request status, timestamp, actor, or eligibility history changed during upgrade 002.';
  end if;

  if exists (
    select 1
    from information_schema.columns column_info
    where column_info.table_schema = 'public'
      and column_info.table_name = 'student_id_exception_requests'
      and column_info.column_name in (
        'student_id', 'request_id', 'status', 'requested_at'
      )
      and column_info.is_nullable <> 'NO'
  ) then
    raise exception 'A required request identity/status/timestamp column is nullable after upgrade 002.';
  end if;

  if not exists (
    select 1
    from pg_constraint constraint_info
    where constraint_info.conrelid =
      'public.student_id_exception_requests'::regclass
      and constraint_info.contype = 'p'
      and constraint_info.conname =
        'student_id_exception_requests_pkey'
      and constraint_info.convalidated
      and cardinality(constraint_info.conkey) = 1
      and constraint_info.conkey[1] = (
        select attribute_info.attnum
        from pg_attribute attribute_info
        where attribute_info.attrelid =
          'public.student_id_exception_requests'::regclass
          and attribute_info.attname = 'request_id'
          and not attribute_info.attisdropped
      )
  ) then
    raise exception 'The request primary key is not exactly request_id.';
  end if;

  if v_student_id_attnum is null
     or v_profile_id_attnum is null
     or not exists (
       select 1
       from pg_constraint constraint_info
       where constraint_info.conrelid =
         'public.student_id_exception_requests'::regclass
         and constraint_info.contype = 'f'
         and constraint_info.convalidated
         and constraint_info.conkey =
           array[v_student_id_attnum]::smallint[]
         and constraint_info.confrelid = 'public.profiles'::regclass
         and constraint_info.confkey =
           array[v_profile_id_attnum]::smallint[]
     ) then
    raise exception 'The request student_id foreign key does not reference exactly public.profiles(id).';
  end if;

  if not exists (
    select 1
    from pg_class index_relation
    join pg_index index_info on index_info.indexrelid = index_relation.oid
    where index_relation.relnamespace = 'public'::regnamespace
      and index_relation.relname =
        'student_id_exception_one_pending_per_student_uidx'
      and index_info.indrelid =
        'public.student_id_exception_requests'::regclass
      and index_info.indisunique
      and index_info.indisvalid
      and index_info.indisready
      and index_info.indnkeyatts = 1
      and index_info.indnatts = 1
      and index_info.indkey[0] = v_student_id_attnum
      and regexp_replace(
        lower(pg_get_expr(index_info.indpred, index_info.indrelid)),
        '\s+',
        '',
        'g'
      ) = '(status=''pending''::text)'
  ) or not exists (
    select 1
    from pg_class index_relation
    join pg_index index_info on index_info.indexrelid = index_relation.oid
    where index_relation.relnamespace = 'public'::regnamespace
      and index_relation.relname =
        'student_id_exception_one_approved_per_student_uidx'
      and index_info.indrelid =
        'public.student_id_exception_requests'::regclass
      and index_info.indisunique
      and index_info.indisvalid
      and index_info.indisready
      and index_info.indnkeyatts = 1
      and index_info.indnatts = 1
      and index_info.indkey[0] = v_student_id_attnum
      and position(
        'approved'
        in lower(pg_get_expr(index_info.indpred, index_info.indrelid))
      ) > 0
      and position(
        'temporarily_approved'
        in lower(pg_get_expr(index_info.indpred, index_info.indrelid))
      ) > 0
  ) then
    raise exception 'The pending/approved request indexes do not have the required unique keys and predicates.';
  end if;

  if not exists (
    select 1
    from pg_constraint constraint_info
    where constraint_info.conrelid =
      'public.student_id_exception_requests'::regclass
      and constraint_info.conname =
        'student_id_exception_requests_status_check'
      and constraint_info.contype = 'c'
      and constraint_info.convalidated
      and position(
        'pending' in lower(pg_get_constraintdef(constraint_info.oid))
      ) > 0
      and position(
        'approved'
        in lower(pg_get_constraintdef(constraint_info.oid))
      ) > 0
      and position(
        'temporarily_approved'
        in lower(pg_get_constraintdef(constraint_info.oid))
      ) > 0
      and position(
        'rejected' in lower(pg_get_constraintdef(constraint_info.oid))
      ) > 0
      and position(
        'resolved_by_photo'
        in lower(pg_get_constraintdef(constraint_info.oid))
      ) > 0
  ) or not exists (
    select 1
    from pg_constraint constraint_info
    where constraint_info.conrelid =
      'public.student_id_exception_requests'::regclass
      and constraint_info.conname = 'student_id_exception_reason_check'
      and constraint_info.contype = 'c'
      and constraint_info.convalidated
      and position('reason' in lower(pg_get_constraintdef(constraint_info.oid))) > 0
      and position('reason is null' in lower(pg_get_constraintdef(constraint_info.oid))) > 0
      and position('awaiting_initial_id' in lower(pg_get_constraintdef(constraint_info.oid))) > 0
      and position('transferee_awaiting_id' in lower(pg_get_constraintdef(constraint_info.oid))) > 0
      and position('lost_id' in lower(pg_get_constraintdef(constraint_info.oid))) > 0
      and position('damaged_id' in lower(pg_get_constraintdef(constraint_info.oid))) > 0
      and position('replacement_processing' in lower(pg_get_constraintdef(constraint_info.oid))) > 0
      and position('other' in lower(pg_get_constraintdef(constraint_info.oid))) > 0
  ) or not exists (
    select 1
    from pg_constraint constraint_info
    where constraint_info.conrelid =
      'public.student_id_exception_requests'::regclass
      and constraint_info.conname =
        'student_id_exception_other_explanation_check'
      and constraint_info.contype = 'c'
      and constraint_info.convalidated
      and position('other' in lower(pg_get_constraintdef(constraint_info.oid))) > 0
      and position('explanation' in lower(pg_get_constraintdef(constraint_info.oid))) > 0
      and position('btrim' in lower(pg_get_constraintdef(constraint_info.oid))) > 0
      and position('is not null' in lower(pg_get_constraintdef(constraint_info.oid))) > 0
  ) or not exists (
    select 1
    from pg_constraint constraint_info
    where constraint_info.conrelid =
      'public.student_id_exception_requests'::regclass
      and constraint_info.conname =
        'student_id_exception_request_state_check'
      and constraint_info.contype = 'c'
      and constraint_info.convalidated
      and position('pending' in lower(pg_get_constraintdef(constraint_info.oid))) > 0
      and position('approved' in lower(pg_get_constraintdef(constraint_info.oid))) > 0
      and position('temporarily_approved' in lower(pg_get_constraintdef(constraint_info.oid))) > 0
      and position('rejected' in lower(pg_get_constraintdef(constraint_info.oid))) > 0
      and position('resolved_by_photo' in lower(pg_get_constraintdef(constraint_info.oid))) > 0
      and position('approved_by' in lower(pg_get_constraintdef(constraint_info.oid))) > 0
      and position('approved_at' in lower(pg_get_constraintdef(constraint_info.oid))) > 0
      and position('attendance_eligible_from' in lower(pg_get_constraintdef(constraint_info.oid))) > 0
      and position('continued_at' in lower(pg_get_constraintdef(constraint_info.oid))) > 0
      and position('continued_by' in lower(pg_get_constraintdef(constraint_info.oid))) > 0
      and position('rejected_by' in lower(pg_get_constraintdef(constraint_info.oid))) > 0
      and position('rejected_at' in lower(pg_get_constraintdef(constraint_info.oid))) > 0
      and position('approved_by is null' in lower(pg_get_constraintdef(constraint_info.oid))) > 0
      and position('approved_by is not null' in lower(pg_get_constraintdef(constraint_info.oid))) > 0
      and position('approved_at is null' in lower(pg_get_constraintdef(constraint_info.oid))) > 0
      and position('approved_at is not null' in lower(pg_get_constraintdef(constraint_info.oid))) > 0
      and position('attendance_eligible_from is null' in lower(pg_get_constraintdef(constraint_info.oid))) > 0
      and position('attendance_eligible_from is not null' in lower(pg_get_constraintdef(constraint_info.oid))) > 0
      and position('attendance_eligible_from = approved_at' in lower(pg_get_constraintdef(constraint_info.oid))) > 0
      and position('continued_at is null' in lower(pg_get_constraintdef(constraint_info.oid))) > 0
      and position('continued_at >= approved_at' in lower(pg_get_constraintdef(constraint_info.oid))) > 0
      and position('continued_by is null' in lower(pg_get_constraintdef(constraint_info.oid))) > 0
      and position('continued_at is not null' in lower(pg_get_constraintdef(constraint_info.oid))) > 0
      and position('rejected_by is null' in lower(pg_get_constraintdef(constraint_info.oid))) > 0
      and position('rejected_by is not null' in lower(pg_get_constraintdef(constraint_info.oid))) > 0
      and position('rejected_at is null' in lower(pg_get_constraintdef(constraint_info.oid))) > 0
      and position('rejected_at is not null' in lower(pg_get_constraintdef(constraint_info.oid))) > 0
  ) then
    raise exception 'The request status, reason, explanation, or state constraints failed post-upgrade verification.';
  end if;

  if not exists (
    select 1
    from pg_class relation_info
    where relation_info.oid =
      'public.student_id_exception_requests'::regclass
      and relation_info.relrowsecurity
      and not relation_info.relforcerowsecurity
  ) or not exists (
    select 1
    from pg_policy policy_info
    where policy_info.polrelid =
      'public.student_id_exception_requests'::regclass
      and policy_info.polname =
        'student_id_exception_requests_select_owner_or_admin'
      and policy_info.polcmd = 'r'
      and policy_info.polpermissive
      and policy_info.polwithcheck is null
      and policy_info.polqual is not null
      and cardinality(policy_info.polroles) = 1
      and policy_info.polroles = array[
        (select role_info.oid from pg_roles role_info
         where role_info.rolname = 'authenticated')
      ]::oid[]
      and position(
        'student_id_exception_request_is_latest'
        in pg_get_expr(policy_info.polqual, policy_info.polrelid)
      ) > 0
  ) or exists (
    select 1
    from pg_policy policy_info
    where policy_info.polrelid =
      'public.student_id_exception_requests'::regclass
      and policy_info.polcmd <> 'r'
  ) or (
    select count(*)
    from pg_policy policy_info
    where policy_info.polrelid =
      'public.student_id_exception_requests'::regclass
  ) <> 1 then
    raise exception 'Post-upgrade request-table RLS settings or policies are incorrect.';
  end if;

  if not has_table_privilege(
       'authenticated',
       'public.student_id_exception_requests',
       'SELECT'
     )
     or exists (
       select 1
       from (values
         ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'),
         ('REFERENCES'), ('TRIGGER')
       ) as denied_privileges(privilege_name)
       where has_table_privilege(
         'authenticated',
         'public.student_id_exception_requests',
         denied_privileges.privilege_name
       )
     )
     or exists (
       select 1
       from (values
         ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'),
         ('REFERENCES'), ('TRIGGER')
       ) as denied_privileges(privilege_name)
       where has_table_privilege(
         'anon',
         'public.student_id_exception_requests',
         denied_privileges.privilege_name
       )
     )
     or exists (
       select 1
       from (values
         ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'),
         ('REFERENCES'), ('TRIGGER')
       ) as denied_privileges(privilege_name)
       where has_table_privilege(
         'service_role',
         'public.student_id_exception_requests',
         denied_privileges.privilege_name
       )
     ) then
    raise exception 'Post-upgrade request-table privileges allow an unexpected direct access path.';
  end if;

  if to_regprocedure(
       'public.submit_student_id_exception(text,text,text,text,text,text,text,text,text)'
     ) is null
     or to_regprocedure('public.approve_student_id_exception(uuid)') is null
     or to_regprocedure('public.acknowledge_student_id_exception()') is null
     or to_regprocedure(
       'public.submit_student_id_exception(text,text,text,text,text,text,text,text,text,text,text)'
     ) is not null
     or to_regprocedure(
       'public.acknowledge_student_id_exception(uuid)'
     ) is not null then
    raise exception 'Legacy request RPC signatures were removed or conflicting signatures remain.';
  end if;

  if exists (
    select 1
    from (
      values
        ('public.submit_student_id_exception_request(text,text)'::regprocedure),
        ('public.approve_student_id_exception_request(uuid)'::regprocedure),
        ('public.reject_student_id_exception_request(uuid)'::regprocedure),
        ('public.acknowledge_student_id_exception_request(uuid)'::regprocedure),
        ('public.get_student_id_exception_request_history(uuid)'::regprocedure),
        ('public.get_my_student_id_exception_access_state()'::regprocedure)
    ) as expected(function_oid)
    join pg_proc function_info on function_info.oid = expected.function_oid
    where not function_info.prosecdef
       or not coalesce(
         function_info.proconfig @> array['search_path=""']::text[],
         false
       )
  ) then
    raise exception 'A request RPC is not SECURITY DEFINER with an empty search_path.';
  end if;

  if position(
       'auth.uid()' in lower(pg_get_functiondef(
         'public.submit_student_id_exception_request(text,text)'::regprocedure
       ))
     ) = 0
     or position(
       'p_reason' in lower(pg_get_functiondef(
         'public.submit_student_id_exception_request(text,text)'::regprocedure
       ))
     ) = 0
     or position(
       'is_admin' in lower(pg_get_functiondef(
         'public.approve_student_id_exception_request(uuid)'::regprocedure
       ))
     ) = 0
     or position(
       'p_request_id' in lower(pg_get_functiondef(
         'public.approve_student_id_exception_request(uuid)'::regprocedure
       ))
     ) = 0
     or position(
       'for update' in lower(pg_get_functiondef(
         'public.approve_student_id_exception_request(uuid)'::regprocedure
       ))
     ) = 0
     or position(
       'is_admin' in lower(pg_get_functiondef(
         'public.reject_student_id_exception_request(uuid)'::regprocedure
       ))
     ) = 0
     or position(
       'p_request_id' in lower(pg_get_functiondef(
         'public.reject_student_id_exception_request(uuid)'::regprocedure
       ))
     ) = 0
     or position(
       'for update' in lower(pg_get_functiondef(
         'public.reject_student_id_exception_request(uuid)'::regprocedure
       ))
     ) = 0
     or position(
       'auth.uid()' in lower(pg_get_functiondef(
         'public.acknowledge_student_id_exception_request(uuid)'::regprocedure
       ))
     ) = 0
     or position(
       'student_id = v_student_id' in lower(pg_get_functiondef(
         'public.acknowledge_student_id_exception_request(uuid)'::regprocedure
       ))
     ) = 0
     or position(
       'p_request_id' in lower(pg_get_functiondef(
         'public.acknowledge_student_id_exception_request(uuid)'::regprocedure
       ))
     ) = 0
     or position(
       'for update' in lower(pg_get_functiondef(
         'public.acknowledge_student_id_exception_request(uuid)'::regprocedure
       ))
     ) = 0 then
    raise exception 'Request RPC authorization, ownership, or row-lock checks failed post-upgrade verification.';
  end if;

  if not has_function_privilege(
       'authenticated',
       'public.submit_student_id_exception_request(text,text)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'authenticated',
       'public.submit_student_id_exception(text,text,text,text,text,text,text,text,text)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'authenticated',
       'public.approve_student_id_exception_request(uuid)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'authenticated',
       'public.reject_student_id_exception_request(uuid)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'authenticated',
       'public.acknowledge_student_id_exception_request(uuid)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'authenticated',
       'public.approve_student_id_exception(uuid)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'authenticated',
       'public.acknowledge_student_id_exception()',
       'EXECUTE'
     )
     or not has_function_privilege(
       'authenticated',
       'public.get_student_id_exception_request_history(uuid)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'authenticated',
       'public.get_my_student_id_exception_access_state()',
       'EXECUTE'
     )
     or has_function_privilege(
       'anon',
       'public.submit_student_id_exception_request(text,text)',
       'EXECUTE'
     )
     or has_function_privilege(
       'anon',
       'public.submit_student_id_exception(text,text,text,text,text,text,text,text,text)',
       'EXECUTE'
     )
     or has_function_privilege(
       'anon',
       'public.approve_student_id_exception_request(uuid)',
       'EXECUTE'
     )
     or has_function_privilege(
       'anon',
       'public.reject_student_id_exception_request(uuid)',
       'EXECUTE'
     )
     or has_function_privilege(
       'anon',
       'public.acknowledge_student_id_exception_request(uuid)',
       'EXECUTE'
     )
     or has_function_privilege(
       'anon',
       'public.get_student_id_exception_request_history(uuid)',
       'EXECUTE'
     )
     or has_function_privilege(
       'anon',
       'public.get_my_student_id_exception_access_state()',
       'EXECUTE'
     )
     or has_function_privilege(
       'service_role',
       'public.submit_student_id_exception_request(text,text)',
       'EXECUTE'
     )
     or has_function_privilege(
       'service_role',
       'public.submit_student_id_exception(text,text,text,text,text,text,text,text,text)',
       'EXECUTE'
     )
     or has_function_privilege(
       'service_role',
       'public.approve_student_id_exception_request(uuid)',
       'EXECUTE'
     )
     or has_function_privilege(
       'service_role',
       'public.reject_student_id_exception_request(uuid)',
       'EXECUTE'
     )
     or has_function_privilege(
       'service_role',
       'public.acknowledge_student_id_exception_request(uuid)',
       'EXECUTE'
     )
     or has_function_privilege(
       'service_role',
       'public.get_student_id_exception_request_history(uuid)',
       'EXECUTE'
     )
     or has_function_privilege(
       'service_role',
       'public.get_my_student_id_exception_access_state()',
       'EXECUTE'
     ) then
    raise exception 'Post-upgrade request RPC grants failed verification.';
  end if;

  if not exists (
    select 1
    from pg_proc function_info
    where function_info.oid =
      'public.resolve_pending_id_exception_by_photo()'::regprocedure
      and function_info.prosecdef
      and function_info.proconfig @> array['search_path=""']::text[]
      and position('resolved_by_photo' in lower(function_info.prosrc)) > 0
      and position('status = ''pending''' in lower(function_info.prosrc)) > 0
  ) or not exists (
    select 1
    from pg_trigger trigger_info
    where trigger_info.tgrelid = 'public.profiles'::regclass
      and trigger_info.tgname =
        'profiles_resolve_pending_id_exception_by_photo'
      and not trigger_info.tgisinternal
      and trigger_info.tgenabled = 'O'
      and trigger_info.tgtype = 17
      and trigger_info.tgfoid =
        'public.resolve_pending_id_exception_by_photo()'::regprocedure
      and trigger_info.tgattr::smallint[] @>
        array[v_profile_photo_attnum]::smallint[]
  ) then
    raise exception 'The pending-photo trigger or its security settings failed post-upgrade verification.';
  end if;

  if to_regprocedure(
       'public.guard_attendance_scan_student_eligibility()'
     ) is not null
     or exists (
    select 1
    from pg_trigger trigger_info
    where trigger_info.tgrelid = 'public.attendance_scans'::regclass
      and trigger_info.tgname =
        'attendance_scans_guard_student_eligibility'
      and not trigger_info.tgisinternal
      and trigger_info.tgenabled = 'O'
  ) then
    raise exception 'Upgrade 002 must not install an attendance eligibility guard.';
  end if;

  if not exists (
    select 1
    from pg_proc function_info
    where function_info.oid =
      'public.get_admin_report_aggregates(date,date,integer,integer)'::regprocedure
      and not function_info.prosecdef
  ) or not has_function_privilege(
    'authenticated',
    'public.get_admin_report_aggregates(date,date,integer,integer)',
    'EXECUTE'
  ) or has_function_privilege(
    'anon',
    'public.get_admin_report_aggregates(date,date,integer,integer)',
    'EXECUTE'
  ) or has_function_privilege(
    'service_role',
    'public.get_admin_report_aggregates(date,date,integer,integer)',
    'EXECUTE'
  ) then
    raise exception 'The admin report routine must remain SECURITY INVOKER.';
  end if;
end;
$$;

revoke execute on function public.submit_student_id_exception(
  text, text, text, text, text, text, text, text, text
) from public, anon, authenticated, service_role;

revoke execute on function public.approve_student_id_exception(uuid)
  from public, anon, authenticated, service_role;

revoke execute on function public.acknowledge_student_id_exception()
  from public, anon, authenticated, service_role;

do $$
begin
  if exists (
    select 1
    from pg_proc function_info
    where function_info.oid in (
      to_regprocedure(
        'public.submit_student_id_exception(text,text,text,text,text,text,text,text,text)'
      ),
      to_regprocedure('public.approve_student_id_exception(uuid)'),
      to_regprocedure('public.acknowledge_student_id_exception()')
    )
      and (
        has_function_privilege(
          'anon',
          function_info.oid,
          'EXECUTE'
        )
        or has_function_privilege(
          'authenticated',
          function_info.oid,
          'EXECUTE'
        )
        or has_function_privilege(
          'service_role',
          function_info.oid,
          'EXECUTE'
        )
        or exists (
          select 1
          from aclexplode(
            coalesce(
              function_info.proacl,
              acldefault('f', function_info.proowner)
            )
          ) as privilege
          where privilege.grantee = 0
            and privilege.privilege_type = 'EXECUTE'
        )
      )
  ) then
    raise exception 'One or more legacy student ID exception RPCs remain executable.';
  end if;

  if not has_function_privilege(
       'authenticated',
       'public.submit_student_id_exception_request(text,text)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'authenticated',
       'public.approve_student_id_exception_request(uuid)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'authenticated',
       'public.reject_student_id_exception_request(uuid)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'authenticated',
       'public.acknowledge_student_id_exception_request(uuid)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'authenticated',
       'public.get_student_id_exception_request_history(uuid)',
       'EXECUTE'
     ) then
    raise exception 'A request-ID-based API needed by the current application is not executable by authenticated clients.';
  end if;
end;
$$;

commit;

-- Read-only post-upgrade verification. Run these statements separately.
select
  count(*) as preserved_request_rows,
  count(*) filter (where reason is null) as legacy_reason_not_recorded_rows,
  count(*) filter (where status = 'pending') as pending_requests,
  count(*) filter (
    where status in ('approved', 'temporarily_approved')
  ) as approved_requests,
  count(*) filter (where status = 'rejected') as rejected_requests,
  count(*) filter (where status = 'resolved_by_photo') as photo_resolved_requests
from public.student_id_exception_requests;

select
  constraint_info.conname,
  constraint_info.contype,
  pg_get_constraintdef(constraint_info.oid, true) as definition
from pg_constraint constraint_info
where constraint_info.conrelid =
  'public.student_id_exception_requests'::regclass
order by constraint_info.contype, constraint_info.conname;

select
  index_info.indexname,
  index_info.indexdef
from pg_indexes index_info
where index_info.schemaname = 'public'
  and index_info.tablename = 'student_id_exception_requests'
order by index_info.indexname;

select
  function_info.oid::regprocedure::text as signature,
  function_info.prosecdef as security_definer,
  function_info.proacl as grants,
  has_function_privilege(
    'authenticated',
    function_info.oid,
    'EXECUTE'
  ) as authenticated_can_execute,
  has_function_privilege(
    'anon',
    function_info.oid,
    'EXECUTE'
  ) as anon_can_execute
from pg_proc function_info
where function_info.pronamespace = 'public'::regnamespace
  and function_info.proname in (
    'submit_student_id_exception',
    'approve_student_id_exception',
    'reject_student_id_exception',
    'acknowledge_student_id_exception'
  )
order by signature;

select
  relation_info.relrowsecurity as rls_enabled,
  policy_info.polname as policy_name,
  pg_get_expr(policy_info.polqual, policy_info.polrelid) as using_expression,
  has_table_privilege(
    'authenticated',
    'public.student_id_exception_requests',
    'SELECT'
  ) as authenticated_can_select,
  has_table_privilege(
    'authenticated',
    'public.student_id_exception_requests',
    'INSERT'
  ) as authenticated_can_insert
from pg_class relation_info
left join pg_policy policy_info
  on policy_info.polrelid = relation_info.oid
  and policy_info.polname =
    'student_id_exception_requests_select_owner_or_admin'
where relation_info.oid =
  'public.student_id_exception_requests'::regclass;

select
  pg_get_triggerdef(trigger_info.oid, true) as trigger_definition,
  pg_get_functiondef(trigger_info.tgfoid) as trigger_function
from pg_trigger trigger_info
where trigger_info.tgrelid = 'public.profiles'::regclass
  and trigger_info.tgname =
    'profiles_resolve_pending_id_exception_by_photo'
  and not trigger_info.tgisinternal;
