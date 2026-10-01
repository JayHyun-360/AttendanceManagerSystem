begin;

create table if not exists public.event_feedback (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (
    comment is null or char_length(btrim(comment)) <= 2000
  ),
  created_at timestamptz not null default now(),
  constraint event_feedback_event_student_unique unique (event_id, student_id)
);

alter table public.event_feedback enable row level security;
revoke all on table public.event_feedback from anon, authenticated;
grant select on table public.event_feedback to authenticated;

drop policy if exists event_feedback_select_admin
  on public.event_feedback;
create policy event_feedback_select_admin
  on public.event_feedback
  for select to authenticated
  using (public.is_admin());

create or replace function public.get_my_event_feedback_status(p_event_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_student_id uuid := auth.uid();
  v_event_status text;
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

  select event.status::text
    into v_event_status
  from public.events event
  where event.id = p_event_id;

  if not found or v_event_status <> 'closed' then
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
set search_path = public, pg_temp
as $$
declare
  v_student_id uuid := auth.uid();
  v_event_status text;
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

  select event.status::text
    into v_event_status
  from public.events event
  where event.id = p_event_id
  for share;

  if not found or v_event_status <> 'closed' then
    raise exception 'Feedback can only be submitted after an event is closed.'
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

revoke all on function public.get_my_event_feedback_status(uuid)
  from public, anon;
grant execute on function public.get_my_event_feedback_status(uuid)
  to authenticated;

revoke all on function public.submit_event_feedback(uuid, integer, text)
  from public, anon;
grant execute on function public.submit_event_feedback(uuid, integer, text)
  to authenticated;

commit;