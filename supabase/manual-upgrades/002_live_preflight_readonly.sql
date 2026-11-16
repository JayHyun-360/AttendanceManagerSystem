-- Read-only preflight for the existing live database before Upgrade 002.
-- Run in the Supabase SQL Editor, one statement at a time, before Upgrade 002.
-- Verify a recoverable backup/PITR window before applying the upgrade. Do not
-- treat local synthetic data as live evidence.
-- This file contains SELECT statements only; it performs no DDL or DML.
--
-- Expected starting point: Upgrade 001 has been applied exactly once, and
-- Upgrade 002 has not been applied or partially applied. Stop for review if
-- any required object is missing, any 002-only object is already present, or
-- any reported structure/data differs from the expected 001 baseline.
--
-- Run Sections 1-3 first. Run Sections 4-7 only after Sections 2 and 3
-- confirm the referenced relations and columns exist. Sections 8-10 are
-- catalog queries and can be run after confirming the Supabase roles exist.

-- 1. Database version and installed extension versions.
select
  current_database() as database_name,
  current_user,
  session_user,
  current_setting('server_version') as server_version,
  current_setting('server_version_num')::integer as server_version_num,
  current_setting('server_version_num')::integer >= 170000
    as meets_postgresql_17_baseline,
  exists (
    select 1
    from pg_extension extension_info
    where extension_info.extname = 'pgcrypto'
  ) as pgcrypto_installed;

select
  extension_info.extname as extension_name,
  extension_info.extversion as installed_version,
  namespace_info.nspname as schema_name
from pg_extension extension_info
join pg_namespace namespace_info
  on namespace_info.oid = extension_info.extnamespace
order by extension_info.extname;

select
  namespace_info.nspname as schema_name,
  type_info.typname as enum_name,
  enum_info.enumlabel as enum_value,
  enum_info.enumsortorder
from pg_type type_info
join pg_namespace namespace_info
  on namespace_info.oid = type_info.typnamespace
join pg_enum enum_info
  on enum_info.enumtypid = type_info.oid
where namespace_info.nspname = 'public'
  and type_info.typname in (
    'user_role',
    'attendance_status',
    'fine_status',
    'excuse_status'
  )
order by type_info.typname, enum_info.enumsortorder;

-- 2. Required post-001 relations.
with expected_relations(relation_name) as (
  values
    ('student_id_exception_requests'),
    ('profiles'),
    ('attendance_scans'),
    ('events'),
    ('fines'),
    ('excuse_requests'),
    ('system_settings'),
    ('programs')
)
select
  expected.relation_name,
  to_regclass(format('public.%I', expected.relation_name)) as installed_relation,
  relation_info.relkind as relation_kind
from expected_relations expected
left join pg_class relation_info
  on relation_info.oid =
    to_regclass(format('public.%I', expected.relation_name))
order by expected.relation_name;

-- 3. Required columns/types checked by Upgrade 002's starting-point guard.
with expected_columns(table_name, column_name, expected_type) as (
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
    ('excuse_requests', 'student_id', 'uuid'),
    ('excuse_requests', 'event_id', 'uuid'),
    ('excuse_requests', 'session_label', 'text'),
    ('excuse_requests', 'status', 'USER-DEFINED'),
    ('system_settings', 'id', 'integer'),
    ('system_settings', 'settings', 'jsonb'),
    ('programs', 'name', 'text'),
    ('programs', 'legacy_aliases', 'ARRAY'),
    ('programs', 'active', 'boolean')
)
select
  expected.table_name,
  expected.column_name,
  expected.expected_type,
  column_info.data_type as installed_type,
  column_info.udt_schema,
  column_info.udt_name,
  column_info.is_nullable,
  column_info.column_default,
  case
    when column_info.column_name is null then 'MISSING'
    when column_info.data_type is distinct from expected.expected_type
      then 'TYPE MISMATCH'
    else 'PRESENT'
  end as result
from expected_columns expected
left join information_schema.columns column_info
  on column_info.table_schema = 'public'
  and column_info.table_name = expected.table_name
  and column_info.column_name = expected.column_name
order by expected.table_name, expected.column_name;

