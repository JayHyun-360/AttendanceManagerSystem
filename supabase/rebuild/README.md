# Adesse consolidated database baseline

This package is a fresh-project baseline consolidated from the final architecture described by the 48 historical migration files and current app code. It creates schema and behavior, not the historical migration path: legacy cleanup/backfill operations and old application rows are not replayed.

The original files under [`../migrations/`](../migrations/) are a protected archive. Do not execute them as this rebuild package; see the archive [README](../migrations/README.md). All new baseline SQL belongs in this directory.

Use the [rebuild checklist](./checklist.md) alongside this runbook. Supabase Dashboard and external-service steps are in [configuration.md](./configuration.md).

## Important assumptions and known limits

- The old live `dev_notes` definition was not available in the repository. [dev_notes_bootstrap.sql](./dev_notes_bootstrap.sql) creates a **new minimal app-compatible contract** with fields read by the UI and the supported type values. Its `id` and timestamp SQL types are chosen for the new baseline, not verified as copies of the old table's exact types. Verify against the old database before claiming exact physical-schema preservation.
- Migration 045's final `DO` block rewrites the report function created in 044 to call `event_program_matches`; that helper handles aliases and slash-separated program targeting. The consolidated function preserves that final rewrite. Because the report is security-invoker, [04_rls_policies_grants.sql](./04_rls_policies_grants.sql) grants the helper to authenticated users.
- Profile role changes are guarded in the database. Authenticated administrators may manage other profiles, and only a trusted SQL Editor session with `auth.role() IS NULL` and `session_user = 'postgres'` may establish the first administrator. Authenticated non-admins receive `42501` if they attempt to change a role. The pre-existing administrator self-demotion guard remains; `service_role` cannot update profiles.
- `attendance_logs` is retained for compatibility, but the current application has no references to it. API roles receive no direct table privileges; the retained RLS policy is not a substitute for or grant of table access.
- Uploaded student ID, verification, profile, and cover images use UID-scoped paths in private `student-private-media`; excuse attachments remain private in `excuse-documents`; administrator-managed public content uses `public-images`. Private student images are fetched through authenticated Storage downloads and displayed from temporary in-memory blob URLs. The Google OAuth avatar fallback can remain externally hosted until replaced with an uploaded profile image; it is never used for ID or cover images.
- Storage object deletion is reference-aware in both Storage RLS and the cleanup worker. An upload intent is queued before upload with a 48-hour grace period, extended by active onboarding/profile editors; linking an object to a database record cancels that candidate. Replacing or removing a reference re-enqueues the old object. The worker supports all three buckets and rechecks references immediately before deletion.
- Storage cleanup routines used only by triggers have no API-role execute privileges. The worker receives only queue `SELECT`/`UPDATE` access and performs object listing/deletion through Supabase Storage. The authenticated `register_storage_upload` RPC is the only app-facing queue insertion path.
- The source migrations define no views or materialized views.
- Supabase-managed Auth and Storage schemas, Auth provider configuration, Storage bucket settings, Realtime publication membership, Edge Function deployment/secrets, and GitHub Actions secrets are configured separately. Read [configuration.md](./configuration.md) before SQL execution.
- The revised Storage policies, concurrency guards, and bucket-aware cleanup workflow have not been runtime-tested. Do not treat this revision as execution-ready until it has passed local SQL and Storage API tests.

## Prerequisites

1. Create a brand-new Supabase project. Do not connect this package to the old project.
2. Ensure the project has its normal managed Auth and Storage services (`auth.users`, `auth.uid()`, `storage.buckets`, `storage.objects`) and the `anon`, `authenticated`, and `service_role` roles.
3. Use PostgreSQL 17 or later. `04_rls_policies_grants.sql` revokes the PostgreSQL 17 `MAINTAIN` privilege from API roles, and `06_verify.sql` checks it.
4. Configure the three empty Storage buckets in the Dashboard as described in [configuration.md](./configuration.md) after `02_routines.sql` and before `04_rls_policies_grants.sql`. Do not create the unused legacy IDs `avatars` or `media`.
5. Event closure is administrator-controlled. Do not configure a pg_cron event-closure job; `07_optional_pg_cron.sql` is retired and intentionally inert. This baseline does not unschedule jobs already installed in a separately deployed database; inspect and remove any such job there.
6. Do not import Auth accounts, profiles, events, attendance, fines, announcements, Dev Notes rows, Storage objects, or any old test data.

