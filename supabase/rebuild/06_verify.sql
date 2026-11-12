-- Read-only verification queries. Run after the baseline and Dashboard setup.

select table_name
from information_schema.tables
where table_schema = 'public'
  and table_type = 'BASE TABLE'
order by table_name;

select column_name,
       data_type,
       is_nullable,
       column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'events'
  and column_name = 'feedback_enabled';

select typname, enumlabel
from pg_type
join pg_enum on pg_enum.enumtypid = pg_type.oid
join pg_namespace on pg_namespace.oid = pg_type.typnamespace
where pg_namespace.nspname = 'public'
order by typname, enumsortorder;

select id, system_name, qr_expiration_minutes, settings
from public.system_settings
where id = 1;

select name, active, sort_order, legacy_aliases
from public.programs
order by sort_order, name;

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;

select conrelid::regclass as table_name,
       conname,
       contype,
       pg_get_constraintdef(oid) as definition
from pg_constraint
where connamespace = 'public'::regnamespace
order by conrelid::regclass::text, conname;

select tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
order by tablename, indexname;

select event_object_table, trigger_name, action_timing, event_manipulation
from information_schema.triggers
where trigger_schema = 'public'
order by event_object_table, trigger_name, event_manipulation;

select tgname, tgenabled, pg_get_triggerdef(oid) as definition
from pg_trigger
where tgrelid = 'public.profiles'::regclass
  and not tgisinternal
order by tgname;

select c.relname as table_name,
       c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as force_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where (n.nspname = 'public' and c.relkind in ('r', 'p'))
   or (n.nspname = 'storage' and c.relname = 'objects')
order by n.nspname, c.relname;

with role_names(role_name) as (
  values ('anon'::name), ('authenticated'::name),
         ('service_role'::name), ('postgres'::name)
)
select role_name,
       has_schema_privilege(role_name, 'public', 'USAGE') as public_usage,
       has_schema_privilege(role_name, 'public', 'CREATE') as public_create
from role_names
order by role_name;

select n.nspname as schema_name,
       case when acl.grantee = 0 then 'PUBLIC'
            else pg_get_userbyid(acl.grantee)
       end as grantee,
       acl.privilege_type,
       acl.is_grantable
from pg_namespace n
cross join lateral aclexplode(
  coalesce(n.nspacl, acldefault('n', n.nspowner))
) as acl
where n.nspname in ('public', 'auth', 'storage')
order by n.nspname, grantee, acl.privilege_type;

select member.rolname as member_role,
       granted.rolname as granted_role,
       membership.admin_option,
       membership.inherit_option,
       membership.set_option
from pg_auth_members membership
join pg_roles member on member.oid = membership.member
join pg_roles granted on granted.oid = membership.roleid
order by member.rolname, granted.rolname;

with role_names(role_name) as (
  values ('anon'::name), ('authenticated'::name),
         ('service_role'::name), ('postgres'::name)
),
target_tables(schema_name, table_name) as (
  values
    ('public'::name, 'profiles'::name),
    ('public'::name, 'events'::name),
    ('public'::name, 'attendance_logs'::name),
    ('public'::name, 'attendance_scans'::name),
    ('public'::name, 'fines'::name),
    ('public'::name, 'excuse_requests'::name),
    ('public'::name, 'announcements'::name),
    ('public'::name, 'system_settings'::name),
    ('public'::name, 'attendance_scan_corrections'::name),
    ('public'::name, 'event_feedback'::name),
    ('public'::name, 'storage_cleanup_queue'::name),
    ('public'::name, 'programs'::name),
    ('public'::name, 'dev_notes'::name),
    ('storage'::name, 'objects'::name)
)
select target.schema_name,
       target.table_name,
       roles.role_name,
       has_table_privilege(
         roles.role_name,
         format('%I.%I', target.schema_name, target.table_name),
         'SELECT'
       ) as can_select,
       has_table_privilege(
         roles.role_name,
         format('%I.%I', target.schema_name, target.table_name),
         'INSERT'
       ) as can_insert,
       has_table_privilege(
         roles.role_name,
         format('%I.%I', target.schema_name, target.table_name),
         'UPDATE'
       ) as can_update,
       has_table_privilege(
         roles.role_name,
         format('%I.%I', target.schema_name, target.table_name),
         'DELETE'
       ) as can_delete,
       has_table_privilege(
         roles.role_name,
         format('%I.%I', target.schema_name, target.table_name),
         'TRUNCATE'
       ) as can_truncate,
       has_table_privilege(
         roles.role_name,
         format('%I.%I', target.schema_name, target.table_name),
         'REFERENCES'
       ) as can_reference,
       has_table_privilege(
         roles.role_name,
         format('%I.%I', target.schema_name, target.table_name),
         'TRIGGER'
       ) as can_create_trigger,
       has_table_privilege(
         roles.role_name,
         format('%I.%I', target.schema_name, target.table_name),
         'MAINTAIN'
       ) as can_maintain
