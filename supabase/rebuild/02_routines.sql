-- Consolidated latest routine definitions extracted from the audited migration history.
-- Historical data-cleanup statements are intentionally omitted.
begin;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    email,
    first_name,
    middle_initial,
    surname,
    contact_email,
    role,
    photo_url
  )
  values (
    NEW.id,
    NEW.email,
    coalesce(NEW.raw_user_meta_data ->> 'first_name', ''),
    coalesce(NEW.raw_user_meta_data ->> 'middle_initial', ''),
    coalesce(NEW.raw_user_meta_data ->> 'surname', ''),
    NEW.email,
    'student',
    coalesce(NEW.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (id) do nothing;

  return NEW;
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

create or replace function public.clear_student_fields_for_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role = 'admin'::public.user_role
     and old.role is distinct from new.role then
    new.student_id := null;
    new.program := null;
    new.year_level := null;
    new.section := null;
    new.qr_version := null;
  end if;

  return new;
end;
$$;

create or replace function public.prevent_admin_self_demotion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.role is distinct from 'admin'::public.user_role then
      return new;
    end if;
  elsif new.role is not distinct from old.role then
    return new;
  end if;

  if auth.uid() is not null and public.is_admin() then
    if tg_op = 'UPDATE'
       and old.role = 'admin'
       and new.role <> 'admin'
       and auth.uid() = old.id then
      new.role := old.role;
    end if;
    return new;
  end if;

  -- Permit initial promotion only from the trusted postgres SQL-editor session.
  if auth.role() is null and session_user = 'postgres' then
    return new;
  end if;

  raise exception 'Only administrators or the trusted postgres database owner may change profile roles.'
    using errcode = '42501';
  return new;
end;
$$;

create or replace function public.event_session_fine_amount(
  p_event_id uuid,
  p_session_label text,
  p_status public.attendance_status
)
returns numeric
language sql
stable
set search_path = public
as $$
  select case
    when p_status = 'late' then coalesce(
      case when p_session_label = 'morning' then e.morning_late_fine else e.afternoon_late_fine end,
      e.late_fine,
      0
    )
    when p_status = 'absent' then coalesce(
      case when p_session_label = 'morning' then e.morning_absent_fine else e.afternoon_absent_fine end,
      e.absent_fine,
      0
    )
    else 0
  end
  from public.events e
  where e.id = p_event_id;
$$;

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

create or replace function public.is_fines_enabled()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((s.settings->>'finesEnabled')::boolean, false)
  from public.system_settings s
  where s.id = 1;
$$;

create or replace function public.capture_attendance_fine_policy()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.status in ('late', 'absent') then
      new.fine_policy_enabled := public.is_fines_enabled();
    else
      new.fine_policy_enabled := false;
    end if;
  elsif new.status in ('late', 'absent') then
    if old.status not in ('late', 'absent') then
      new.fine_policy_enabled := public.is_fines_enabled();
    elsif new.fine_policy_enabled is null then
      new.fine_policy_enabled := false;
    end if;
  end if;

  return new;
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

create or replace function public.reconcile_excuse_fine()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
     and old.status = 'pending'
     and new.status = 'approved'
     and new.fine_id is not null then
    update public.fines
    set status = 'excused'
    where id = new.fine_id
      and student_id = new.student_id
      and status = 'unpaid';
  end if;

  return new;
end;
$$;

create or replace function public.event_session_has_ended(
  p_event_date date,
  p_session_end time
)
returns boolean
language sql
stable
set search_path = public
as $$
  select
    p_event_date < timezone('Asia/Manila', now())::date
    or (
      p_session_end is not null
      and ((p_event_date + p_session_end) at time zone 'Asia/Manila') <= now()
    );
$$;

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

create or replace function public.validate_program_selection()
returns trigger
language plpgsql
security definer
set search_path = ''
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

create or replace function public.materialize_student_absences_after_profile_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role = 'student'
     and nullif(trim(coalesce(new.program, '')), '') is not null
  then
    if tg_op = 'INSERT' then
      perform public.materialize_student_inferred_absences(new.id);
    elsif old.role is distinct from new.role
       or old.program is distinct from new.program then
      perform public.materialize_student_inferred_absences(new.id);
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.materialize_event_absences_after_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.materialize_event_inferred_absences(new.id);
  elsif old.status is distinct from new.status
     or old.event_date is distinct from new.event_date
     or old.program is distinct from new.program
     or old.multi_session is distinct from new.multi_session
     or old.morning_end is distinct from new.morning_end
     or old.afternoon_end is distinct from new.afternoon_end
     or old.end_time is distinct from new.end_time then
    perform public.materialize_event_inferred_absences(new.id);
  end if;

  return new;
end;
$$;

create or replace function public.guard_attendance_scan_event_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_status text;
begin
  select event.status
    into event_status
  from public.events event
  where event.id = new.event_id;

  if event_status is null then
    raise exception 'Cannot record attendance: event does not exist.'
      using errcode = 'foreign_key_violation';
  end if;

  if event_status in ('upcoming', 'cancelled') then
    raise exception 'Attendance can only be recorded for active events. Current event status: %.', event_status
      using errcode = 'check_violation';
  end if;

  if event_status = 'closed'
     and not (
       new.status = 'absent'::public.attendance_status
       and new.scan_in_at is null
       and new.scanned_by is null
       and new.method is null
     ) then
    raise exception 'New attendance scans cannot be recorded for closed events.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create or replace function public.guard_event_cancellation_without_attendance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'cancelled'
     and new.status not in ('cancelled', 'upcoming') then
    raise exception 'Cancelled events must be restored to upcoming before being activated or closed.'
      using errcode = 'check_violation';
  end if;

  if new.status = 'cancelled'
     and old.status is distinct from new.status
     and exists (
       select 1
       from public.attendance_scans scan
       where scan.event_id = new.id
     ) then
    raise exception 'Events with attendance records cannot be cancelled. Mark the event closed instead.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create or replace function public.extend_event_session(
  p_event_id uuid,
  p_session_label text,
  p_extension_minutes integer,
  p_expected_version integer
)
returns table (
  event_id uuid,
  session_label text,
  new_end_time time,
  upgraded_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.events%rowtype;
  v_is_multi boolean;
  v_old_end time;
  v_old_cutoff time;
  v_new_end time;
  v_old_cutoff_at timestamptz;
  v_new_cutoff_at timestamptz;
  v_scan_ids uuid[];
  v_upgraded_count integer := 0;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception using
      errcode = '42501',
      message = 'Only authenticated administrators can extend event sessions';
  end if;

  if p_event_id is null then
    raise exception using
      errcode = '22004',
      message = 'Event ID is required';
  end if;

  if p_session_label not in ('morning', 'afternoon') then
    raise exception using
      errcode = '22023',
      message = 'Session label must be morning or afternoon';
  end if;

  if p_extension_minutes is null
     or p_extension_minutes < 5
     or p_extension_minutes > 30 then
    raise exception using
      errcode = '22023',
      message = 'Extension must be between 5 and 30 minutes';
  end if;

  if p_expected_version is null then
    raise exception using
      errcode = '22004',
      message = 'Expected event version is required';
  end if;

  select e.*
  into v_event
  from public.events e
  where e.id = p_event_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Event not found';
  end if;

  if coalesce(v_event.version, 1) <> p_expected_version then
    raise exception using
      errcode = '40001',
      message = 'Another administrator changed this event. Refresh the page and retry.';
  end if;

  v_is_multi := coalesce(v_event.multi_session, false);

  if not v_is_multi and p_session_label <> 'morning' then
    raise exception using
      errcode = '22023',
      message = 'Single-session events only support the morning session';
  end if;

  if p_session_label = 'morning' then
    v_old_end := case
      when v_is_multi then v_event.morning_end
      else coalesce(v_event.morning_end, v_event.end_time)
    end;
    v_old_cutoff := v_event.morning_late_cutoff;
  else
    v_old_end := v_event.afternoon_end;
    v_old_cutoff := v_event.afternoon_late_cutoff;
  end if;

  if v_old_end is null then
    raise exception using
      errcode = '22023',
      message = 'The selected session has no end time';
  end if;

  if v_old_cutoff is null then
    raise exception using
      errcode = '22023',
      message = 'The selected session has no late cutoff';
  end if;

  v_new_end := v_old_end + make_interval(mins => p_extension_minutes);

  if v_new_end <= v_old_end then
    raise exception using
      errcode = '22023',
      message = 'The extension cannot cross midnight';
  end if;

  v_old_cutoff_at := (v_event.event_date + v_old_cutoff) at time zone 'Asia/Manila';
  v_new_cutoff_at := (v_event.event_date + v_new_end) at time zone 'Asia/Manila';

  -- Capture the exact rows before changing their status. The lower boundary is
  -- the old late cutoff, per the approved Interpretation B rule.
  select coalesce(array_agg(s.id), '{}'::uuid[])
  into v_scan_ids
  from public.attendance_scans s
  where s.event_id = v_event.id
    and s.session_label = p_session_label
    and s.status = 'late'
    and s.scan_in_at > v_old_cutoff_at
    and s.scan_in_at <= v_new_cutoff_at;

  if p_session_label = 'morning' then
    update public.events
    set
      morning_end = v_new_end,
      morning_late_cutoff = v_new_end,
      end_time = case when not v_is_multi then v_new_end else end_time end,
      version = coalesce(version, 1) + 1
    where id = v_event.id;
  else
    update public.events
    set
      afternoon_end = v_new_end,
      afternoon_late_cutoff = v_new_end,
      version = coalesce(version, 1) + 1
    where id = v_event.id;
  end if;

  if coalesce(array_length(v_scan_ids, 1), 0) > 0 then
    update public.attendance_scans
    set status = 'present'
    where id = any(v_scan_ids);

    get diagnostics v_upgraded_count = row_count;

    -- The existing attendance_scans trigger removes unpaid scan-linked fines
    -- when a row becomes present. This explicit safeguard also reconciles any
    -- stale unpaid fine that could predate that trigger.
    delete from public.fines
    where attendance_scan_id = any(v_scan_ids)
      and status = 'unpaid';
  end if;

  return query
  select
    v_event.id,
    p_session_label,
    v_new_end,
    v_upgraded_count;
end;
$$;

create or replace function public.submit_excuse_request(
  p_event_id uuid,
  p_session_label text,
  p_reason text,
  p_document_path text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student_id uuid := auth.uid();
  v_settings jsonb;
  v_scan public.attendance_scans%rowtype;
  v_fine_id uuid;
  v_request_id uuid;
begin
  if v_student_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.profiles profile
    where profile.id = v_student_id
      and profile.role = 'student'
  ) then
    raise exception 'Only students can submit excuse requests.' using errcode = '42501';
  end if;

  if p_event_id is null
     or p_session_label is null
     or p_session_label not in ('morning', 'afternoon') then
    raise exception 'A valid event and session are required.' using errcode = '22023';
  end if;

  if nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'A reason is required.' using errcode = '22023';
  end if;

  select settings
  into v_settings
  from public.system_settings
  where id = 1;

  if not coalesce((v_settings->>'allowExcuseRequests')::boolean, true) then
    raise exception 'Excuse requests are currently disabled.' using errcode = '42501';
  end if;

  -- Materialize completed virtual absences before resolving UUID-backed rows.
  perform public.materialize_student_inferred_absences(v_student_id);

  select scan.*
  into v_scan
  from public.attendance_scans scan
  where scan.event_id = p_event_id
    and scan.student_id = v_student_id
    and scan.session_label = p_session_label
    and scan.status = 'absent'
  for update;

  if not found then
    raise exception 'An excuse request can only be submitted for a recorded absence.'
      using errcode = '23514';
  end if;

  if p_document_path is not null then
    if split_part(p_document_path, '/', 1) <> v_student_id::text
       or split_part(p_document_path, '/', 2) = ''
       or position('/' in split_part(p_document_path, '/', 2)) > 0 then
      raise exception 'The attachment path is invalid.' using errcode = '22023';
    end if;

    if not exists (
      select 1
      from storage.objects stored_file
      where stored_file.bucket_id = 'excuse-documents'
        and stored_file.name = p_document_path
    ) then
      raise exception 'The attachment could not be found.' using errcode = '22023';
    end if;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      v_student_id::text || ':' || p_event_id::text || ':' || p_session_label,
      0
    )
  );

  if exists (
    select 1
    from public.excuse_requests request
    where request.student_id = v_student_id
      and request.status in ('pending', 'approved')
      and (
        request.attendance_scan_id = v_scan.id
        or (
          request.event_id = p_event_id
          and request.session_label = p_session_label
        )
      )
  ) then
    raise exception 'An active excuse request already exists for this event session.'
      using errcode = '23505';
  end if;

  select fine.id
  into v_fine_id
  from public.fines fine
  where fine.attendance_scan_id = v_scan.id
    and fine.student_id = v_student_id
    and fine.status = 'unpaid'
  limit 1;

  insert into public.excuse_requests (
    fine_id,
    student_id,
    event_id,
    attendance_scan_id,
    session_label,
    reason,
    document_url,
    status
  ) values (
    v_fine_id,
    v_student_id,
    p_event_id,
    v_scan.id,
    p_session_label,
    trim(p_reason),
    p_document_path,
    'pending'
  )
  returning id into v_request_id;

  return v_request_id;