`01_core_schema.sql` enables `pgcrypto`. The sequence below is for SQL Editor, once, on a fresh project.

## Exact SQL execution sequence

1. [01_core_schema.sql](./01_core_schema.sql) — final tables, enums, constraints, indexes, and RLS enablement.
2. [dev_notes_bootstrap.sql](./dev_notes_bootstrap.sql) — empty manually maintained announcement table, new compatible contract.
3. [02_routines.sql](./02_routines.sql) — consolidated routines/RPCs, reference guards, upload registration, and cleanup logic.
4. Create the three empty Storage buckets in Dashboard using the exact values in [configuration.md](./configuration.md).
5. [04_rls_policies_grants.sql](./04_rls_policies_grants.sql) — application/Storage policies, least-privilege grants, and default-privilege hardening; requires `storage.objects` and all three buckets. Run once on a fresh project only.
6. [03_triggers.sql](./03_triggers.sql) — Auth, application, Storage-reference, and cleanup-queue triggers. It does not need to precede step 5; it requires only steps 1 and 3.
7. [05_seed_defaults.sql](./05_seed_defaults.sql) — only the system settings row and five standard programs.
8. Configure `supabase_realtime` for `public.events` and `public.excuse_requests` in Dashboard → Database → Publications.
9. [06_verify.sql](./06_verify.sql) — read-only verification queries; run after Dashboard setup.

The SQL is grouped by object layer rather than by historical migration. It includes the final schema and logic, but not migrations' historical data cleanup, duplicate deletion, inferred-attendance backfills, legacy fine reconciliation, or profile-derived program imports.
`07_optional_pg_cron.sql` is retained as an inert retirement notice and is not part of the execution sequence.

## Transaction and rerun safety

The schema, `dev_notes` bootstrap, routines, policies/grants, triggers, and seed scripts each have explicit `BEGIN`/`COMMIT` boundaries. `06_verify.sql` is read-only, and `07_optional_pg_cron.sql` is inert. Run each mutating script by itself and wait for its result before continuing.

- Run `01_core_schema.sql`, `dev_notes_bootstrap.sql`, `03_triggers.sql`, and `04_rls_policies_grants.sql` once only. Their types/tables, triggers, and policies are not created with `IF NOT EXISTS`; rerunning after success will fail, and `04` should not be rerun over installed policies.
- `02_routines.sql` uses `CREATE OR REPLACE FUNCTION` and is rerunnable when the function signatures remain unchanged. Review SQL Editor errors and catalog state before retrying after any failure.
- `05_seed_defaults.sql` uses `ON CONFLICT DO NOTHING`; it does not overwrite existing settings or program records when rerun.
- If a script reports an error, stop and inspect transaction/catalog state. Do not continue with dependent scripts or replay the full sequence blindly.

## Application table privilege matrix

The effective table ACLs granted by step 6 are intentionally narrower than the RLS policies. `—` means no direct table privilege for that role.

| Table | anon | authenticated | service_role |
| --- | --- | --- | --- |
| `profiles` | — | SELECT, INSERT, UPDATE | SELECT |
| `events` | — | SELECT, INSERT, UPDATE, DELETE | SELECT |
| `attendance_logs` | — | — | — |
| `attendance_scans` | — | SELECT, INSERT, UPDATE, DELETE | — |
| `fines` | — | SELECT, UPDATE | — |
| `excuse_requests` | — | SELECT | SELECT |
| `announcements` | — | SELECT, INSERT, UPDATE, DELETE | SELECT |
| `system_settings` | SELECT | SELECT, UPDATE | SELECT |
| `attendance_scan_corrections` | — | — | — |
| `event_feedback` | — | SELECT | — |
| `storage_cleanup_queue` | — | — | SELECT, UPDATE |
| `programs` | — | SELECT, INSERT, UPDATE | — |
| `dev_notes` | — | SELECT | — |

