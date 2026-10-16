begin;

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
        event.sanctions_enabled,
        event.end_time,
        event.morning_end,
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
        event.program as event_program,
        event.sanctions_enabled,
        event.absent_fine,
        event.late_fine,
        event.morning_absent_fine,
        event.morning_late_fine,
        event.afternoon_absent_fine,
        event.afternoon_late_fine,
        session.session_label,
        session.session_end
      from filtered_events event
      cross join lateral (
        values
          (
            'morning'::text,
            case
              when coalesce(event.multi_session, false)
                then event.morning_end
              else coalesce(event.morning_end, event.end_time)
            end
          ),
          ('afternoon'::text, event.afternoon_end)
      ) as session(session_label, session_end)
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
          when v_fines_enabled then
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
          and coalesce(scan.status::text, 'no_record') in ('late', 'absent')
        ) as is_sanctioned
      from completed_sessions session
      join public.profiles profile
        on profile.role = 'student'
        and (
          session.event_program is null
          or session.event_program = ''
          or session.event_program = 'All Programs'
          or session.event_program = profile.program
        )
      left join public.attendance_scans scan
        on scan.event_id = session.event_id
        and scan.student_id = profile.id
        and scan.session_label = session.session_label
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
        count(*) filter (where not record.is_excused) as total,
        count(*) filter (
          where record.record_status in ('present', 'late')
            and record.scan_in_at is not null
        ) as present,
        count(*) filter (
          where not record.is_excused
            and record.record_status in ('absent', 'no_record')
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
            and record.record_status in ('absent', 'no_record')
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

revoke all on function public.get_admin_report_aggregates(date, date, integer, integer)
  from public;
grant execute on function public.get_admin_report_aggregates(date, date, integer, integer)
  to authenticated;

notify pgrst, 'reload schema';

commit;