end;
$$;

create or replace function public.review_excuse_request(
  p_request_id uuid,
  p_decision public.excuse_status
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.excuse_requests%rowtype;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Administrator access is required.' using errcode = '42501';
  end if;

  if p_decision is null or p_decision not in ('approved', 'denied') then
    raise exception 'Decision must be approved or denied.' using errcode = '22023';
  end if;

  select *
  into v_request
  from public.excuse_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Excuse request not found.' using errcode = 'P0002';
  end if;

  if v_request.status is distinct from 'pending' then
    raise exception 'Only pending requests can be reviewed.' using errcode = '23514';
  end if;

  update public.excuse_requests
  set
    status = p_decision,
    reviewed_by = auth.uid(),
    reviewed_at = now()
  where id = p_request_id;
end;
$$;

create or replace function public.link_excuse_request_fine()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate_fine_ids uuid[];
begin
  if new.fine_id is not null then
    return new;
  end if;

  select array_agg(fine.id order by fine.created_at, fine.id)
  into candidate_fine_ids
  from public.fines fine
  where fine.student_id = new.student_id
    and fine.status = 'unpaid'
    and (
      fine.attendance_scan_id = new.attendance_scan_id
      or (
        fine.attendance_scan_id is null
        and fine.event_id = new.event_id
        and fine.session_label = new.session_label
      )
    );

  if coalesce(cardinality(candidate_fine_ids), 0) > 1 then
    raise exception 'Multiple unpaid fines match this event session; an administrator must reconcile them first.'
      using errcode = '23505';
  end if;

  if coalesce(cardinality(candidate_fine_ids), 0) = 1 then
    new.fine_id := candidate_fine_ids[1];
  end if;

  return new;
end;
$$;

create function public.get_public_events()
returns table (
  id uuid,
  title text,
  description text,
  location text,
  event_date date,
  start_time time,
  end_time time,
  image_url text,
  program text,
  status text,
  multi_session boolean,
  morning_start time,
  morning_end time,
  afternoon_start time,
  afternoon_end time
)
language sql
stable
security definer
set search_path = ''
as $function$
  select
    event_row.id,
    event_row.title,
    event_row.description,
    event_row.location,
    event_row.event_date,
    event_row.start_time,
    event_row.end_time,
    event_row.image_url,
    event_row.program,
    event_row.status,
    event_row.multi_session,
    event_row.morning_start,
    event_row.morning_end,
    event_row.afternoon_start,
    event_row.afternoon_end
  from public.events as event_row
  where event_row.archived_at is null
  order by event_row.event_date desc;
$function$;

create or replace function public.correct_closed_event_inferred_absence(
  p_event_id uuid,
  p_student_id uuid,
  p_session_label text,
  p_corrected_status public.attendance_status,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid := auth.uid();
  v_event_status text;
  v_scan public.attendance_scans%rowtype;
  v_changed_at timestamptz := now();
begin
  if v_admin_id is null or not public.is_admin() then
    raise exception 'Only authenticated admins can correct attendance.'
      using errcode = '42501';
  end if;

  if p_event_id is null
     or p_student_id is null
     or p_session_label not in ('morning', 'afternoon') then
    raise exception 'A valid event, student, and session are required.'
      using errcode = '22023';
  end if;

  if p_corrected_status is null
     or p_corrected_status not in ('present', 'late') then
    raise exception 'A closed-event correction must mark the student present or late.'
      using errcode = '22023';
  end if;

  if nullif(btrim(p_reason), '') is null or char_length(p_reason) > 1000 then
    raise exception 'A correction reason of 1 to 1000 characters is required.'
      using errcode = '22023';
  end if;

  select event.status::text
    into v_event_status
  from public.events event
  where event.id = p_event_id
  for update;

  if not found or v_event_status <> 'closed' then
    raise exception 'Attendance corrections are only allowed for closed events.'
      using errcode = '23514';
  end if;

  select scan.*
    into v_scan
  from public.attendance_scans scan
  where scan.event_id = p_event_id
    and scan.student_id = p_student_id
    and scan.session_label = p_session_label
  for update;

  if not found
     or v_scan.status <> 'absent'
     or v_scan.scan_in_at is not null
     or v_scan.scan_out_at is not null
     or v_scan.scanned_by is not null
     or v_scan.method is not null then
    raise exception 'Only an existing system-inferred absence can be corrected.'
      using errcode = '23514';
  end if;

  insert into public.attendance_scan_corrections (
    attendance_scan_id,
    event_id,
    student_id,
    session_label,
    previous_status,
    corrected_status,
    previous_scan_in_at,
    previous_scan_out_at,
    previous_method,
    previous_scanned_by,
    previous_fine_policy_enabled,
    reason,
    changed_by,
    changed_at
  ) values (
    v_scan.id,
    v_scan.event_id,
    v_scan.student_id,
    v_scan.session_label,
    v_scan.status,
    p_corrected_status,
    v_scan.scan_in_at,
    v_scan.scan_out_at,
    v_scan.method,
    v_scan.scanned_by,
    v_scan.fine_policy_enabled,
    btrim(p_reason),
    v_admin_id,
    v_changed_at
  );

  update public.attendance_scans
  set status = p_corrected_status,
      scan_in_at = v_changed_at,
      scan_out_at = null,
      method = 'manual',
      scanned_by = v_admin_id,
      updated_at = v_changed_at
  where id = v_scan.id;

  return v_scan.id;
end;
$$;

create or replace function public.get_my_event_feedback_status(p_event_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student_id uuid := auth.uid();
  v_event_status text;
  v_feedback_enabled boolean;
begin
  if v_student_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.profiles profile
    where profile.id = v_student_id
      and profile.role = 'student'
  ) then
    raise exception 'Only students can access event feedback.'
      using errcode = '42501';
  end if;

  select event.status::text, event.feedback_enabled
    into v_event_status, v_feedback_enabled
  from public.events event
  where event.id = p_event_id;

  if not found then
    return 'not_open';
  end if;

  if exists (
    select 1
    from public.event_feedback feedback
    where feedback.event_id = p_event_id
      and feedback.student_id = v_student_id
  ) then
    return 'submitted';
  end if;

  if v_event_status <> 'closed' then
    return 'not_open';
  end if;

  if not v_feedback_enabled then
    return 'disabled';
  end if;

  if exists (
    select 1
    from public.attendance_scans scan
    where scan.event_id = p_event_id
      and scan.student_id = v_student_id
      and scan.status in ('present', 'late')
      and scan.scan_in_at is not null
  ) then
    return 'eligible';
  end if;

  return 'ineligible';
end;
$$;

create or replace function public.submit_event_feedback(
  p_event_id uuid,
  p_rating integer,
  p_comment text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student_id uuid := auth.uid();
  v_event_status text;
  v_feedback_enabled boolean;
  v_attendance_scan_id uuid;
  v_feedback_id uuid;
begin
  if v_student_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.profiles profile
    where profile.id = v_student_id
      and profile.role = 'student'
  ) then
    raise exception 'Only students can submit event feedback.'
      using errcode = '42501';
  end if;

  if p_event_id is null or p_rating is null or p_rating not between 1 and 5 then
    raise exception 'Choose a rating from 1 to 5.' using errcode = '22023';
  end if;

  if char_length(coalesce(p_comment, '')) > 2000 then
    raise exception 'Feedback comments must be 2000 characters or fewer.'
      using errcode = '22023';
  end if;

  select event.status::text, event.feedback_enabled
    into v_event_status, v_feedback_enabled
  from public.events event
  where event.id = p_event_id
  for share;

  if not found or v_event_status <> 'closed' then
    raise exception 'Feedback can only be submitted after an event is closed.'
      using errcode = '23514';
  end if;

  if not v_feedback_enabled then
    raise exception 'Feedback is disabled for this event.'
      using errcode = '23514';
  end if;

  select scan.id
    into v_attendance_scan_id
  from public.attendance_scans scan
  where scan.event_id = p_event_id
    and scan.student_id = v_student_id
    and scan.status in ('present', 'late')
    and scan.scan_in_at is not null
  order by scan.session_label
  limit 1
  for share;

  if not found then
    raise exception 'Feedback is available to students recorded as present or late.'
      using errcode = '42501';
  end if;

  insert into public.event_feedback (
    event_id,
    student_id,
    rating,
    comment
  ) values (
    p_event_id,
    v_student_id,
    p_rating,
    nullif(btrim(coalesce(p_comment, '')), '')
  )
  on conflict (event_id, student_id) do nothing
  returning id into v_feedback_id;

  if v_feedback_id is null then
    return 'already_submitted';
  end if;

  return 'submitted';
end;
$$;

create or replace function public.get_admin_event_feedback_summary(
  p_event_id uuid
)
returns table(response_count bigint, average_rating numeric)
language sql
stable
security invoker
set search_path = ''
as $function$
  select count(*)::bigint, avg(feedback.rating)::numeric
  from public.event_feedback feedback
  where feedback.event_id = p_event_id;
$function$;

create or replace function public.storage_object_path(
  p_bucket_id text,
  p_value text
)
returns text
language plpgsql
immutable
set search_path = ''
as $function$
declare
  object_path text;
  public_prefix text;
  prefix_position integer;
begin
  if p_value is null or btrim(p_value) = '' or p_value like 'blob:%' then
    return null;
  end if;

  if p_bucket_id = 'public-images' then
    public_prefix := '/storage/v1/object/public/public-images/';
    if p_value ~ '^[a-z][a-z0-9+.-]*://' then
      prefix_position := strpos(p_value, public_prefix);
      if prefix_position = 0 then
        return null;
      end if;
      object_path := substring(
        p_value from prefix_position + length(public_prefix)
      );
    else
      object_path := regexp_replace(p_value, '^/+', '');
    end if;
  elsif p_bucket_id in ('student-private-media', 'excuse-documents') then
    if p_value ~ '^[a-z][a-z0-9+.-]*://' then
      return null;
    end if;
    object_path := regexp_replace(p_value, '^/+', '');
  else
    return null;
  end if;

  object_path := split_part(split_part(object_path, '?', 1), '#', 1);
  if object_path = '' or object_path like '%..%' or position('//' in object_path) > 0 then
    return null;
  end if;

  return object_path;
end;
$function$;

create or replace function public.is_storage_object_referenced(
  p_bucket_id text,
  p_object_path text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select
    exists (
      select 1
      from public.profiles p
      where public.storage_object_path(p_bucket_id, p.photo_url) = p_object_path
         or public.storage_object_path(p_bucket_id, p.cover_photo_url) = p_object_path
         or public.storage_object_path(p_bucket_id, p.id_photo_url) = p_object_path
    )
    or exists (
      select 1
      from public.events e
      where public.storage_object_path(p_bucket_id, e.image_url) = p_object_path
         or exists (
           select 1
           from unnest(coalesce(e.media_urls, '{}'::text[])) media(value)
           where public.storage_object_path(p_bucket_id, media.value) = p_object_path
         )
    )
    or exists (
      select 1
      from public.announcements a
      where public.storage_object_path(p_bucket_id, a.media_url) = p_object_path
    )
    or exists (
      select 1
      from public.excuse_requests r
      where public.storage_object_path(p_bucket_id, r.document_url) = p_object_path
    )
    or exists (
      select 1
      from public.system_settings s
      cross join lateral jsonb_array_elements(
        case
          when jsonb_typeof(s.settings -> 'carouselSlides') = 'array'
            then s.settings -> 'carouselSlides'
          else '[]'::jsonb
        end
      ) slide(value)
      where public.storage_object_path(
              p_bucket_id, slide.value ->> 'imageUrl'
            ) = p_object_path
         or public.storage_object_path(
              p_bucket_id, slide.value ->> 'posterUrl'
            ) = p_object_path
    );
$function$;

create or replace function public.assert_storage_reference(
  p_bucket_id text,
  p_object_path text,
  p_owner_id uuid default null,
  p_category text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  path_depth integer;
begin
  if p_object_path is null then
    return;
  end if;

  path_depth := cardinality(string_to_array(p_object_path, '/'));

  if p_bucket_id = 'student-private-media' then
    if p_owner_id is null
       or split_part(p_object_path, '/', 1) <> p_owner_id::text
       or split_part(p_object_path, '/', 2) <> p_category
       or p_category not in ('profile', 'cover', 'id')
       or path_depth <> 3 then
      raise exception 'Student media references must use an owner/category/file path.'
        using errcode = '23514';
    end if;
  elsif p_bucket_id = 'excuse-documents' then
    if p_owner_id is null
       or split_part(p_object_path, '/', 1) <> p_owner_id::text
       or path_depth <> 2 then
      raise exception 'Excuse documents must use an owner/file path.'
        using errcode = '23514';
    end if;
  elsif p_bucket_id = 'public-images' then
    if path_depth <> 4
       or split_part(p_object_path, '/', 1) <> 'admin'
       or split_part(p_object_path, '/', 2) !~
         '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
       or split_part(p_object_path, '/', 3) <> 'public-media' then
      raise exception 'Public media references must use an administrator-owned path.'
        using errcode = '23514';
    end if;
  else
    raise exception 'Unsupported Storage bucket reference.'
      using errcode = '23514';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_bucket_id || ':' || p_object_path, 0)
  );

  if exists (
    select 1
    from public.storage_cleanup_queue q
    where q.bucket_id = p_bucket_id
      and q.object_path = p_object_path
      and q.status = 'processing'
  ) then
    raise exception 'This Storage object is currently being cleaned up.'
      using errcode = '55000';
  end if;

  if not exists (
    select 1
    from storage.objects o
    where o.bucket_id = p_bucket_id
      and o.name = p_object_path
  ) then
    raise exception 'The referenced Storage object does not exist.'
      using errcode = '23503';
  end if;

  update public.storage_cleanup_queue q
  set status = 'cancelled',
      last_error = 'Object was linked to an application record.',
      processed_at = now()
  where q.bucket_id = p_bucket_id
    and q.object_path = p_object_path
    and q.status in ('pending', 'failed');
end;
$function$;

create or replace function public.register_storage_upload(
  p_bucket_id text,
  p_object_path text
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_user_id uuid := auth.uid();
  path_depth integer;
begin
  if current_user_id is null then
    raise exception 'Authentication is required to register an upload.'
      using errcode = '42501';
  end if;

  if p_object_path is null
     or p_object_path = ''
     or p_object_path like '%..%'
     or position('//' in p_object_path) > 0 then
    raise exception 'Invalid Storage object path.'
      using errcode = '22023';
  end if;

  path_depth := cardinality(string_to_array(p_object_path, '/'));

  if p_bucket_id = 'student-private-media' then
    if split_part(p_object_path, '/', 1) <> current_user_id::text
       or split_part(p_object_path, '/', 2) not in ('profile', 'cover', 'id')
       or path_depth <> 3 then
      raise exception 'Student media uploads must use the caller UID and an approved category.'
        using errcode = '42501';
    end if;
  elsif p_bucket_id = 'excuse-documents' then
    if split_part(p_object_path, '/', 1) <> current_user_id::text
       or path_depth <> 2 then
      raise exception 'Excuse-document uploads must use the caller UID.'
        using errcode = '42501';
    end if;
  elsif p_bucket_id = 'public-images' then
    if not public.is_admin()
       or path_depth <> 4
       or split_part(p_object_path, '/', 1) <> 'admin'
       or split_part(p_object_path, '/', 2) <> current_user_id::text
       or split_part(p_object_path, '/', 3) <> 'public-media' then
      raise exception 'Only administrators may register managed public media.'
        using errcode = '42501';
    end if;
  else
    raise exception 'Unsupported Storage bucket.'
      using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_bucket_id || ':' || p_object_path, 0)
  );

  if exists (
    select 1
    from public.storage_cleanup_queue q
    where q.bucket_id = p_bucket_id
      and q.object_path = p_object_path
  ) or exists (
    select 1
    from storage.objects o
    where o.bucket_id = p_bucket_id
      and o.name = p_object_path
  ) then
    raise exception 'This Storage path has already been registered or exists.'
      using errcode = '23505';
  end if;

  insert into public.storage_cleanup_queue (
    bucket_id,
    object_path,
    status,
    attempts,
    available_at
  ) values (
    p_bucket_id,
    p_object_path,
    'pending',
    0,
    now() + interval '48 hours'
  )
  on conflict do nothing;
end;
$function$;

create or replace function public.extend_storage_upload_intent(
  p_bucket_id text,
  p_object_path text
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_user_id uuid := auth.uid();
  path_depth integer;
begin
  if current_user_id is null then
    raise exception 'Authentication is required to extend an upload.'
      using errcode = '42501';
  end if;

  if p_object_path is null
     or p_object_path = ''
     or p_object_path like '%..%'
     or position('//' in p_object_path) > 0 then
    raise exception 'Invalid Storage object path.'
      using errcode = '22023';
  end if;

  path_depth := cardinality(string_to_array(p_object_path, '/'));
  if p_bucket_id = 'student-private-media' then
    if split_part(p_object_path, '/', 1) <> current_user_id::text
       or split_part(p_object_path, '/', 2) not in ('profile', 'cover', 'id')
       or path_depth <> 3 then
      raise exception 'Student media upload paths must belong to the caller.'
        using errcode = '42501';
    end if;
  elsif p_bucket_id = 'excuse-documents' then
    if split_part(p_object_path, '/', 1) <> current_user_id::text
       or path_depth <> 2 then
      raise exception 'Excuse-document upload paths must belong to the caller.'
        using errcode = '42501';
    end if;
  elsif p_bucket_id = 'public-images' then
    if not public.is_admin()
       or path_depth <> 4
       or split_part(p_object_path, '/', 1) <> 'admin'
       or split_part(p_object_path, '/', 2) <> current_user_id::text
       or split_part(p_object_path, '/', 3) <> 'public-media' then
      raise exception 'Only administrators may extend their public-media uploads.'
        using errcode = '42501';
    end if;
  else
    raise exception 'Unsupported Storage bucket.'
      using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_bucket_id || ':' || p_object_path, 0)
  );

  if exists (
    select 1
    from public.storage_cleanup_queue q
    where q.bucket_id = p_bucket_id
      and q.object_path = p_object_path
      and q.status = 'processing'
  ) then
    raise exception 'The Storage object is already being cleaned up.'
      using errcode = '55000';
  end if;

  update public.storage_cleanup_queue q
  set available_at = greatest(q.available_at, now() + interval '48 hours')
  where q.bucket_id = p_bucket_id
    and q.object_path = p_object_path
    and q.status = 'pending';
