-- Read-only catalog inspection for the first-year ID exception upgrade.
-- Run each SELECT separately in Supabase Dashboard -> SQL Editor.
-- This file contains no DDL or DML and does not change database state.

-- 1. Trigger definitions on the relations whose triggers are checked/replaced.
select
  trigger_info.tgrelid::regclass as relation_name,
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
  pg_get_functiondef(function_info.oid) as function_definition
from pg_trigger trigger_info
join pg_class relation_info on relation_info.oid = trigger_info.tgrelid
join pg_namespace schema_info on schema_info.oid = relation_info.relnamespace
join pg_proc function_info on function_info.oid = trigger_info.tgfoid
where schema_info.nspname = 'public'
  and relation_info.relname in ('profiles', 'events', 'attendance_scans')
  and not trigger_info.tgisinternal
order by relation_name, trigger_name;

-- 2. Required, replaced, and feature-specific routine signatures/definitions.
-- Missing routines appear as rows with a null installed_signature.
with expected_routines(proname) as (
  values
    ('is_admin'),
    ('is_fines_enabled'),
    ('event_session_has_ended'),
    ('event_session_fine_amount'),
    ('event_program_matches'),
    ('materialize_student_absences_after_profile_change'),
    ('materialize_event_absences_after_change'),
    ('capture_attendance_fine_policy'),
    ('materialize_student_inferred_absences'),
    ('materialize_event_inferred_absences'),
    ('reconcile_attendance_fine'),
    ('get_admin_report_aggregates'),
    ('submit_student_id_exception'),
    ('approve_student_id_exception'),
    ('acknowledge_student_id_exception'),
    ('resolve_pending_id_exception_by_photo'),
    ('event_session_starts_at')
)
select
  expected.proname as expected_name,
  function_info.oid::regprocedure::text as installed_signature,
  pg_get_function_result(function_info.oid) as return_type,
  language_info.lanname as language,
  function_info.prosecdef as security_definer,
  function_info.proconfig as function_settings,
  function_info.proacl as function_acl,
  pg_get_functiondef(function_info.oid) as function_definition
from expected_routines expected
left join pg_proc function_info
  on function_info.proname = expected.proname
  and function_info.pronamespace = 'public'::regnamespace
left join pg_language language_info
  on language_info.oid = function_info.prolang
order by expected.proname, installed_signature;

-- 3. Required table/column inventory. Missing columns remain visible as rows.
with expected_columns(table_name, column_name) as (
  values
    ('profiles', 'role'),
    ('profiles', 'first_name'),
    ('profiles', 'middle_initial'),
    ('profiles', 'surname'),
    ('profiles', 'student_id'),
    ('profiles', 'program'),
    ('profiles', 'year_level'),
    ('profiles', 'section'),
    ('profiles', 'phone'),
    ('profiles', 'contact_email'),
    ('profiles', 'photo_url'),
    ('profiles', 'id_photo_url'),
    ('profiles', 'cover_photo_url'),
    ('events', 'event_date'),
    ('events', 'start_time'),
    ('events', 'morning_start'),
    ('events', 'morning_end'),
    ('events', 'afternoon_start'),
    ('events', 'afternoon_end'),
    ('events', 'end_time'),
    ('events', 'multi_session'),
    ('events', 'program'),
    ('events', 'status'),
    ('events', 'sanctions_enabled'),
    ('events', 'absent_fine'),
    ('events', 'late_fine'),
    ('events', 'morning_absent_fine'),
    ('events', 'morning_late_fine'),
    ('events', 'afternoon_absent_fine'),
    ('events', 'afternoon_late_fine'),
    ('attendance_scans', 'event_id'),
    ('attendance_scans', 'student_id'),
    ('attendance_scans', 'session_label'),
    ('attendance_scans', 'status'),
    ('attendance_scans', 'scan_in_at'),
    ('attendance_scans', 'scanned_by'),
    ('attendance_scans', 'fine_policy_enabled'),
    ('fines', 'attendance_scan_id'),
    ('fines', 'student_id'),
    ('fines', 'event_id'),
    ('fines', 'session_label'),
    ('fines', 'amount'),
    ('fines', 'reason'),
    ('fines', 'status'),
    ('excuse_requests', 'student_id'),
    ('excuse_requests', 'event_id'),
    ('excuse_requests', 'session_label'),
    ('excuse_requests', 'status'),
    ('system_settings', 'id'),
    ('system_settings', 'settings'),
    ('programs', 'name'),
    ('programs', 'legacy_aliases'),
    ('programs', 'active')
)
select
  expected.table_name,
  expected.column_name,
  column_info.data_type,
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

-- 4. Relevant public enum types and labels. Missing types appear with null labels.
with expected_types(typname) as (
  values
    ('user_role'),
    ('attendance_status'),
    ('fine_status'),
    ('excuse_status')
)
select
  expected.typname,
  type_info.oid,
  enum_info.enumlabel,
  enum_info.enumsortorder
from expected_types expected
left join pg_type type_info
  on type_info.typname = expected.typname
  and type_info.typnamespace = 'public'::regnamespace
  and type_info.typtype = 'e'
left join pg_enum enum_info on enum_info.enumtypid = type_info.oid
order by expected.typname, enum_info.enumsortorder;

-- 5. Catalog-recorded dependencies of the routines the upgrade replaces.
-- PL/pgSQL source references are not all tracked by pg_depend; inspect the
-- definitions above as well. Trigger dependencies are also shown in query 1.
with replacement_routines(proname) as (
  values
    ('materialize_student_inferred_absences'),
    ('materialize_event_inferred_absences'),
    ('reconcile_attendance_fine'),
    ('get_admin_report_aggregates')
),
target_functions as (
  select
    function_info.oid,
    function_info.oid::regprocedure::text as signature
  from replacement_routines expected
  join pg_proc function_info
    on function_info.proname = expected.proname
    and function_info.pronamespace = 'public'::regnamespace
)
select
  target.signature as replaced_function,
  dependency_info.deptype as dependency_type,
  pg_describe_object(
    dependency_info.classid,
    dependency_info.objid,
    dependency_info.objsubid
  ) as dependent_object,
  pg_describe_object(
    dependency_info.refclassid,
    dependency_info.refobjid,
    dependency_info.refobjsubid
  ) as referenced_object
from target_functions target
join pg_depend dependency_info
  on dependency_info.refclassid = 'pg_proc'::regclass
  and dependency_info.refobjid = target.oid
order by target.signature, dependent_object;