`postgres` retains owner/administrative privileges. Application API roles receive no application-table `TRUNCATE`, `REFERENCES`, `TRIGGER`, or `MAINTAIN` privileges and no cleanup-queue sequence access. `storage.objects` is different: its existing Supabase-required CRUD grants are preserved; step 6 only removes `TRUNCATE`, `REFERENCES`, `TRIGGER`, and `MAINTAIN` from the API roles. Storage access continues to be governed by the Storage service and RLS policies.

Function execution is granted only for the application RPCs and RLS helpers used by each role; trigger-only routines and internal cleanup helpers are revoked from API roles. The step also hardens defaults for objects created by `postgres`, but does not alter Supabase-managed `supabase_admin` defaults. Review role memberships and defaults for any additional object owners before adopting future SQL.

## Storage permission matrix

| Bucket | Anonymous | Student | Administrator |
| --- | --- | --- | --- |
| `public-images` | SELECT (public bucket) | SELECT; no writes | SELECT, INSERT, UPDATE; DELETE only when no database reference remains |
| `student-private-media` | No access | SELECT/INSERT own UID paths; DELETE own objects only after all references are cleared; no UPDATE | SELECT all; INSERT own admin UID path; DELETE unreferenced objects; no UPDATE |
| `excuse-documents` | No access | INSERT own UID paths only; no SELECT/UPDATE/DELETE | SELECT, DELETE only when unreferenced; no UPDATE |

Supabase Storage API table grants remain intact; RLS policies enforce these bucket and owner boundaries. The browser never receives a service-role key. `public-images` must contain no student ID, profile, or cover images.

## Initial records

- `system_settings` row 1: Adesse, QR expiry 5 minutes, `finesEnabled: false`.
- Five programs: BSIT - Information Technology, BSCS - Computer Science, BSBA - Business Administration, BSEd - Secondary Education, and BSHM - Hospitality Management.
- `dev_notes`: table only, with zero announcement rows.
- No initial admin user/profile is seeded. The Auth trigger creates new users as students; create a new account and explicitly establish the first admin after setup.

## Authorization test scenarios

Use disposable test accounts in a non-production project after applying the package. The SQL Editor catalog checks in [06_verify.sql](./06_verify.sql) are read-only; these behavior checks require authenticated test sessions:

- **Anonymous:** can read public system settings, call `get_public_events()`, and fetch objects from public buckets. Direct announcement reads and access to private application data or writes are denied.
- **Student:** onboarding profile upsert and ordinary edits to their own profile succeed. Attempting to change their own `role` to `admin`—by update, upsert, or insert if their profile is absent—fails with SQLSTATE `42501`; the stored role remains `student`. A student can retrieve only their own private student-media objects, upload to their UID/category paths, and delete an object only after its database references are cleared. Deleting the ID photo clears the profile field and routes the student to resubmit it. Students cannot read excuse documents after submission or delete another user's files.
- **Administrator:** updating another profile's role succeeds. The existing self-demotion behavior remains: an admin cannot demote their own profile through the authenticated app session.
- **Administrator app operations:** event CRUD, attendance scan marking/correction/deletion, fine status updates, announcement CRUD, settings updates, program insertion/status changes, excuse review, report reads, and event-feedback reads succeed through the authenticated role and the intended RLS policies.
- **Administrator:** can retrieve private student ID images through authenticated Storage downloads. Anonymous visitors and other students cannot retrieve those images.
- **Service role:** the cleanup worker can read media references, select/update queue rows, and list/delete unreferenced objects from the three approved buckets through Storage. It cannot update profiles, directly insert/delete queue rows, or execute internal cleanup helpers.
- **Postgres:** only a trusted SQL Editor session where `auth.role()` is null and `session_user` is `postgres` can promote the first administrator. The Auth trigger creates new accounts as students; no admin account is seeded.
- **Cleanup bucket behavior:** all removed assets are queued under their actual bucket. The worker rechecks current references per object, skips absent objects, preserves failed queue records for retry, and cancels candidates that have become referenced. New uploads have a 48-hour grace period before abandonment cleanup.

## Verification

Run the read-only queries in [06_verify.sql](./06_verify.sql), then confirm:

- The expected public tables, four enums, indexes, routines, triggers, and RLS policies exist.
- Effective table grants match the application matrix; API roles have no `TRUNCATE`, `REFERENCES`, `TRIGGER`, or `MAINTAIN` privileges on application tables, and Dev Notes is authenticated SELECT-only.
- `service_role` has effective `SELECT` but not `UPDATE` on `public.profiles`; authenticated admins retain profile management, and `postgres` retains profile `UPDATE` for first-admin promotion.
- `attendance_logs` is inaccessible through direct API table access; queue insertion is performed only by privileged database routines, while `service_role` has queue `SELECT`/`UPDATE` only.
- Schema `USAGE` remains available to API roles, API roles lack `CREATE` on `public`, postgres-owned defaults do not grant API access, and role memberships introduce no unexpected privileges. Supabase-managed `supabase_admin` defaults are reported but not changed.
- The new profile role guard is installed; `anon`, `authenticated`, and `service_role` cannot directly execute it or internal cleanup helpers. Trigger-driven cleanup still runs through the owning trigger functions.
- The intended anonymous and authenticated RPC grants remain, including `is_admin()`, `event_program_matches()`, `is_fines_enabled()`, and the application RPCs.
- Neither `anon` nor `authenticated` has `CREATE` on schema `public`; every security-definer function uses `SET search_path = ''` and schema-qualifies application objects. The verification query reports `empty_search_path_is_set = true` for each one. Security-invoker functions retain their existing settings.
- The settings row and five baseline programs are present; `dev_notes` has no rows.
- Exactly the three approved buckets have their final visibility, size, and MIME settings; no `avatars`, `media`, or other unused bucket exists. Required Storage policies enforce student UID ownership, administrator-only public asset management, private-media administrator reads, and reference-aware deletion.
- No anonymous policy grants access to `student-private-media` or `excuse-documents`; no private bucket has an UPDATE policy. `register_storage_upload` is executable by authenticated users only, while deletion/reference helper functions are not directly executable by anonymous or service roles.
- Realtime publication includes `public.events` and `public.excuse_requests`.
- Authenticated users can read active `dev_notes`; inactive notes are hidden; no app-client write policy exists.
- A new OAuth signup creates a student profile; only the trusted `postgres` SQL Editor context can perform out-of-band first-admin promotion, authenticated admins can manage other profiles, student self-promotion fails, and admin self-demotion remains blocked.
- Public event listing RPC, admin report RPC, attendance/fine routines, excuse RPCs, and event feedback RPCs operate under their intended roles. The admin feedback summary is a security-invoker aggregate protected by the existing feedback RLS policy.
- New events default to `feedback_enabled = false`; admins can change it without changing event status. Students can submit only for closed, enabled events when they meet the existing attendance requirements.
- `get_my_event_feedback_status()` reports prior submissions even when feedback is disabled or the event is reopened; disabling feedback or reopening the event does not delete existing response rows. Administrators can still view prior responses.
- `close_expired_active_events()` is absent from the rebuild, `07_optional_pg_cron.sql` is inert, and event status changes only through administrator-controlled actions.
- The rebuild does not remove automatic-closure jobs from separately deployed databases; inspect those databases and unschedule any existing job manually.
- The `storage-cleanup` Edge Function and GitHub Actions schedule are deployed/configured separately.
- Exercise an uploaded-but-unlinked object, linked object, replaced object, student deletion, and admin deletion with disposable accounts; verify referenced files remain and abandoned uploads are eligible only after the 48-hour grace period.

## Recovery if a script fails

1. Stop; do not run the remaining scripts or rerun the entire package.
2. Check whether the SQL Editor rolled back the current script's transaction. Some project/extension operations and external Dashboard actions are not part of that transaction.
3. Use the error and the corresponding script to inspect the new project's catalog state. Do not apply a historical migration to “patch” the baseline.
4. On a still-empty disposable target, the safest recovery may be to recreate the new project and restart from step 1 after correcting the cause. If any needed records already exist, take a fresh backup and repair only the failed phase.
5. Verify the corrected step and its dependent steps before pointing the app at this project.
