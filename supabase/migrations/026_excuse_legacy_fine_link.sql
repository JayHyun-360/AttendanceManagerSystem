-- Preserve valid legacy fine relationships when attendance_scan_id is absent.
begin;

with candidate_links as (
  select
    request.id as request_id,
    (array_agg(fine.id order by fine.created_at, fine.id))[1] as fine_id
  from public.excuse_requests request
  join public.fines fine
    on fine.student_id = request.student_id
   and fine.status = 'unpaid'
   and (
     fine.attendance_scan_id = request.attendance_scan_id
     or (
       fine.attendance_scan_id is null
       and fine.event_id = request.event_id
       and fine.session_label = request.session_label
     )
   )
  where request.fine_id is null
    and request.status in ('pending', 'approved')
  group by request.id
  having count(*) = 1
)
update public.excuse_requests request
set fine_id = candidate_links.fine_id
from candidate_links
where request.id = candidate_links.request_id;

-- Approved legacy requests with a now-linked unpaid fine retain the approved
-- outcome and do not leave that fine payable.
update public.fines fine
set status = 'excused'
where fine.status = 'unpaid'
  and exists (
    select 1
    from public.excuse_requests request
    where request.fine_id = fine.id
      and request.status = 'approved'
  );

create or replace function public.link_excuse_request_fine()
returns trigger
language plpgsql
security definer
set search_path = public
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

revoke all on function public.link_excuse_request_fine() from public;
grant execute on function public.link_excuse_request_fine() to authenticated;

drop trigger if exists excuse_requests_link_fine
  on public.excuse_requests;
create trigger excuse_requests_link_fine
before insert on public.excuse_requests
for each row execute function public.link_excuse_request_fine();

commit;