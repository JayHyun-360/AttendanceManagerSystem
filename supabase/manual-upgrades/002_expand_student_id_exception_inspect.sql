-- Read-only inspection for the 002 all-year ID exception expansion.
-- Run statement 1 first, then run each SELECT separately.
-- This file contains catalog/data SELECTs only; it performs no DDL or DML.
-- Expected starting point: 001_first_year_id_exception.sql has been applied.
--
-- If statement 1 reports a missing relation, skip statements that reference
-- that relation. Statement 2 is safe when tables or columns are missing.
-- Statements 3, 4, and 6 require student_id_exception_requests. Statement 5
-- lists policies for whichever of the request/attendance tables exists.
-- Statement 7 requires profiles, events, and attendance_scans. Statements 8-9 are
-- routine catalog inspections and can be run after confirming the routines
-- exist.

-- 1. Check all tables required by upgrade 002 before running dependent queries.
select
  expected.table_name,
  to_regclass(format('public.%I', expected.table_name)) as installed_relation
from (
  values
    ('student_id_exception_requests'),
    ('profiles'),
    ('attendance_scans'),
    ('events'),
    ('fines'),
    ('excuse_requests'),
    ('system_settings'),
    ('programs')
) as expected(table_name)
order by expected.table_name;

-- 2. Compare the columns and types required by upgrade 002.
-- Missing tables/columns appear with NULL installed metadata.
with expected_columns(table_name, column_name, expected_type) as (
  values
    ('student_id_exception_requests', 'student_id', 'uuid'),
    ('student_id_exception_requests', 'status', 'text'),
    ('student_id_exception_requests', 'requested_at', 'timestamp with time zone'),
    ('student_id_exception_requests', 'approved_by', 'uuid'),
    ('student_id_exception_requests', 'approved_at', 'timestamp with time zone'),
    ('student_id_exception_requests', 'attendance_eligible_from', 'timestamp with time zone'),
    ('student_id_exception_requests', 'continued_at', 'timestamp with time zone'),
    ('student_id_exception_requests', 'request_id', 'uuid'),
    ('student_id_exception_requests', 'reason', 'text'),
    ('student_id_exception_requests', 'explanation', 'text'),
    ('student_id_exception_requests', 'rejected_by', 'uuid'),
    ('student_id_exception_requests', 'rejected_at', 'timestamp with time zone'),
    ('student_id_exception_requests', 'continued_by', 'uuid'),
    ('profiles', 'id', 'uuid'),
    ('profiles', 'role', 'USER-DEFINED'),
    ('profiles', 'first_name', 'text'),
    ('profiles', 'middle_initial', 'text'),
    ('profiles', 'section', 'text'),
    ('profiles', 'surname', 'text'),
    ('profiles', 'student_id', 'text'),
    ('profiles', 'program', 'text'),
    ('profiles', 'year_level', 'text'),
    ('profiles', 'phone', 'text'),
    ('profiles', 'contact_email', 'text'),
    ('profiles', 'id_photo_url', 'text'),
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
    ('attendance_scans', 'event_id', 'uuid'),
    ('attendance_scans', 'id', 'uuid'),
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
  column_info.column_default
from expected_columns expected
left join information_schema.columns column_info
  on column_info.table_schema = 'public'
  and column_info.table_name = expected.table_name
  and column_info.column_name = expected.column_name
order by expected.table_name, expected.column_name;

-- 3. Run only if statement 1 confirms student_id_exception_requests exists.
-- Inspect its own constraints and incoming foreign-key dependencies.
select
  constraint_info.conname,
  constraint_info.contype,
  constraint_info.convalidated,
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

-- 4. Run only if the request table and student_id/status/requested_at
-- columns exist.
-- Counts disclose no individual request or student data.
select
  count(*) as current_request_rows,
  count(distinct student_id) as distinct_student_ids,
  count(*) filter (where student_id is null) as null_student_ids,
  count(*) filter (where status is null) as null_statuses,
  count(*) filter (where requested_at is null) as null_requested_at,
  count(*) filter (where status = 'pending') as pending_requests,
  count(*) filter (where status = 'temporarily_approved') as approved_requests,
  count(*) filter (where status = 'resolved_by_photo') as photo_resolved_requests,
  count(*) filter (
    where status not in (
      'pending', 'temporarily_approved', 'resolved_by_photo'
    )
  ) as unexpected_nonnull_statuses
from public.student_id_exception_requests;

-- 5. List every policy on the request and attendance tables, not only SELECT
-- policies. This catalog query is safe if either relation is missing.
select
  relation_info.relname as table_name,
  relation_info.relrowsecurity as rls_enabled,
  relation_info.relforcerowsecurity as rls_forced,
  policy_info.polname as policy_name,
  policy_info.polcmd as policy_command,
  policy_info.polpermissive as is_permissive,
  coalesce(
    (
      select array_agg(
        case
          when role_info.rolname is null then 'PUBLIC'
          else role_info.rolname
        end
        order by coalesce(role_info.rolname, 'PUBLIC')
      )
      from unnest(policy_info.polroles) as policy_role(role_oid)
      left join pg_roles role_info on role_info.oid = policy_role.role_oid
    ),
    array[]::text[]
  ) as policy_roles,
  pg_get_expr(policy_info.polqual, policy_info.polrelid) as using_expression,
  pg_get_expr(policy_info.polwithcheck, policy_info.polrelid) as with_check_expression
from pg_class relation_info
left join pg_policy policy_info
  on policy_info.polrelid = relation_info.oid
where relation_info.oid =
  to_regclass('public.student_id_exception_requests')
  or relation_info.oid = to_regclass('public.attendance_scans')
order by relation_info.relname, policy_info.polname;

-- 6. Run only if student_id_exception_requests exists.
-- PUBLIC shows direct ACL grants; the other rows show effective privileges.
with table_info as (
  select relation_info.oid, relation_info.relowner, relation_info.relacl
  from pg_class relation_info
  where relation_info.oid =
    to_regclass('public.student_id_exception_requests')
),
target_roles(role_name) as (
  values ('PUBLIC'), ('anon'), ('authenticated'), ('service_role')
),
target_privileges(privilege_name) as (
  values
    ('SELECT'),
    ('INSERT'),
    ('UPDATE'),
    ('DELETE'),
    ('TRUNCATE'),
    ('REFERENCES'),
    ('TRIGGER')
)
select
  target_roles.role_name,
  target_privileges.privilege_name,
  case
    when target_roles.role_name = 'PUBLIC' then exists (
      select 1
      from aclexplode(
        coalesce(table_info.relacl, acldefault('r', table_info.relowner))
      ) acl_entry
      where acl_entry.grantee = 0
        and acl_entry.privilege_type = target_privileges.privilege_name
    )
    when role_info.oid is null then null
    else has_table_privilege(
      role_info.oid,
      table_info.oid,
      target_privileges.privilege_name
    )
  end as effective_or_direct_privilege
from table_info
cross join target_roles
cross join target_privileges
left join pg_roles role_info
  on role_info.rolname = target_roles.role_name
order by target_roles.role_name, target_privileges.privilege_name;

-- 7. Run only if profiles, events, and attendance_scans exist.
-- Inspect the ID-photo, inferred-absence, fine, and event-state triggers.
select
  trigger_info.tgname as trigger_name,
  trigger_info.tgenabled as enabled_state,
  trigger_info.tgtype as trigger_type_bits,
  array(
    select attribute_info.attname
    from unnest(trigger_info.tgattr::smallint[]) as trigger_column(attnum)
    join pg_attribute attribute_info
      on attribute_info.attrelid = trigger_info.tgrelid
      and attribute_info.attnum = trigger_column.attnum
      and not attribute_info.attisdropped
    order by attribute_info.attname
  ) as update_columns,
  pg_get_triggerdef(trigger_info.oid, true) as trigger_definition,
  function_info.oid::regprocedure::text as function_signature,
  function_info.prosecdef as security_definer,
  function_info.proconfig as function_settings,
  function_info.proacl as function_acl,
  pg_get_functiondef(function_info.oid) as function_definition
from pg_trigger trigger_info
join pg_proc function_info on function_info.oid = trigger_info.tgfoid
where (
    (
      trigger_info.tgrelid = to_regclass('public.profiles')
      and trigger_info.tgname in (
        'profiles_resolve_pending_id_exception_by_photo',
        'profiles_materialize_student_absences_insert',
        'profiles_materialize_student_absences_update'
      )
    )
    or (
      trigger_info.tgrelid = to_regclass('public.events')
      and trigger_info.tgname in (
        'events_materialize_inferred_absences_insert',
        'events_materialize_inferred_absences_update'
      )
    )
    or (
      trigger_info.tgrelid = to_regclass('public.attendance_scans')
      and trigger_info.tgname in (
        'attendance_scans_capture_fine_policy_insert',
        'attendance_scans_capture_fine_policy_update',
        'attendance_scans_reconcile_fine_insert',
        'attendance_scans_reconcile_fine_update',
        'attendance_scans_require_active_event_insert',
        'attendance_scans_require_active_event_update'
      )
    )
  )
  and not trigger_info.tgisinternal;

-- 8. Inspect current and replacement request RPC definitions and privileges.
with expected_routines(routine_name, signature) as (
  values
    (
      'submit_student_id_exception',
      'public.submit_student_id_exception(text,text,text,text,text,text,text,text,text)'
    ),
    (
      'approve_student_id_exception',
      'public.approve_student_id_exception(uuid)'
    ),
    (
      'acknowledge_student_id_exception',
      'public.acknowledge_student_id_exception()'
    ),
    (
      'submit_student_id_exception_request',
      'public.submit_student_id_exception_request(text,text)'
    ),
    (
      'approve_student_id_exception_request',
      'public.approve_student_id_exception_request(uuid)'
    ),
    (
      'reject_student_id_exception_request',
      'public.reject_student_id_exception_request(uuid)'
    ),
    (
      'acknowledge_student_id_exception_request',
      'public.acknowledge_student_id_exception_request(uuid)'
    ),
    (
      'get_student_id_exception_request_history',
      'public.get_student_id_exception_request_history(uuid)'
    ),
    (
      'get_my_student_id_exception_access_state',
      'public.get_my_student_id_exception_access_state()'
    ),
    (
      'student_id_exception_is_eligible_for_session',
      'public.student_id_exception_is_eligible_for_session(uuid,timestamp with time zone)'
    ),
    (
      'student_id_exception_has_acknowledged_approval',
      'public.student_id_exception_has_acknowledged_approval(uuid)'
    ),
    (
      'student_id_exception_request_is_latest',
      'public.student_id_exception_request_is_latest(uuid,uuid)'
    ),
    (
      'resolve_pending_id_exception_by_photo',
      'public.resolve_pending_id_exception_by_photo()'
    ),
    (
      'guard_attendance_scan_event_status',
      'public.guard_attendance_scan_event_status()'
    )
)
select
  expected.routine_name,
  expected.signature as expected_signature,
  function_info.oid::regprocedure::text as installed_signature,
  function_info.proargnames as argument_names,
  function_info.prosecdef as security_definer,
  function_info.proconfig as function_settings,
  function_info.proacl as function_acl,
  case
    when function_info.oid is null then null
    else has_function_privilege('authenticated', function_info.oid, 'EXECUTE')
  end as authenticated_can_execute,
  case
    when function_info.oid is null then null
    else has_function_privilege('anon', function_info.oid, 'EXECUTE')
  end as anon_can_execute,
  case
    when function_info.oid is null then null
    else has_function_privilege('service_role', function_info.oid, 'EXECUTE')
  end as service_role_can_execute,
  case
    when function_info.oid is null then null
    else pg_get_functiondef(function_info.oid)
  end as function_definition
from expected_routines expected
left join pg_proc function_info
  on function_info.oid = to_regprocedure(expected.signature)
order by expected.routine_name, expected.signature;

-- 9. Inspect routines replaced by 002, including their access settings.
with expected_routines(routine_name, signature) as (
  values
    (
      'reconcile_attendance_fine',
      'public.reconcile_attendance_fine()'
    ),
    (
      'materialize_student_inferred_absences',
      'public.materialize_student_inferred_absences(uuid)'
    ),
    (
      'materialize_event_inferred_absences',
      'public.materialize_event_inferred_absences(uuid)'
    ),
    (
      'get_admin_report_aggregates',
      'public.get_admin_report_aggregates(date,date,integer,integer)'
    )
)
select
  expected.routine_name,
  function_info.oid::regprocedure::text as installed_signature,
  pg_get_function_result(function_info.oid) as return_type,
  function_info.prosecdef as security_definer,
  function_info.proconfig as function_settings,
  function_info.proacl as function_acl,
  case
    when function_info.oid is null then null
    else has_function_privilege('authenticated', function_info.oid, 'EXECUTE')
  end as authenticated_can_execute,
  case
    when function_info.oid is null then null
    else has_function_privilege('anon', function_info.oid, 'EXECUTE')
  end as anon_can_execute,
  case
    when function_info.oid is null then null
    else has_function_privilege('service_role', function_info.oid, 'EXECUTE')
  end as service_role_can_execute,
  case
    when function_info.oid is null then null
    else pg_get_functiondef(function_info.oid)
  end as function_definition
from expected_routines expected
left join pg_proc function_info
  on function_info.oid = to_regprocedure(expected.signature)
order by expected.routine_name;
