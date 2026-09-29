-- Excuse requests are separate from monetary fines and event sanctions.
-- Students submit pending requests through an ownership-checked RPC; admins
-- review them through a separate RPC that records the reviewer and timestamp.
begin;

alter table public.excuse_requests
  add column if not exists session_label text;

update public.excuse_requests request
set
  event_id = coalesce(
    request.event_id,
    (select scan.event_id
     from public.attendance_scans scan
     where scan.id = request.attendance_scan_id),
    (select fine.event_id
     from public.fines fine
     where fine.id = request.fine_id)
  ),
  session_label = coalesce(
    request.session_label,
    (select scan.session_label
     from public.attendance_scans scan
     where scan.id = request.attendance_scan_id),
    (select fine.session_label
     from public.fines fine
     where fine.id = request.fine_id)
  )
where request.event_id is null or request.session_label is null;

alter table public.excuse_requests
  drop constraint if exists excuse_requests_fine_id_fkey;

alter table public.excuse_requests
  add constraint excuse_requests_fine_id_fkey
  foreign key (fine_id) references public.fines(id) on delete set null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'excuse_requests_session_label_check'
      and conrelid = 'public.excuse_requests'::regclass
  ) then
    alter table public.excuse_requests
      add constraint excuse_requests_session_label_check
      check (session_label is null or session_label in ('morning', 'afternoon'));
  end if;
end;
$$;

create index if not exists excuse_requests_student_event_session_status_idx
  on public.excuse_requests (student_id, event_id, session_label, status);

-- A private attachment is stored below the submitting student's UUID folder.
drop policy if exists storage_excuse_documents_authenticated_upload
  on storage.objects;

create policy storage_excuse_documents_authenticated_upload
  on storage.objects
  for insert
  with check (
    bucket_id = 'excuse-documents'
    and auth.role() = 'authenticated'
    and split_part(name, '/', 1) = auth.uid()::text
    and split_part(name, '/', 2) <> ''
    and position('/' in split_part(name, '/', 2)) = 0
  );

-- Client table writes are intentionally disabled. The security-definer RPCs
-- below validate identity, policy, eligibility, and state transitions.
drop policy if exists excuse_insert_student on public.excuse_requests;
drop policy if exists excuse_update_admin on public.excuse_requests;

create or replace function public.submit_excuse_request(
  p_event_id uuid,
  p_session_label text,
  p_reason text,
  p_document_path text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
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

revoke all on function public.submit_excuse_request(uuid, text, text, text)
  from public;
grant execute on function public.submit_excuse_request(uuid, text, text, text)
  to authenticated;

create or replace function public.review_excuse_request(
  p_request_id uuid,
  p_decision public.excuse_status
)
returns void
language plpgsql
security definer
set search_path = public
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

revoke all on function public.review_excuse_request(uuid, public.excuse_status)
  from public;
grant execute on function public.review_excuse_request(uuid, public.excuse_status)
  to authenticated;

create or replace function public.reconcile_excuse_fine()
returns trigger
language plpgsql
security definer
set search_path = public
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

drop trigger if exists excuse_requests_reconcile_fine
  on public.excuse_requests;
create trigger excuse_requests_reconcile_fine
after update of status on public.excuse_requests
for each row execute function public.reconcile_excuse_fine();

commit;