-- 4. Request-table constraints, foreign keys, and all indexes.
-- Expected on the 001 baseline: student_id primary key and profile FK,
-- status/state checks, and no incoming FK dependency on the request table.
select
  constraint_info.conname,
  constraint_info.contype,
  constraint_info.convalidated,
  array(
    select attribute_info.attname
    from unnest(constraint_info.conkey) as key_column(attnum)
    join pg_attribute attribute_info
      on attribute_info.attrelid = constraint_info.conrelid
      and attribute_info.attnum = key_column.attnum
      and not attribute_info.attisdropped
    order by key_column.attnum
  ) as constrained_columns,
  case
    when constraint_info.confrelid = 0::oid then null
    else constraint_info.confrelid::regclass::text
  end as referenced_relation,
  pg_get_constraintdef(constraint_info.oid, true) as definition
from pg_constraint constraint_info
where constraint_info.conrelid =
  to_regclass('public.student_id_exception_requests')
order by constraint_info.contype, constraint_info.conname;

select
  constraint_info.conrelid::regclass as referencing_relation,
  constraint_info.conname,
  pg_get_constraintdef(constraint_info.oid, true) as definition
from pg_constraint constraint_info
where constraint_info.contype = 'f'
  and constraint_info.confrelid =
    to_regclass('public.student_id_exception_requests')
order by constraint_info.conrelid::regclass::text, constraint_info.conname;

select
  index_info.indexname,
  index_info.indexdef
from pg_indexes index_info
where index_info.schemaname = 'public'
  and index_info.tablename = 'student_id_exception_requests'
order by index_info.indexname;

select
  constraint_info.conrelid::regclass as relation_name,
  constraint_info.conname,
  constraint_info.contype,
  constraint_info.convalidated,
  pg_get_constraintdef(constraint_info.oid, true) as definition
from pg_constraint constraint_info
where constraint_info.conrelid in (
  to_regclass('public.profiles'),
  to_regclass('public.attendance_scans'),
  to_regclass('public.events'),
  to_regclass('public.fines'),
  to_regclass('public.excuse_requests'),
  to_regclass('public.system_settings'),
  to_regclass('public.programs')
)
order by
  constraint_info.conrelid::regclass::text,
  constraint_info.contype,
  constraint_info.conname;

select
  index_info.schemaname,
  index_info.tablename,
  index_info.indexname,
  index_info.indexdef
from pg_indexes index_info
where index_info.schemaname = 'public'
  and index_info.tablename in (
    'profiles',
    'attendance_scans',
    'events',
    'fines',
    'excuse_requests',
    'system_settings',
    'programs'
  )
order by index_info.tablename, index_info.indexname;

-- 5. Existing request data that can conflict with the migration.
-- These are aggregate counts only; no student identities or explanations.
-- Unsupported/malformed counts and the duplicate query should all be zero.
select
  count(*) as request_rows,
  count(distinct student_id) as distinct_student_ids,
  count(*) filter (where student_id is null) as null_student_ids,
  count(*) filter (where status is null) as null_statuses,
  count(*) filter (where requested_at is null) as null_requested_at,
  count(*) filter (
    where status not in ('pending', 'temporarily_approved', 'resolved_by_photo')
  ) as unsupported_statuses,
  count(*) filter (
    where status = 'pending'
      and (
        approved_by is not null
        or approved_at is not null
        or attendance_eligible_from is not null
        or continued_at is not null
      )
  ) as malformed_pending_rows,
  count(*) filter (
    where status = 'temporarily_approved'
      and (
        approved_by is null
        or approved_at is null
        or attendance_eligible_from is distinct from approved_at
        or (continued_at is not null and continued_at < approved_at)
      )
  ) as malformed_approved_rows,
  count(*) filter (
    where status = 'resolved_by_photo'
      and (
        approved_by is not null
        or approved_at is not null
        or attendance_eligible_from is null
        or continued_at is not null
      )
  ) as malformed_photo_resolved_rows
from public.student_id_exception_requests;

select
  count(*) as students_with_duplicate_requests,
  coalesce(sum(duplicates.rows_for_student - 1), 0) as extra_duplicate_rows
from (
  select count(*) as rows_for_student
  from public.student_id_exception_requests
  group by student_id
  having count(*) > 1
) duplicates;

