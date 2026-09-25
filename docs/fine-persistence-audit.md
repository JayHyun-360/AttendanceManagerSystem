# Fine Persistence Audit

**Scope:** Admin student profile / fine-clearance view, student onboarding, attendance scan persistence, and Supabase fine lifecycle migrations.

**Conclusion:** A new student should not require rerunning a SQL migration. Migration `019_persist_inferred_absences_for_clearance.sql` is a historical backfill script, not a recurring application workflow. The current system has no automatic mechanism that materializes missed attendance sessions for a student who signs up after the migration was run.

## Findings

### 1. The warning is caused by an empty persistent-fines query, not by a failed signup

The admin student profile loads persisted `fines` rows and constructs its clearance list only from attendance-session records that have a persisted fine ID. When that list is empty, it displays:

> No persistent fine records yet. Run the clearance SQL migration to persist inferred absences.

This message is rendered in `app/(protected)/admin-students/[id]/page.tsx` around lines 622–627. It is therefore possible for the student fines page to infer a fine in memory while the admin clearance page still has nothing it can mark as paid.

### 2. Migration 019 is a one-time, global backfill

Migration `019_persist_inferred_absences_for_clearance.sql` cross joins:

- every eligible historical event, and
- every student profile,

then inserts missing `attendance_scans` rows with status `absent`. Its `NOT EXISTS` predicate and unique constraint make rerunning it broadly idempotent, but it is still a migration intended to repair historical state. It does not install a trigger, RPC, scheduled job, or other future automation.

Consequently, a student created after the migration ran has no inferred rows for earlier events. Running the migration again happens to repair that student, but only because the migration scans the entire historical population again.

### 3. The signup flow creates or updates only the profile

`app/(protected)/onboarding/page.tsx` validates the onboarding form and upserts one row in `profiles`. It does not insert attendance scans, invoke a database function, or request fine reconciliation.

The existing `auth.users` trigger in `001_initial_schema.sql` creates an initial profile before onboarding details are complete. The onboarding upsert later fills in the program and other student fields. This ordering matters: a profile-insert trigger would run too early to reliably apply program-specific events unless it also handles the later program update.

### 4. Fine creation is automatic only after an attendance scan exists

The fine lifecycle in migrations `015` and `021` uses an `attendance_scans` trigger. When a late or absent scan is inserted or updated, the trigger can calculate and create a persistent fine. It does not create an absent scan merely because an event date has passed or because a student enrolled.

This is the missing link:

`new student / passed event` → **no attendance scan** → no trigger invocation → no persistent fine.

### 5. There is a migration-order / policy detail to preserve

Migration `021_fines_sanctions_policy.sql` adds `fine_policy_enabled` and snapshots the global fines setting when a scan first becomes late or absent. Rows inserted by migration 019 before this column existed are subsequently treated as legacy rows and set to `fine_policy_enabled = false` by migration 021.

Any replacement automation added after migration 021 must insert inferred scans through the current trigger path and must preserve the intended policy behavior. It should not blindly copy migration 019's insert shape if the current schema expects policy capture.

### 6. The student-facing page already supports inferred display, but that is not enough for clearance

`app/(protected)/my-fines/page.tsx` calls `buildAttendanceSessionRecords` and can construct virtual IDs such as `inferred-${record.key}` for absent/late sessions without persisted fines. That supports display, but those virtual rows cannot be updated to `paid` because no database fine ID exists.

The admin clearance workflow correctly requires real persisted fine rows. The problem is therefore persistence/materialization, not simply a rendering defect.

## Root cause

The system currently mixes two representations:

1. **Derived attendance/fine state:** client-side inference from past events, used for display.
2. **Persistent attendance/fine state:** `attendance_scans` and `fines` rows, required for clearance.

Migration 019 was introduced to bridge those representations, but only for the population present when it is executed. There is no ongoing bridge for later signups or newly finalized events.

## Recommendations