from target_tables target
cross join role_names roles
order by target.schema_name, target.table_name, roles.role_name;

select has_table_privilege(
         'service_role', 'public.profiles', 'SELECT'
       ) as service_role_can_select_profiles,
       has_table_privilege(
         'service_role', 'public.profiles', 'UPDATE'
       ) as service_role_can_update_profiles,
       has_table_privilege(
         'authenticated', 'public.profiles', 'UPDATE'
       ) as authenticated_can_update_profiles,
       has_table_privilege(
         'postgres', 'public.profiles', 'UPDATE'
       ) as postgres_can_update_profiles;

select session_user as sql_editor_session_user,
       auth.role() as jwt_role,
       (
         session_user = 'postgres'
         and auth.role() is null
       ) as trusted_postgres_promotion_context;

select n.nspname as schema_name,
       c.relname as object_name,
       case when acl.grantee = 0 then 'PUBLIC'
            else pg_get_userbyid(acl.grantee)
       end as grantee,
       acl.privilege_type,
       acl.is_grantable
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
cross join lateral aclexplode(
  coalesce(c.relacl, acldefault('r', c.relowner))
) as acl
where (n.nspname = 'public' and c.relkind in ('r', 'p'))
   or (n.nspname = 'storage' and c.relname = 'objects')
order by n.nspname, c.relname, grantee, acl.privilege_type;

select role_name,
       has_sequence_privilege(
         role_name, 'public.storage_cleanup_queue_id_seq', 'USAGE'
       ) as can_use,
       has_sequence_privilege(
         role_name, 'public.storage_cleanup_queue_id_seq', 'SELECT'
       ) as can_select,
       has_sequence_privilege(
         role_name, 'public.storage_cleanup_queue_id_seq', 'UPDATE'
       ) as can_update
from unnest(
  array['anon', 'authenticated', 'service_role', 'postgres']::name[]
) as roles(role_name)
order by role_name;

select c.relname as sequence_name,
       case when acl.grantee = 0 then 'PUBLIC'
            else pg_get_userbyid(acl.grantee)
       end as grantee,
       acl.privilege_type,
       acl.is_grantable
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
cross join lateral aclexplode(
  coalesce(c.relacl, acldefault('S', c.relowner))
) as acl
where n.nspname = 'public'
  and c.relkind = 'S'
order by c.relname, grantee, acl.privilege_type;

select p.oid::regprocedure::text as function_name,
       pg_get_function_result(p.oid) as return_type,
       p.prosecdef as security_definer,
       p.proconfig as function_settings,
       p.proacl,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE')
         as authenticated_execute,
       has_function_privilege('service_role', p.oid, 'EXECUTE')
         as service_role_execute,
       has_function_privilege('postgres', p.oid, 'EXECUTE') as postgres_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
order by p.oid::regprocedure::text;

select p.oid::regprocedure::text as function_name,
       p.prosecdef as security_definer,
       p.proconfig as function_settings,
       position('feedback_enabled' in p.prosrc) > 0
         as checks_feedback_enabled,
       position('return ''disabled''' in lower(p.prosrc)) > 0
         as reports_disabled_feedback,
       case
         when p.proname = 'submit_event_feedback'
           then position('for share' in lower(p.prosrc)) > 0
         else null
       end as submission_event_row_lock_present
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'get_my_event_feedback_status',
    'submit_event_feedback'
  )
order by p.oid::regprocedure::text;

select p.oid::regprocedure::text as function_name,
       not p.prosecdef as is_security_invoker,
       p.proconfig as function_settings,
       has_function_privilege('authenticated', p.oid, 'EXECUTE')
         as authenticated_execute,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
       has_function_privilege('service_role', p.oid, 'EXECUTE')
         as service_role_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'get_admin_event_feedback_summary';