end;
$function$;

create or replace function public.can_delete_storage_object(
  p_bucket_id text,
  p_object_path text
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null or p_object_path is null then
    return false;
  end if;

  if p_bucket_id = 'public-images' then
    if not public.is_admin() then
      return false;
    end if;
  elsif p_bucket_id = 'student-private-media' then
    if split_part(p_object_path, '/', 1) <> current_user_id::text
       and not public.is_admin() then
      return false;
    end if;
  elsif p_bucket_id = 'excuse-documents' then
    if not public.is_admin() then
      return false;
    end if;
  else
    return false;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_bucket_id || ':' || p_object_path, 0)
  );

  return not public.is_storage_object_referenced(p_bucket_id, p_object_path);
end;
$function$;

create or replace function public.guard_new_storage_references()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  value text;
  object_path text;
  old_media text[];
  new_media text[];
  slide jsonb;
  old_slide_values text[];
  new_settings jsonb;
begin
  if tg_table_name = 'profiles' then
    if coalesce(new.photo_url, '') ~* '/storage/v1/object/sign/'
       or coalesce(new.cover_photo_url, '') ~* '/storage/v1/object/sign/'
       or coalesce(new.id_photo_url, '') ~* '/storage/v1/object/sign/' then
      raise exception 'Signed Storage URLs must never be persisted in profiles.'
        using errcode = '23514';
    end if;

    if tg_op = 'INSERT'
       or old.photo_url is distinct from new.photo_url then
      object_path := public.storage_object_path(
        'student-private-media', new.photo_url
      );
      if object_path is not null then
        perform public.assert_storage_reference(
          'student-private-media', object_path, new.id, 'profile'
        );
      elsif public.storage_object_path('public-images', new.photo_url) is not null then
        raise exception 'Student profile images must not use public-images.'
          using errcode = '23514';
      end if;
    end if;

    if tg_op = 'INSERT'
       or old.cover_photo_url is distinct from new.cover_photo_url then
      object_path := public.storage_object_path(
        'student-private-media', new.cover_photo_url
      );
      if new.cover_photo_url is not null and object_path is null then
        raise exception 'Student cover images must use private Storage paths.'
          using errcode = '23514';
      end if;
      if object_path is not null then
        perform public.assert_storage_reference(
          'student-private-media', object_path, new.id, 'cover'
        );
      end if;
    end if;

    if tg_op = 'INSERT'
       or old.id_photo_url is distinct from new.id_photo_url then
      object_path := public.storage_object_path(
        'student-private-media', new.id_photo_url
      );
      if new.id_photo_url is not null and object_path is null then
        raise exception 'Student ID images must use private Storage paths.'
          using errcode = '23514';
      end if;
      if object_path is not null then
        perform public.assert_storage_reference(
          'student-private-media', object_path, new.id, 'id'
        );
      end if;
    end if;

  elsif tg_table_name = 'events' then
    if tg_op = 'INSERT' or old.image_url is distinct from new.image_url then
      object_path := public.storage_object_path('public-images', new.image_url);
      if object_path is not null then
        perform public.assert_storage_reference(
          'public-images', object_path
        );
      end if;
    end if;

    old_media := case
      when tg_op = 'INSERT' then '{}'::text[]
      else coalesce(old.media_urls, '{}'::text[])
    end;
    new_media := coalesce(new.media_urls, '{}'::text[]);
    foreach value in array new_media loop
      if not value = any(old_media) then
        object_path := public.storage_object_path('public-images', value);
        if object_path is not null then
          perform public.assert_storage_reference(
            'public-images', object_path
          );
        end if;
      end if;
    end loop;

  elsif tg_table_name = 'announcements' then
    if tg_op = 'INSERT' or old.media_url is distinct from new.media_url then
      object_path := public.storage_object_path(
        'public-images', new.media_url
      );
      if object_path is not null then
        perform public.assert_storage_reference(
          'public-images', object_path
        );
      end if;
    end if;

  elsif tg_table_name = 'excuse_requests' then
    if tg_op = 'INSERT'
       or old.document_url is distinct from new.document_url then
      object_path := public.storage_object_path(
        'excuse-documents', new.document_url
      );
      if new.document_url is not null and object_path is null then
        raise exception 'Excuse attachments must use private object paths.'
          using errcode = '23514';
      end if;
      if object_path is not null then
        perform public.assert_storage_reference(
          'excuse-documents', object_path, new.student_id
        );
      end if;
    end if;

  elsif tg_table_name = 'system_settings'
    and (tg_op = 'INSERT' or old.settings is distinct from new.settings) then
    new_settings := coalesce(new.settings, '{}'::jsonb);
    if jsonb_typeof(new_settings -> 'carouselSlides') = 'array' then
      for slide in
        select item.value
        from jsonb_array_elements(new_settings -> 'carouselSlides') item(value)
      loop
        foreach value in array array[
          slide ->> 'imageUrl', slide ->> 'posterUrl'
        ] loop
          if value is null then
            continue;
          end if;

          old_slide_values := '{}'::text[];
          if tg_op = 'UPDATE'
             and jsonb_typeof(old.settings -> 'carouselSlides') = 'array' then
            select coalesce(array_agg(distinct old_value), '{}'::text[])
            into old_slide_values
            from jsonb_array_elements(old.settings -> 'carouselSlides') item(value)
            cross join lateral jsonb_array_elements_text(
              jsonb_build_array(
                item.value ->> 'imageUrl',
                item.value ->> 'posterUrl'
              )
            ) old_values(old_value)
            where old_value is not null;
          end if;

          if not value = any(old_slide_values) then
            object_path := public.storage_object_path('public-images', value);
            if object_path is not null then
              perform public.assert_storage_reference(
                'public-images', object_path
              );
            end if;
          end if;
        end loop;
      end loop;
    end if;
  end if;

  return new;