| Approach | Tradeoffs | Cost | Setup Complexity |
|---|---|---:|---:|
| **Recommended: idempotent database function called after onboarding** | Materializes only the new student's eligible past sessions; uses the existing unique key and fine trigger; works immediately after the student's program is known. Requires one new migration and one authenticated RPC call from onboarding, plus a small retry/error path. | Low; normal database work and one request per signup | Medium |
| **Database trigger on profile program/role completion** | Fully automatic from the application's perspective and cannot be skipped by a client. Must avoid firing on the initial incomplete auth profile; should run after `program` is populated and remain idempotent. Trigger execution can make profile updates slower and requires careful security-definer and policy testing. | Low recurring cost | Medium–High |
| **Scheduled reconciliation job** | Periodically catches new students and newly completed events even if an onboarding request fails. It is robust for backfill, but results are delayed and it adds hosting/scheduling infrastructure. It is unnecessary as the only solution for a signup event. | Low–Medium, depending on hosting | Medium |
| **Keep rerunning migration 019 manually** | No code change, but global, repetitive, easy to forget, and unsuitable as the normal application lifecycle. It also obscures whether the deployed database has all migrations applied. | Operator time; potentially expensive at scale | Low initially, high operational burden |

## Recommended target behavior

Add a new idempotent SQL function, for example `materialize_student_inferred_absences(p_student_id uuid)`, with these properties:

- Require a valid student profile and use the student's current program.
- Select only events with `event_date <= current_date`, non-upcoming status, and matching program scope.
- Generate morning only for single-session events and morning plus afternoon for multi-session events.
- Insert only missing `(event_id, student_id, session_label)` rows.
- Insert them as `absent` with null scan timestamps and no scanner identity.
- Let the current attendance/fine triggers calculate the persistent fine according to the active policy.
- Be safe to call repeatedly through `ON CONFLICT DO NOTHING`.
- Return the number of rows inserted so onboarding can log or display a non-blocking result.

Call it after the onboarding `profiles.upsert`, when the program is present. A second call after a failed request should be safe. For stronger coverage, add a lightweight scheduled reconciliation for all students/events as a safety net, especially when an event transitions from upcoming to completed or when event dates are edited.

## Important product decision

The system needs an explicit rule for whether a student who enrolls today should be charged for older events that occurred before enrollment. Migration 019 currently applies to every student profile regardless of `created_at`, so the proposed function would preserve that behavior unless the business rule changes.

Two possible rules are:

- **Preserve current behavior:** backfill all eligible historical events for the student.
- **More conservative behavior:** backfill only events on or after the student's effective enrollment date.

This is a business-policy choice, not a technical limitation. It should be decided before implementation because it changes amounts owed.

## Audit limitations

The repository contains migrations through `021_fines_sanctions_policy.sql`, but the Supabase CLI is not installed in this workspace, so the deployed database's migration history could not be queried from the local shell. The code audit therefore confirms the local implementation and migration design, but does not prove whether migrations 019–021 have already been applied to the connected Supabase project.

Before implementation, verify the deployed database has the expected columns, unique constraint, and trigger definitions. If migration 019 has never been applied in production, it should be applied once as a historical backfill; after that, the new function/trigger path should handle future changes.

## Files reviewed

- `supabase/migrations/019_persist_inferred_absences_for_clearance.sql`
- `supabase/migrations/018_reconcile_late_absent_fines.sql`
- `supabase/migrations/015_attendance_fine_lifecycle.sql`
- `supabase/migrations/021_fines_sanctions_policy.sql`
- `supabase/migrations/001_initial_schema.sql`
- `app/(protected)/onboarding/page.tsx`
- `app/(protected)/admin-students/[id]/page.tsx`
- `app/(protected)/my-fines/page.tsx`
- `src/lib/attendance-fines.ts`
- `src/lib/attendance.ts`

**No source or migration files were changed as part of this audit.**

## Suggested next implementation step

Implement the recommended idempotent database function and call it after successful onboarding. Then add integration tests covering: first signup, repeated onboarding, program-specific events, multi-session events, fines-disabled policy, and clearing the resulting persistent fine from the admin view.

This removes the need for administrators to rerun SQL for each student while retaining migration 019 as a one-time historical repair tool.

---

**Audit status:** Complete; implementation intentionally not started pending confirmation of the enrollment-date charging rule and the preferred automation option.