select p.oid::regprocedure::text as function_name,
       case when acl.grantee = 0 then 'PUBLIC'
            else pg_get_userbyid(acl.grantee)
       end as grantee,
       acl.privilege_type,
       acl.is_grantable
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
cross join lateral aclexplode(
  coalesce(p.proacl, acldefault('f', p.proowner))
) as acl
where n.nspname = 'public'
  and acl.grantee = 0
order by p.oid::regprocedure::text;

select p.oid::regprocedure as function_name,
       p.proconfig as function_settings,
       coalesce(p.proconfig @> array['search_path=""'], false)
         as empty_search_path_is_set,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE')
         as authenticated_execute,
       has_function_privilege('service_role', p.oid, 'EXECUTE')
         as service_role_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef
order by p.oid::regprocedure::text;

select owner.rolname as owner_role,
       coalesce(schema.nspname, '<global>') as schema_name,
       defaults.defaclobjtype,
       case when acl.grantee = 0 then 'PUBLIC'
            else pg_get_userbyid(acl.grantee)
       end as grantee,
       acl.privilege_type,
       acl.is_grantable
from pg_default_acl defaults
join pg_roles owner on owner.oid = defaults.defaclrole
left join pg_namespace schema on schema.oid = defaults.defaclnamespace
cross join lateral aclexplode(defaults.defaclacl) as acl
where owner.rolname in ('postgres', 'supabase_admin')
order by owner.rolname, schema_name, defaults.defaclobjtype,
         grantee, acl.privilege_type;

select pg_get_functiondef(p.oid) as profile_role_guard_definition,
       position('auth.role() is null' in p.prosrc) > 0
         as requires_null_jwt_role,
       position('session_user = ''postgres''' in p.prosrc) > 0
         as requires_postgres_session,
       position('supabase_admin' in p.prosrc) = 0
         as excludes_supabase_admin,
       position('service_role' in p.prosrc) = 0
         as excludes_service_role_promotion
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'prevent_admin_self_demotion';

select role_name,
       has_table_privilege(
         role_name, 'public.dev_notes', 'SELECT'
       ) as can_select,
       has_table_privilege(
         role_name, 'public.dev_notes', 'INSERT'
       ) as can_insert,
       has_table_privilege(
         role_name, 'public.dev_notes', 'UPDATE'
       ) as can_update,
       has_table_privilege(
         role_name, 'public.dev_notes', 'DELETE'
       ) as can_delete,
       has_table_privilege(
         role_name, 'public.dev_notes', 'TRUNCATE'
       ) as can_truncate
from unnest(
  array['anon', 'authenticated', 'service_role', 'postgres']::name[]
) as roles(role_name)
order by role_name;

select count(*) as dev_notes_rows
from public.dev_notes;

with expected_buckets(id, name, is_public, size_limit, mime_types) as (
  values
    (
      'public-images'::text,
      'public-images'::text,
      true,
      52428800::bigint,
      array['image/jpeg', 'image/png', 'image/webp', 'video/mp4']::text[]
    ),
    (
      'student-private-media'::text,
      'student-private-media'::text,
      false,
      20971520::bigint,
      array['image/jpeg', 'image/png', 'image/webp']::text[]
    ),
    (
      'excuse-documents'::text,
      'excuse-documents'::text,
      false,
      20971520::bigint,
      array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[]
    )
)
select expected.id,
       bucket.id is not null as bucket_exists,
       bucket.public = expected.is_public as public_setting_matches,
       bucket.file_size_limit = expected.size_limit as size_limit_matches,
       bucket.allowed_mime_types = expected.mime_types as mime_types_match,
       bucket.name
from expected_buckets expected
left join storage.buckets bucket on bucket.id = expected.id
order by expected.id;

select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id not in (
  'public-images', 'student-private-media', 'excuse-documents'
)
order by id;

select policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
order by policyname;

with required_policies(policyname) as (
  values
    ('public_images_public_read'),
    ('public_images_admin_insert'),
    ('public_images_admin_update'),
    ('public_images_admin_delete_unreferenced'),
    ('student_private_media_owner_admin_read'),
    ('student_private_media_owner_insert'),
    ('student_private_media_owner_admin_delete_unreferenced'),
    ('excuse_documents_student_insert'),
    ('excuse_documents_admin_read'),
    ('excuse_documents_admin_delete_unreferenced')
)
select required.policyname,
       exists (
         select 1
         from pg_policies actual
         where actual.schemaname = 'storage'
           and actual.tablename = 'objects'
           and actual.policyname = required.policyname
       ) as policy_exists