-- 6. Request-table RLS, policies, and effective table privileges.
-- Expected: RLS enabled, the single authenticated owner/admin SELECT policy,
-- authenticated SELECT only, and no direct request-table privileges for
-- PUBLIC, anon, or service_role.
select
  relation_info.relname as table_name,
  relation_info.relrowsecurity as rls_enabled,
  relation_info.relforcerowsecurity as rls_forced,
  policy_info.polname as policy_name,
  policy_info.polcmd as policy_command,
  policy_info.polpermissive as is_permissive,
  array(
    select coalesce(role_info.rolname, 'PUBLIC')
    from unnest(policy_info.polroles) as policy_role(role_oid)
    left join pg_roles role_info on role_info.oid = policy_role.role_oid
    order by coalesce(role_info.rolname, 'PUBLIC')
  ) as policy_roles,
  pg_get_expr(policy_info.polqual, policy_info.polrelid) as using_expression,
  pg_get_expr(policy_info.polwithcheck, policy_info.polrelid) as with_check_expression
from pg_class relation_info
left join pg_policy policy_info
  on policy_info.polrelid = relation_info.oid
where relation_info.oid in (
  to_regclass('public.student_id_exception_requests'),
  to_regclass('public.profiles'),
  to_regclass('public.attendance_scans'),
  to_regclass('public.events'),
  to_regclass('public.fines'),
  to_regclass('public.excuse_requests')
)
order by relation_info.relname, policy_info.polname;

select
  role_info.rolname as role_name,
  has_table_privilege(
    role_info.oid,
    'public.student_id_exception_requests',
    'SELECT'
  ) as can_select,
  has_table_privilege(
    role_info.oid,
    'public.student_id_exception_requests',
    'INSERT'
  ) as can_insert,
  has_table_privilege(
    role_info.oid,
    'public.student_id_exception_requests',
    'UPDATE'
  ) as can_update,
  has_table_privilege(
    role_info.oid,
    'public.student_id_exception_requests',
    'DELETE'
  ) as can_delete,
  has_table_privilege(
    role_info.oid,
    'public.student_id_exception_requests',
    'TRUNCATE'
  ) as can_truncate
from pg_roles role_info
where role_info.rolname in ('anon', 'authenticated', 'service_role')
order by role_info.rolname;

-- 7. Existing profile/event/attendance triggers and their exact bindings.
-- Compare names, timing, event, enabled state, updated columns, and function
-- definitions with the 001 baseline before proceeding.
select
  relation_info.oid::regclass as table_name,
  trigger_info.tgname as trigger_name,
  trigger_info.tgenabled as enabled_state,
  trigger_info.tgtype as trigger_type_bits,
  array(
    select update_column.event_object_column
    from information_schema.triggered_update_columns update_column
    where update_column.trigger_schema = namespace_info.nspname
      and update_column.event_object_schema = namespace_info.nspname
      and update_column.event_object_table = relation_info.relname
      and update_column.trigger_name = trigger_info.tgname
    order by update_column.event_object_column
  ) as update_columns,
  pg_get_triggerdef(trigger_info.oid, true) as trigger_definition,
  function_info.oid::regprocedure::text as function_signature,
  function_info.prosecdef as security_definer,
  function_info.proconfig as function_settings,
  function_info.proacl as function_acl,
  pg_get_functiondef(function_info.oid) as function_definition
from pg_trigger trigger_info
join pg_class relation_info on relation_info.oid = trigger_info.tgrelid
join pg_namespace namespace_info
  on namespace_info.oid = relation_info.relnamespace
join pg_proc function_info on function_info.oid = trigger_info.tgfoid
where namespace_info.nspname = 'public'
  and relation_info.relname in ('profiles', 'events', 'attendance_scans')
  and not trigger_info.tgisinternal
order by relation_info.relname, trigger_info.tgname;

