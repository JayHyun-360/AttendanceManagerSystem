# Manual Supabase upgrades

This directory contains forward-only SQL for databases that already exist. It
is not the fresh-install package and does not replace the archived migration
history.

## Current live database: no upgrade SQL remains to run

Upgrade 001 has already been applied to the live database. The revised,
atomic Upgrade 002 has also already been applied, and its post-upgrade
inspection passed. Do not run Upgrade 001, Upgrade 002, or the fallback
lockout on that database again.

## Files and effects

| File | Purpose | Effect |
| --- | --- | --- |
| `001_first_year_id_exception_inspect.sql` | Read-only catalog inspection of the pre-feature rebuild baseline before Upgrade 001. | Read-only; repeatable. |
| `001_first_year_id_exception.sql` | Adds the original first-year ID exception workflow to an existing pre-feature rebuild database. | Modifies schema, routines, triggers, policies, and grants. Run once only, and never on the current live database or on top of the rebuild baseline. |
| `002_live_preflight_readonly.sql` | Checks whether a database matches the expected post-001, pre-002 starting point and reports potentially conflicting data and objects. | Read-only; repeatable. It is a pre-upgrade check, not a post-upgrade verification. |
| `002_expand_student_id_exception.sql` | Expands the workflow to request history and all supported student reasons. It assigns request IDs to existing rows and adds the new request fields, constraints, indexes, policies, and RPCs. The legacy RPC lockout and assertions are part of the same transaction. | Modifies schema, existing request rows, routines, policies, and grants. Run once only on a verified post-001, pre-002 database. |
| `002_expand_student_id_exception_inspect.sql` | Inspects the resulting request table, policies, privileges, triggers, and RPC definitions after Upgrade 002. | Read-only; repeatable. |
| `002_post_cutover_disable_legacy_rpcs.sql` | Redundant permission-only fallback for a database that already ran an older, non-atomic Upgrade 002 revision. | Modifies legacy RPC EXECUTE grants. Not a normal step after the revised atomic Upgrade 002. |

The inspection and preflight files contain SELECT-only queries. Upgrade 001,
Upgrade 002, and the fallback contain database changes. Upgrade 002 has an
explicit transaction; its legacy lockout checks run before its `COMMIT`.
Read-only queries after that `COMMIT` cannot roll back a completed upgrade.

## Choose the correct database path

1. **Fresh project:** use the consolidated `supabase/rebuild/` package and its
   [runbook](../rebuild/README.md). That baseline already includes the
   post-001 structure; do not apply Upgrade 001 on top of it. If the project
   needs the expanded all-year workflow, apply Upgrade 002 only after verifying
   that the resulting database matches its expected post-001 starting point.
2. **Existing pre-001 project:** Upgrade 001 is only for a database matching
   the previous pre-feature rebuild baseline. Inspect it with
   `001_first_year_id_exception_inspect.sql` and compare the live definitions
   before considering the upgrade. The current live database has already
   passed this step; do not rerun it there.
3. **Existing post-001, pre-002 project:** follow the Upgrade 002 sequence
   below. Do not use archived migrations as a substitute for checking the
   actual database.
4. **Current live project:** both upgrades are already complete. Do not run
   any mutating SQL in this directory against it.

## Upgrade 002 sequence for an eligible pre-002 database

1. Verify the target project and a recoverable backup/PITR window. Do not
   assume local test data represents the target database.
2. Run `002_live_preflight_readonly.sql` in the Supabase SQL Editor, one
   statement at a time. Start with Sections 1-3. Run Sections 4-7 only after
   Sections 2 and 3 confirm the referenced relations and columns exist. Review
   Sections 8-10 as directed by the file. Stop if required post-001 objects or
   columns are missing, any 002-only object is present, or the structure,
   privileges, routines, triggers, or data assumptions differ from the
   expected baseline.
3. Apply `002_expand_student_id_exception.sql` once, as a whole. Do not run
   selected fragments or replay the file. The transaction changes the request
   table and related database objects and disables the three legacy RPCs
   atomically. If execution reports an error, stop and inspect transaction and
   catalog state before taking any further action; do not blindly rerun it.
4. After the transaction succeeds, run
   `002_expand_student_id_exception_inspect.sql` separately, following its
   instructions: run statement 1 first, then run dependent statements only
   when their required relations, columns, or routines are present. Confirm
   the new request-ID APIs and grants, the legacy RPC lockout, and the
   resulting schema and data before proceeding. If a query after `COMMIT`
   fails, the upgrade may already be committed; inspect the database and do
   not rerun the migration.
5. Deploy the application that uses the request-ID APIs only after the
   database upgrade and inspection have succeeded. Have users refresh or
   reopen existing tabs after deployment. The atomic lockout prevents older
   clients from executing the three legacy RPCs after the database commit.
   Validate the application paths that use exception history for attendance
   eligibility before deployment. Every caller of
   `isAttendanceSessionEligibleForAbsence` must select and pass `continued_at`;
   the helper needs it to recognize an approved and acknowledged exception.
   Omitting it makes that exception ineligible in the client-side calculation.

## Fallback lockout only for an older Upgrade 002

The revised `002_expand_student_id_exception.sql` revokes legacy RPC execution
and verifies the replacement API grants before its transaction commits. Do
not run `002_post_cutover_disable_legacy_rpcs.sql` as a second step after that
revision.

Use the fallback only if inspection establishes that a database has already
applied an earlier, non-atomic Upgrade 002 revision that did not include the
lockout. It is not a replacement for Upgrade 002 and must not be used to
repair an uncertain or partially applied migration. The current live database
used the revised atomic upgrade, so this fallback is not applicable there.

## Keep the deployment paths separate

- `supabase/manual-upgrades/` is for forward-only changes to an existing
  database after its starting point has been verified.
- `supabase/rebuild/` is the consolidated baseline for a fresh project. Follow
  its runbook and setup requirements; do not layer Upgrade 001 over it.
- `supabase/migrations/` is an archived historical record. Never replay those
  files as new upgrades or use them as the execution sequence for a fresh
  project.