from required_policies required
order by required.policyname;

select policyname,
       cmd,
       position('auth.uid()' in coalesce(qual, '') || coalesce(with_check, ''))
         > 0 as checks_auth_uid,
       position('public.is_admin()' in
         coalesce(qual, '') || coalesce(with_check, '')) > 0
         as checks_admin_role,
       position('can_delete_storage_object' in
         coalesce(qual, '') || coalesce(with_check, '')) > 0
         as uses_reference_aware_delete,
       position('student-private-media' in
         coalesce(qual, '') || coalesce(with_check, '')) > 0
         as scoped_to_student_private_media
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and policyname in (
    'student_private_media_owner_admin_read',
    'student_private_media_owner_insert',
    'student_private_media_owner_admin_delete_unreferenced',
    'public_images_admin_insert',
    'public_images_admin_update',
    'public_images_admin_delete_unreferenced',
    'excuse_documents_student_insert',
    'excuse_documents_admin_read',
    'excuse_documents_admin_delete_unreferenced'
  )
order by policyname;

select not exists (
         select 1
         from pg_policies
         where schemaname = 'storage'
           and tablename = 'objects'
           and cmd = 'UPDATE'
           and (
             coalesce(qual, '') ilike '%student-private-media%'
             or coalesce(with_check, '') ilike '%student-private-media%'
             or coalesce(qual, '') ilike '%excuse-documents%'
             or coalesce(with_check, '') ilike '%excuse-documents%'
           )
       ) as no_private_bucket_update_policies,
       not exists (
         select 1
         from pg_policies
         where schemaname = 'storage'
           and tablename = 'objects'
           and (
             'anon'::name = any(roles)
             or 'public'::name = any(roles)
           )
           and (
             coalesce(qual, '') ilike '%student-private-media%'
             or coalesce(with_check, '') ilike '%student-private-media%'
             or coalesce(qual, '') ilike '%excuse-documents%'
             or coalesce(with_check, '') ilike '%excuse-documents%'
           )
       ) as no_anonymous_private_bucket_policies;

select p.oid::regprocedure::text as function_name,
       p.prosecdef as security_definer,
       p.proconfig as function_settings,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE')
         as authenticated_execute,
       has_function_privilege('service_role', p.oid, 'EXECUTE')
         as service_role_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'register_storage_upload',
    'extend_storage_upload_intent',
    'can_delete_storage_object',
    'is_storage_object_referenced',
    'assert_storage_reference',
    'guard_new_storage_references',
    'lock_storage_cleanup_claim'
  )
order by p.oid::regprocedure::text;

select current_setting('server_version') as postgresql_version,
       current_setting('server_version_num')::integer >= 170000
         as supports_maintain_privilege;

select bucket_id, status, count(*) as queue_rows
from public.storage_cleanup_queue
group by bucket_id, status
order by bucket_id, status;

select pubname, schemaname as schema_name, tablename as table_name
from pg_publication_tables
where pubname = 'supabase_realtime'
order by schemaname, tablename;

select to_regprocedure('public.close_expired_active_events()') is null
  as automatic_event_closure_function_absent;

do $$
declare
  closure_job_count bigint := 0;
  closure_job_names text;
begin
  if to_regclass('cron.job') is not null then
    execute $query$
      select count(*), coalesce(string_agg(jobname, ', '), '')
      from cron.job
      where jobname = $1 or command ilike $2
    $query$
      into closure_job_count, closure_job_names
      using
        'attendance-close-expired-active-events',
        '%close_expired_active_events%';
    if closure_job_count > 0 then
      raise warning
        'Unexpected automatic event-closure pg_cron job(s) found (%): %. The rebuild does not unschedule jobs in separately deployed databases; remove these jobs manually.',
        closure_job_count,
        closure_job_names;
    else
      raise notice 'No automatic event-closure pg_cron jobs found (expected 0).';
    end if;
  else
    raise notice 'pg_cron is not enabled; no scheduled event-closure jobs can exist';
  end if;
end;
$$;