-- 8. Required 001 routine signatures, access settings, and grants.
-- All required signatures should be PRESENT; compare SECURITY DEFINER and
-- effective role grants with the installed 001 baseline.
with expected_routines(signature) as (
  values
    ('public.submit_student_id_exception(text,text,text,text,text,text,text,text,text)'),
    ('public.approve_student_id_exception(uuid)'),
    ('public.acknowledge_student_id_exception()'),
    ('public.resolve_pending_id_exception_by_photo()'),
    ('public.event_session_starts_at(date,time without time zone)'),
    ('public.is_admin()'),
    ('public.is_fines_enabled()'),
    ('public.event_session_has_ended(date,time without time zone)'),
    ('public.event_session_fine_amount(uuid,text,public.attendance_status)'),
    ('public.event_program_matches(text,text)'),
    ('public.materialize_student_absences_after_profile_change()'),
    ('public.materialize_event_absences_after_change()'),
    ('public.capture_attendance_fine_policy()'),
    ('public.guard_attendance_scan_event_status()'),
    ('public.materialize_student_inferred_absences(uuid)'),
    ('public.materialize_event_inferred_absences(uuid)'),
    ('public.reconcile_attendance_fine()'),
    ('public.get_admin_report_aggregates(date,date,integer,integer)')
)
select
  expected.signature as expected_signature,
  function_info.oid::regprocedure::text as installed_signature,
  function_info.prosecdef as security_definer,
  function_info.proconfig as function_settings,
  function_info.proacl as function_acl,
  case when function_info.oid is null then null
    else has_function_privilege('authenticated', function_info.oid, 'EXECUTE')
  end as authenticated_can_execute,
  case when function_info.oid is null then null
    else has_function_privilege('anon', function_info.oid, 'EXECUTE')
  end as anon_can_execute,
  case when function_info.oid is null then null
    else has_function_privilege('service_role', function_info.oid, 'EXECUTE')
  end as service_role_can_execute,
  case when function_info.oid is null then 'MISSING' else 'PRESENT' end as result
from expected_routines expected
left join pg_proc function_info
  on function_info.oid = to_regprocedure(expected.signature)
order by expected.signature;

-- 9. Detect objects that indicate Upgrade 002 was already applied or partially
-- applied. Any result marked PRESENT is a stop condition; do not rerun 002.
with expected_columns(table_name, column_name) as (
  values
    ('student_id_exception_requests', 'request_id'),
    ('student_id_exception_requests', 'reason'),
    ('student_id_exception_requests', 'explanation'),
    ('student_id_exception_requests', 'rejected_by'),
    ('student_id_exception_requests', 'rejected_at'),
    ('student_id_exception_requests', 'continued_by')
),
expected_indexes(index_name) as (
  values
    ('student_id_exception_one_pending_per_student_uidx'),
    ('student_id_exception_one_approved_per_student_uidx'),
    ('student_id_exception_student_latest_idx')
),
expected_routines(signature) as (
  values
    ('public.submit_student_id_exception_request(text,text)'),
    ('public.approve_student_id_exception_request(uuid)'),
    ('public.reject_student_id_exception_request(uuid)'),
    ('public.acknowledge_student_id_exception_request(uuid)'),
    ('public.get_student_id_exception_request_history(uuid)'),
    ('public.get_my_student_id_exception_access_state()'),
    ('public.student_id_exception_is_eligible_for_session(uuid,timestamp with time zone)'),
    ('public.student_id_exception_has_acknowledged_approval(uuid)'),
    ('public.student_id_exception_request_is_latest(uuid,uuid)'),
    ('public.guard_attendance_scan_student_eligibility()')
)
select
  'column' as object_type,
  expected.table_name || '.' || expected.column_name as object_name,
  case when column_info.column_name is null then 'ABSENT' else 'PRESENT' end as result
from expected_columns expected
left join information_schema.columns column_info
  on column_info.table_schema = 'public'
  and column_info.table_name = expected.table_name
  and column_info.column_name = expected.column_name
union all
select
  'index',
  expected.index_name,
  case when to_regclass(format('public.%I', expected.index_name)) is null
    then 'ABSENT' else 'PRESENT' end
from expected_indexes expected
union all
select
  'routine',
  expected.signature,
  case when to_regprocedure(expected.signature) is null
    then 'ABSENT' else 'PRESENT' end
from expected_routines expected
order by object_type, object_name;

-- 10. Report the exact current and 002-only request objects for manual
-- comparison with the expected post-001 baseline. This is diagnostic only;
-- it does not certify local customizations or authorize deployment.
select
  relation_info.relname as relation_name,
  relation_info.relrowsecurity as rls_enabled,
  relation_info.relforcerowsecurity as rls_forced
from pg_class relation_info
join pg_namespace namespace_info
  on namespace_info.oid = relation_info.relnamespace
where namespace_info.nspname = 'public'
  and relation_info.relname = 'student_id_exception_requests';

select
  policy_info.polname as policy_name,
  policy_info.polcmd as policy_command,
  pg_get_expr(policy_info.polqual, policy_info.polrelid) as using_expression,
  pg_get_expr(policy_info.polwithcheck, policy_info.polrelid) as with_check_expression
from pg_policy policy_info
where policy_info.polrelid =
  to_regclass('public.student_id_exception_requests')
order by policy_info.polname;
