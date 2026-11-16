-- Redundant fallback for databases that applied an earlier Upgrade 002
-- revision before its in-transaction legacy RPC lockout was added.
-- Do not run this as a required second deployment step after the current
-- 002_expand_student_id_exception.sql; that migration now performs and
-- verifies the lockout atomically before COMMIT.
--
-- This does not change request data or function definitions. If any assertion
-- fails, stop and inspect the privilege state before serving old clients.

begin;

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

select
  function_info.oid::regprocedure::text as function_signature,
  has_function_privilege(
    'authenticated',
    function_info.oid,
    'EXECUTE'
  ) as authenticated_can_execute
from pg_proc function_info
where function_info.oid in (
  to_regprocedure(
    'public.submit_student_id_exception(text,text,text,text,text,text,text,text,text)'
  ),
  to_regprocedure('public.approve_student_id_exception(uuid)'),
  to_regprocedure('public.acknowledge_student_id_exception()'),
  to_regprocedure('public.submit_student_id_exception_request(text,text)'),
  to_regprocedure('public.approve_student_id_exception_request(uuid)'),
  to_regprocedure('public.reject_student_id_exception_request(uuid)'),
  to_regprocedure('public.acknowledge_student_id_exception_request(uuid)'),
  to_regprocedure('public.get_student_id_exception_request_history(uuid)')
)
order by function_signature;
