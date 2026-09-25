# Fines and Sanctions Architecture Audit

**Audit date:** 2026-09-25

**Scope:** Event fine configuration, global monetary-fine settings, event sanctions, attendance capture, inferred-absence persistence, fine lifecycle, excuse requests, clearance, student views, and reports.

## Executive summary

The SQL automation that was run successfully addresses one gap: it materializes missing past attendance sessions when a student's profile is inserted or its program changes. It does **not** cover every point at which the system's business state changes.

The most important confirmed issues are:

1. **Future event gap:** A student who signs up before a future event will not automatically receive an inferred absence after that event passes, because the installed trigger listens only to `profiles`, not to event completion/date changes or a scheduled reconciliation.
2. **Global fines visibility mismatch:** The client-side calculation can display inferred monetary fines even when the global `finesEnabled` setting is off, while the database trigger correctly suppresses persistent fines in that state.
3. **Sanctions and monetary fines are separate in the database:** `events.sanctions_enabled` controls the “Sanctioned” display label, but it is not consulted by the fine-creation trigger. A late/absent record can therefore create a monetary fine when event sanctions are disabled, provided global fines are enabled. This may be intentional, but the UI and policy wording should make the distinction explicit.
4. **Historical charging remains a policy risk:** The installed one-time repair processes all current students against all eligible historical events, including events before signup. This follows migration 019's behavior but may not match the intended enrollment policy.

No source files were changed during this audit.

## System flow

### Configuration layer

The admin settings page stores `finesEnabled`, `showFees`, and `allowExcuseRequests` in `system_settings.settings` as JSONB. The `finesEnabled` value is used by the database function `public.is_fines_enabled()` and is snapshotted into `attendance_scans.fine_policy_enabled` when a scan first becomes late or absent.

Event records separately contain:

- legacy fallback amounts: `absent_fine`, `late_fine`;
- session-specific amounts: morning/afternoon absent and late fine columns;
- `sanctions_enabled`, which is an event-level sanctions/display switch; and
- lifecycle status (`upcoming`, `active`, or `closed`).

`showFees` affects student-facing visibility, not whether the database creates a fine. `allowExcuseRequests` controls request availability in the UI, while the database policies and triggers govern the actual record changes.

### Attendance layer

Attendance is stored in `attendance_scans`, one row per event/student/session. The uniqueness constraint on `(event_id, student_id, session_label)` prevents duplicate sessions.

The normal scanner/manual path writes `present`, `late`, or `absent`. The trigger installed by migration 021 captures the current global fines policy when a scan first becomes late or absent, then the reconciliation trigger creates or updates a persistent `fines` row when the policy snapshot is enabled and the calculated amount is positive.

When a scan changes from late/absent to present, unpaid linked fines are removed while paid history is retained. When an unpaid fine is updated through a late/absent scan, its amount is recalculated from the current event session price; paid history is protected.

### Inferred absence layer

The client utility `buildAttendanceSessionRecords()` treats any applicable past event/session without a scan as `no_record` and calculates a possible fine locally. Migration 019 and the newly installed profile trigger materialize those missing sessions as actual `absent` scans so the attendance-fine trigger can create persistent rows.

This produces two possible states:

| State | Attendance row | Fine row | Can admin clear it? |
|---|---:|---:|---:|
| Virtual inferred absence | No | No | No |
| Persisted inferred absence with fines enabled | Yes | Yes, when amount > 0 | Yes |
| Persisted inferred absence with fines disabled | Yes | No | No monetary fine exists |
| Persisted absence with zero event amount | Yes | No | No monetary fine exists |

## Confirmed findings

### Finding F-01 — Profile automation does not handle future events

**Severity: High for correctness over time.**

The installed trigger runs when a student profile is inserted or when `role`/`program` changes. Its query is limited to events with `event_date <= current_date` at that moment.

Example:

1. Student signs up on September 1.
2. Event is scheduled for September 10.
3. Student does not attend.
4. September 10 passes.

No profile update occurs on September 10, so no absent scan or persistent fine is created. The student-facing client may still infer an absence, but the admin clearance view cannot clear a persistent fine that does not exist.

**Recommendation:** Add either an event-side materialization trigger/function when an event becomes closed/eligible, or a recurring reconciliation job. The strongest design uses both: event-side reconciliation for normal operation and an idempotent periodic repair for missed transitions.

