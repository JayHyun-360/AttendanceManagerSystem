-- Repair the Upgrade 002 admin report RPC without replaying Upgrade 002.
-- This only applies when the installed definition has the known missing CTE
-- projection. CREATE OR REPLACE preserves the function's existing owner and
-- privileges; the definition is read from the database to retain its options.

begin;

do $upgrade$
declare
  v_function_definition text;
  v_updated_definition text;
  v_missing_projection_pattern constant text :=
    'fine[.]status,[[:space:]]+profile[.]student_program';
  v_corrected_projection_pattern constant text :=
    'fine[.]status,[[:space:]]+fine[.]attendance_scan_id,[[:space:]]+profile[.]student_program';
begin
  select pg_get_functiondef(
    'public.get_admin_report_aggregates(date,date,integer,integer)'::regprocedure
  )
  into v_function_definition;

  if v_function_definition is null then
    raise exception 'Could not read get_admin_report_aggregates definition.';
  end if;

  if regexp_count(
    v_function_definition,
    v_corrected_projection_pattern
  ) > 0 then
    raise exception 'The admin report fine projection is already corrected.';
  end if;

  if position('eligible_fines as materialized' in v_function_definition) = 0
     or position(
       'where fine.attendance_scan_id = scan.id' in v_function_definition
     ) = 0 then
    raise exception
      'The installed admin report RPC does not match the expected Upgrade 002 definition.';
  end if;

  if regexp_count(
    v_function_definition,
    v_missing_projection_pattern
  ) <> 1 then
    raise exception
      'Expected exactly one missing eligible_fines projection in the installed RPC.';
  end if;

  v_updated_definition := regexp_replace(
    v_function_definition,
    '(fine[.]status,)([[:space:]]+)(profile[.]student_program)',
    E'\\1\\2fine.attendance_scan_id,\\2\\3'
  );

  if regexp_count(
       v_updated_definition,
       v_corrected_projection_pattern
     ) <> 1
     or regexp_count(
       v_updated_definition,
       v_missing_projection_pattern
     ) <> 0 then
    raise exception 'Could not verify the corrected eligible_fines projection.';
  end if;

  execute v_updated_definition;
end;
$upgrade$;

notify pgrst, 'reload schema';

commit;

-- Read-only verification: inspect the installed function definition.
select pg_get_functiondef(
  'public.get_admin_report_aggregates(date,date,integer,integer)'::regprocedure
) as installed_function_definition;