end;
$function$;

create or replace function public.lock_storage_cleanup_claim()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.status = 'processing'
     and old.status is distinct from new.status then
    perform pg_advisory_xact_lock(
      hashtextextended(new.bucket_id || ':' || new.object_path, 0)
    );
  end if;
  return new;
end;
$function$;

create or replace function public.enqueue_storage_cleanup_value(
  p_value text,
  p_bucket_id text default 'public-images'
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  object_path text;
begin
  if p_value is null or btrim(p_value) = '' or p_bucket_id is null
     or p_bucket_id not in (
       'public-images', 'student-private-media', 'excuse-documents'
     ) then
    return;
  end if;

  object_path := public.storage_object_path(p_bucket_id, p_value);
  if object_path is null then return; end if;

  insert into public.storage_cleanup_queue (
    bucket_id,
    object_path,
    status,
    attempts,
    available_at
  ) values (
    p_bucket_id,
    object_path,
    'pending',
    0,
    now()
  )
  on conflict do nothing;
end;
$function$;

create or replace function public.enqueue_removed_profile_media()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if tg_op = 'DELETE' then
    perform public.enqueue_storage_cleanup_value(
      old.photo_url, 'student-private-media'
    );
    perform public.enqueue_storage_cleanup_value(
      old.cover_photo_url, 'student-private-media'
    );
    perform public.enqueue_storage_cleanup_value(
      old.id_photo_url, 'student-private-media'
    );
  else
    if old.photo_url is distinct from new.photo_url then
      perform public.enqueue_storage_cleanup_value(
        old.photo_url, 'student-private-media'
      );
    end if;
    if old.cover_photo_url is distinct from new.cover_photo_url then
      perform public.enqueue_storage_cleanup_value(
        old.cover_photo_url, 'student-private-media'
      );
    end if;
    if old.id_photo_url is distinct from new.id_photo_url then
      perform public.enqueue_storage_cleanup_value(
        old.id_photo_url, 'student-private-media'
      );
    end if;
  end if;
  return coalesce(new, old);
end;
$function$;

create or replace function public.enqueue_removed_event_media()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  old_url text;
  new_media text[];
begin
  if tg_op = 'DELETE' then
    perform public.enqueue_storage_cleanup_value(old.image_url);
    foreach old_url in array coalesce(old.media_urls, '{}'::text[]) loop
      perform public.enqueue_storage_cleanup_value(old_url);
    end loop;
  else
    new_media := coalesce(new.media_urls, '{}'::text[]);
    if old.image_url is distinct from new.image_url then
      perform public.enqueue_storage_cleanup_value(old.image_url);
    end if;
    foreach old_url in array coalesce(old.media_urls, '{}'::text[]) loop
      if not (old_url = any(new_media)) then
        perform public.enqueue_storage_cleanup_value(old_url);
      end if;
    end loop;
  end if;
  return coalesce(new, old);
end;
$function$;

create or replace function public.enqueue_removed_announcement_media()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if tg_op = 'DELETE' then
    perform public.enqueue_storage_cleanup_value(old.media_url);
  elsif old.media_url is distinct from new.media_url then
    perform public.enqueue_storage_cleanup_value(old.media_url);
  end if;
  return coalesce(new, old);
end;
$function$;

create or replace function public.enqueue_removed_excuse_media()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if tg_op = 'DELETE' then
    perform public.enqueue_storage_cleanup_value(
      old.document_url,
      'excuse-documents'
    );
  elsif old.document_url is distinct from new.document_url then
    perform public.enqueue_storage_cleanup_value(
      old.document_url,
      'excuse-documents'
    );
  end if;
  return coalesce(new, old);
end;
$function$;

create or replace function public.enqueue_removed_settings_media(
  p_old_settings jsonb,
  p_new_settings jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  old_value text;
  old_slide jsonb;
  new_settings jsonb := coalesce(p_new_settings, '{}'::jsonb);
begin
  for old_slide in
    select value
    from jsonb_array_elements(
      coalesce(p_old_settings -> 'carouselSlides', '[]'::jsonb)
    ) as item(value)
  loop
    for old_value in
      select value
      from jsonb_array_elements_text(
        jsonb_build_array(old_slide ->> 'imageUrl', old_slide ->> 'posterUrl')
      ) as item(value)
      where value is not null and value <> ''
    loop
      if not exists (
        select 1
        from jsonb_array_elements(
          coalesce(new_settings -> 'carouselSlides', '[]'::jsonb)
        ) as item(value)
        where item.value ->> 'imageUrl' = old_value
           or item.value ->> 'posterUrl' = old_value
      ) then
        perform public.enqueue_storage_cleanup_value(old_value);
      end if;
    end loop;
  end loop;
end;
$function$;

create or replace function public.enqueue_removed_system_settings_media()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  begin
    if tg_op = 'DELETE' then
      perform public.enqueue_removed_settings_media(old.settings, '{}'::jsonb);
    else
      perform public.enqueue_removed_settings_media(old.settings, new.settings);
    end if;
  exception when others then
    raise warning 'Settings media cleanup enqueue skipped: %', sqlerrm;
  end;

  return coalesce(new, old);
end;
$function$;

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

commit;