### Finding F-02 — Client-side monetary calculations ignore global `finesEnabled`

**Severity: High for policy consistency.**

`buildAttendanceSessionRecords()` calculates `fineAmount` for late, absent, and `no_record` statuses directly from event prices. It does not receive or check `system_settings.settings.finesEnabled`.

The database trigger in migration 021 does check the global setting indirectly through `fine_policy_enabled`. Therefore, when `finesEnabled = false`:

- no new persistent fine should be created;
- the admin persistent fine list can be empty; but
- student fines, attendance history, metrics, or reports may still show locally inferred monetary amounts.

The settings UI says that disabled fines prevent new attendance records from creating monetary fines, but the client display logic can still present those amounts as if they were owed.

**Recommendation:** Centralize policy-aware fine calculation. Pass a `finesEnabled` flag into the shared calculation utility, or filter monetary output at the route level. For policy-disabled sessions, keep attendance/sanction status visible but set monetary fine amount to zero. Avoid hiding already persisted historical fines when the global switch is later turned off.

### Finding F-03 — Event sanctions and monetary fines are independent

**Severity: Medium; policy clarification required.**

The `sanctions_enabled` event field is used by `getAttendanceDisplayState()` to label late/absent sessions as “Sanctioned.” The database fine trigger does not read `events.sanctions_enabled`; it uses the global `finesEnabled` snapshot instead.

This means:

- `sanctions_enabled = false`, `finesEnabled = true`: monetary fines can be created, but the UI does not label the attendance as sanctioned.
- `sanctions_enabled = true`, `finesEnabled = false`: the UI can label a session as sanctioned, but no monetary fine should be persisted.
- both enabled: both behaviors occur.

This is a valid design only if “sanction” means a disciplinary designation separate from money. If sanctions are intended to be the prerequisite for monetary fines, the database trigger needs to include an event-level policy check and snapshot it on the attendance scan.

**Recommendation:** Decide and document one of these models:

1. **Independent model:** keep the database behavior but rename or clarify UI copy so sanctions and monetary fines are visibly separate.
2. **Coupled model:** require both global fines and event sanctions before creating a monetary fine, and persist the event-level policy decision on the attendance scan so later setting changes do not retroactively change history.

### Finding F-04 — The installed repair can charge events before signup

**Severity: High as a fairness/business-policy risk.**

The one-time `DO` block loops over every current student and calls the materialization function. The function applies all eligible historical events matching the student's current program. It does not compare `events.event_date` with `profiles.created_at` or another enrollment-effective date.

This reproduces migration 019, but it may cause a newly registered student to receive fines for events that occurred before the student joined the system.

**Recommendation:** If fines should begin only at enrollment, add an explicit effective date column or use a clearly approved enrollment timestamp. Do not infer business eligibility solely from the date the auth profile was created unless that is the intended rule.

### Finding F-05 — Fine recalculation is asymmetric across policy changes

**Severity: Medium.**

The current trigger snapshots global monetary-fine policy when a scan first becomes late/absent. This protects historical policy intent. However, if event prices are edited later, migration 021's trigger recalculates unpaid linked fines when the attendance scan is updated, but an event price update by itself does not update existing unpaid fine rows.

The UI and reports may therefore use current event prices for inferred/client-derived values while persistent unpaid fines retain the old amount until some scan update occurs.

**Recommendation:** Treat fine amounts as immutable once issued, or add a deliberate event-price-change reconciliation routine. Do not silently recalculate paid or excused rows. If recalculation is allowed for unpaid rows, expose an audit trail or admin action.

### Finding F-06 — Reports mix persistent and derived monetary state

**Severity: Medium.**

The report page uses `buildAttendanceSessionRecords()` for per-student/program totals, so it can include derived fine amounts for absent/no-record sessions. Separately, fee summary totals (`total assessed`, `collected`, `outstanding`, `waived/excused`) are computed only from persistent `fines` rows.

When persistence is incomplete or fines are globally disabled, the report can show:

- program/event fine totals that include derived amounts; and
- fee summary totals that exclude those same amounts.

This is internally inconsistent and can confuse reconciliation with accounting.

