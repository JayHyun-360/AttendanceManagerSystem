begin;

create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  sort_order integer not null default 0,
  legacy_aliases text[] not null default '{}',
  created_at timestamptz not null default now(),
  constraint programs_name_length check (
    length(btrim(name)) between 2 and 100 and name = btrim(name)
  ),
  constraint programs_name_no_slash check (position('/' in name) = 0)
);

create unique index if not exists programs_name_case_insensitive_uidx
  on public.programs (lower(name));

alter table public.programs enable row level security;

drop policy if exists programs_select_authenticated on public.programs;
create policy programs_select_authenticated
  on public.programs
  for select
  to authenticated
  using (true);

drop policy if exists programs_insert_admin on public.programs;
create policy programs_insert_admin
  on public.programs
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists programs_update_admin on public.programs;
create policy programs_update_admin
  on public.programs
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update on public.programs to authenticated;
revoke all on public.programs from anon, public;

insert into public.programs (name, active, sort_order, legacy_aliases)
values
  ('BSIT - Information Technology', true, 10, array['BSIT']),
  ('BSCS - Computer Science', true, 20, array['BSCS']),
  ('BSBA - Business Administration', true, 30, array['BSBA']),
  ('BSEd - Secondary Education', true, 40, array['BSEd']),
  ('BSHM - Hospitality Management', true, 50, array['BSHM'])
on conflict (name) do update
set legacy_aliases = excluded.legacy_aliases;

insert into public.programs (name, active, sort_order)
select distinct on (lower(btrim(profile.program)))
  btrim(profile.program),
  false,
  1000
from public.profiles as profile
where nullif(btrim(profile.program), '') is not null
  and length(btrim(profile.program)) between 2 and 100
  and position('/' in btrim(profile.program)) = 0
  and lower(btrim(profile.program)) not in ('bsit', 'bscs', 'bsba', 'bsed', 'bshm')
  and lower(btrim(profile.program)) <> 'all programs'
  and not exists (
    select 1
    from public.programs as known
    where lower(known.name) = lower(btrim(profile.program))
  )
order by lower(btrim(profile.program)), btrim(profile.program)
on conflict do nothing;

create or replace function public.event_program_matches(
  p_event_program text,
  p_student_program text
)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select
    p_event_program is null
    or btrim(p_event_program) = ''
    or lower(btrim(p_event_program)) = 'all programs'
    or lower(btrim(p_event_program)) = lower(btrim(p_student_program))
    or exists (
      select 1
      from public.programs as program
      cross join lateral unnest(string_to_array(p_event_program, '/')) as part(value)
      where (
        lower(program.name) = lower(btrim(p_student_program))
        or exists (
          select 1
          from unnest(program.legacy_aliases) as student_alias(value)
          where lower(btrim(student_alias.value)) =
            lower(btrim(p_student_program))
        )
      )
        and (
          lower(btrim(part.value)) = lower(program.name)
          or exists (
            select 1
            from unnest(program.legacy_aliases) as alias(value)
            where lower(btrim(part.value)) = lower(btrim(alias.value))
          )
        )
    );
$$;

revoke all on function public.event_program_matches(text, text) from public;

create or replace function public.validate_program_selection()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.program is null or btrim(new.program) = '' then
    return new;
  end if;

  if lower(btrim(new.program)) = 'all programs'
     and tg_table_name = 'events' then
    return new;
  end if;

  if exists (
    select 1
    from public.programs as program
    where program.name = new.program
      and program.active
  ) then
    return new;
  end if;

  if tg_op = 'UPDATE' and new.program is not distinct from old.program then
    return new;
  end if;

  raise exception 'Select an active program from the program catalog.'
    using errcode = 'check_violation';
end;
$$;

revoke all on function public.validate_program_selection() from public;

drop trigger if exists profiles_validate_program on public.profiles;
create trigger profiles_validate_program
before insert or update of program
on public.profiles
for each row
execute function public.validate_program_selection();

drop trigger if exists events_validate_program on public.events;
create trigger events_validate_program
before insert or update of program
on public.events
for each row
execute function public.validate_program_selection();

create or replace function public.materialize_student_inferred_absences(
  p_student_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted integer := 0;
  v_profile public.profiles%rowtype;
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
            then event_row.morning_end
          else coalesce(event_row.morning_end, event_row.end_time)
        end
      ),
      ('afternoon'::text, event_row.afternoon_end)
  ) as sessions(session_label, session_end)
  where public.event_session_has_ended(event_row.event_date, sessions.session_end)
    and coalesce(event_row.status, '') not in ('upcoming', 'cancelled')
    and (
      (coalesce(event_row.multi_session, false) = false
        and sessions.session_label = 'morning')
      or coalesce(event_row.multi_session, false) = true
    )
    and public.event_program_matches(event_row.program, v_profile.program)
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
set search_path = public
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
            then v_event.morning_end
          else coalesce(v_event.morning_end, v_event.end_time)
        end
      ),
      ('afternoon'::text, v_event.afternoon_end)
  ) as sessions(session_label, session_end)
  where profile.role = 'student'
    and nullif(trim(coalesce(profile.program, '')), '') is not null
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

do $$
declare
  report_definition text;
  old_program_match text := 'or session.event_program = profile.program';
begin
  select pg_get_functiondef(
    'public.get_admin_report_aggregates(date,date,integer,integer)'::regprocedure
  )
  into report_definition;

  if position(old_program_match in report_definition) = 0 then
    raise exception 'Could not locate the event-program comparison in get_admin_report_aggregates';
  end if;

  execute replace(
    report_definition,
    old_program_match,
    'or public.event_program_matches(session.event_program, profile.program)'
  );
end;
$$;

notify pgrst, 'reload schema';

commit;
