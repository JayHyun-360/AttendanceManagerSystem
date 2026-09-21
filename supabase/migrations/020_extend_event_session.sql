-- Adesse event session extension
-- Extends one session by 5-30 minutes, moves its late cutoff to the new end,
-- upgrades affected late scans in one transaction, and reconciles unpaid fines
-- through the existing attendance_scans fine trigger plus an explicit safeguard.

begin;

create or replace function public.extend_event_session(
  p_event_id uuid,
  p_session_label text,
  p_extension_minutes integer
)
returns table (
  event_id uuid,
  session_label text,
  new_end_time time,
  upgraded_count integer
)
language plpgsql
security definer
set search_path = public, auth
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

revoke all on function public.extend_event_session(uuid, text, integer) from public;
grant execute on function public.extend_event_session(uuid, text, integer) to authenticated;

commit;