**Recommendation:** Label derived estimates separately, or make official monetary report totals persistent-only. For accounting metrics, use only `fines` rows; use attendance-derived values only for a clearly marked “potential exposure” metric.

### Finding F-07 — Excuse requests depend on persistent identifiers

The student history flow creates an excuse request with `attendance_scan_id` and attempts to find an unpaid persistent fine ID. Virtual inferred records have synthetic IDs such as `inferred-event-session`, which are not database UUIDs.

A student can therefore see a derived absence/fine but may be unable to submit a valid excuse request until the absence is materialized. This is another reason the future-event gap is user-visible, not merely an admin reporting issue.

**Recommendation:** Ensure all eligible sanctionable absences are materialized before the excuse-request action is enabled, or implement an RPC that atomically materializes the attendance/fine record and creates the excuse request.

## What the installed SQL does correctly

- It is idempotent for attendance sessions.
- It waits for a non-empty student program, avoiding the incomplete auth-created profile.
- It invokes the current attendance trigger path, so global fine policy capture remains centralized.
- It does not expose the materialization function as a general authenticated RPC.
- It runs a one-time repair for existing students.

## Recommended priority order

| Priority | Action | Reason |
|---|---|---|
| 1 | Add event-date/event-status reconciliation | Prevent future events from remaining virtual-only after the profile trigger has run. |
| 2 | Make shared fine calculation policy-aware | Prevent monetary amounts from appearing while global fines are disabled. |
| 3 | Decide whether sanctions gate monetary fines | Align database behavior, UI copy, and admin expectations. |
| 4 | Decide enrollment-date charging policy | Prevent accidental pre-enrollment liabilities. |
| 5 | Separate official accounting totals from derived estimates | Make reports reliable for reconciliation. |
| 6 | Add end-to-end tests | Cover signup, future event completion, policy toggles, event prices, clearing, and excuses. |

## Validation limitation

The local Supabase CLI is not installed, and the connected project database was not queried directly during this audit. The audit verifies repository SQL and application behavior, but cannot confirm the exact deployed trigger definitions or whether all migrations were applied in production. The SQL Editor should be used to verify the installed functions/triggers and to run the verification queries below.

## Suggested verification queries

```sql
-- Confirm the automation trigger exists.
select
  trigger_schema,
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  action_statement
from information_schema.triggers
where trigger_schema = 'public'
  and trigger_name in (
    'profiles_materialize_student_absences',
    'attendance_scans_capture_fine_policy',
    'attendance_scans_reconcile_fine'
  )
order by event_object_table, trigger_name;
```

```sql
-- Find virtual-only eligible sessions that still lack a persisted scan.
select
  p.student_id,
  p.id as profile_id,
  e.id as event_id,
  e.title,
  e.event_date,
  sessions.session_label
from public.profiles p
join public.events e
  on e.event_date <= current_date
 and coalesce(e.status, '') <> 'upcoming'
 and (
   e.program is null
   or e.program = 'All Programs'
   or e.program = p.program
 )
cross join lateral (
  values ('morning'::text), ('afternoon'::text)
) sessions(session_label)
where p.role = 'student'
  and nullif(trim(coalesce(p.program, '')), '') is not null
  and (
    (coalesce(e.multi_session, false) = false and sessions.session_label = 'morning')
    or coalesce(e.multi_session, false) = true
  )
  and not exists (
    select 1
    from public.attendance_scans s
    where s.event_id = e.id
      and s.student_id = p.id
      and s.session_label = sessions.session_label
  )
order by e.event_date, p.student_id, sessions.session_label;
```

```sql
-- Compare persisted fine status with attendance policy snapshots.
select
  f.id as fine_id,
  f.student_id,
  f.event_id,
  f.session_label,
  f.amount,
  f.status as fine_status,
  s.status as attendance_status,
  s.fine_policy_enabled,
  e.sanctions_enabled,
  e.event_date
from public.fines f
left join public.attendance_scans s on s.id = f.attendance_scan_id
left join public.events e on e.id = f.event_id
order by e.event_date desc, f.created_at desc;
```

**Audit status:** Complete. The installed SQL solves profile-time historical persistence but should not yet be considered a complete fine-and-sanctions automation strategy until the future-event and policy-display gaps are addressed.
