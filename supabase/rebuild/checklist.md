# Rebuild checklist

Follow the consolidated sequence in [README.md](./README.md); configure Supabase-managed services separately using [configuration.md](./configuration.md).

## Before starting

- [ ] Confirm the target is a new Supabase project. Do not connect this process to the old project.
- [ ] Verify `auth.users`, `auth.uid()`, `storage.buckets`, `storage.objects`, and the `anon`, `authenticated`, and `service_role` roles are provided by the new Supabase project.
- [ ] Confirm `pgcrypto` is available. `01_core_schema.sql` enables it.
- [ ] Confirm the target has exactly three empty buckets to configure: public `public-images`, private `student-private-media`, and private `excuse-documents`. Do not create `avatars` or `media`.
- [ ] Confirm the project uses PostgreSQL 17 or later; the ACL script uses the PostgreSQL 17 `MAINTAIN` privilege.
- [ ] Event closure is administrator-controlled; do not schedule automatic event closure.
- [ ] Review the new `dev_notes` contract. Its fields satisfy the current UI, but its physical types are not confirmed against the old live table.
- [ ] Do not migrate old Auth accounts, profiles, test records, Storage objects, or `dev_notes` announcement rows.
- [ ] Confirm the target has no pre-existing rebuild policies or application ACLs; `04_rls_policies_grants.sql` is a one-time step and its policy creations are intentionally not idempotent.
- [ ] Execute each mutating SQL script separately and wait for its result. Do not blindly rerun `01_core_schema.sql`, `dev_notes_bootstrap.sql`, `03_triggers.sql`, or `04_rls_policies_grants.sql`; see the transaction and rerun notes in `README.md`.

## SQL order

- [ ] 1. `01_core_schema.sql`
- [ ] 2. `dev_notes_bootstrap.sql` — empty announcement table and active-read RLS
- [ ] 3. `02_routines.sql`
- [ ] 4. Create all three buckets in Dashboard using the exact settings in `configuration.md`.
- [ ] 5. `04_rls_policies_grants.sql` — one-time step; it needs the buckets and routines, but does not depend on triggers.
- [ ] 6. `03_triggers.sql`
- [ ] 7. `05_seed_defaults.sql`
- [ ] 8. Add `public.events` and `public.excuse_requests` to `supabase_realtime` in Dashboard → Database → Publications.
- [ ] 9. `06_verify.sql` (read-only checks)
- [ ] Confirm `07_optional_pg_cron.sql` is retired and performs no operations.

## Expected initial state

- [ ] One settings row: id 1, Adesse, QR expiry 5 minutes, fines disabled.
- [ ] Five program catalog entries. There is no profile-derived import.
- [ ] `dev_notes` exists with zero rows. The app can read active rows; only project administrators manage rows through Table Editor.
- [ ] No seeded Auth users or admin profile. Fresh signups get the student role from the Auth trigger.
- [ ] Storage buckets are empty. No old object metadata is imported.
- [ ] Exactly the three approved buckets are configured: public `public-images`; private `student-private-media`; private `excuse-documents`. No `avatars`, `media`, or other unused bucket exists.
- [ ] `student-private-media` contains only `<auth.uid()>/<profile|cover|id>/<uuid>.<extension>` paths; `public-images` uses administrator-managed `admin/<uid>/public-media/<uuid>.<extension>` paths; excuse objects retain `<auth.uid()>/<uuid>.<extension>`.
- [ ] Student ID and verification images never use public URLs. Profile rows store only private object paths; the UI fetches private images through authenticated Storage downloads and uses temporary in-memory blob URLs.
- [ ] Anonymous users have no access to either private bucket. Authenticated administrators can read private student media; students can read only objects under their own UID.
- [ ] Students can delete only their own unreferenced private images. Removing an ID image clears the profile field and makes the profile incomplete until a replacement is uploaded.
- [ ] Public-media insert/update/delete permissions are administrator-only; deletion is denied while any database record references the object. No private bucket has an UPDATE policy.
- [ ] An authenticated student can upsert/edit their own profile but cannot set their role to admin by update, upsert, or insert; authenticated administrators can manage other profiles but cannot demote themselves.
- [ ] `service_role` can SELECT profile media references but cannot UPDATE profiles; out-of-band first-admin promotion is allowed only when `auth.role()` is null and `session_user = 'postgres'`.
- [ ] `attendance_logs` and `attendance_scan_corrections` are inaccessible through direct API table access; internal functions retain their privileged writes.
- [ ] API roles have no `TRUNCATE`, `REFERENCES`, `TRIGGER`, or `MAINTAIN` privileges on application tables. `dev_notes` is authenticated SELECT-only.
- [ ] `service_role` can select/update cleanup queue rows and read only the reference tables needed by the worker; it cannot directly insert/delete queue rows or execute internal cleanup helpers.
- [ ] API roles retain `USAGE` on `public` but not `CREATE`; postgres-owned defaults do not grant future application objects to API roles. Review reported `supabase_admin` defaults without changing them.
- [ ] Announcements are readable only by authenticated users; anonymous access to public system settings/events and public Storage objects still works.
- [ ] `register_storage_upload` queues each app upload before Storage upload with a 48-hour grace period; active onboarding/profile editors extend it every six hours. Linking a file cancels that candidate; removal/replacement enqueues it again.
- [ ] The worker processes all three approved buckets, checks references per object, skips already-absent files, and preserves failed candidates for retry.

## Important consolidated behaviors

- [ ] `02_routines.sql` contains the final report aggregate behavior, not the migration 044 function followed by migration 045's dynamic rewrite.
- [ ] The event-program matching helper is executable by authenticated users because the security-invoker report calls it.
- [ ] `events.feedback_enabled` is non-null and defaults to false; feedback RPCs enforce closed status, enabled feedback, attendance eligibility, and one submission per student/event.
- [ ] Disabling feedback preserves existing `event_feedback` rows and the student's submitted status.
- [ ] The admin feedback summary uses security-invoker access, and response comments are fetched only for the current page.
- [ ] `is_admin()`, `is_fines_enabled()`, and the application RPCs have only the intended execute grants; functions used only by triggers are not directly executable by API roles.
- [ ] The report's helper call is the final migration 045 dynamic rewrite of the 044 report definition, preserving program aliases and slash-separated event targeting.
- [ ] Storage cleanup uses the final conflict-safe queue function, updated nonblocking settings trigger, and no retired hero-image cleanup logic.
- [ ] The final system-settings cleanup trigger is `system_settings_enqueue_removed_media`. Historical migration 042 drops a different legacy name; the consolidated baseline does not replay that no-op.
- [ ] Insert/update trigger events are separated where column-specific updates are used, so the baseline does not rely on combining `INSERT` with `UPDATE OF columns`.
- [ ] Run the final verification queries after SQL and Dashboard configuration.
- [ ] Confirm no `close_expired_active_events()` routine or event-closure pg_cron job is installed; manual event closure still materializes inferred absences through the existing trigger path.
- [ ] The rebuild does not unschedule jobs in separately deployed databases; inspect those databases and manually remove any existing automatic-closure job.
- [ ] Confirm effective role privileges and memberships from `06_verify.sql`; do not infer safety from direct ACL text alone.
- [ ] Verify student upload, private retrieval, replacement, deletion after reference clearing, administrator access, and anonymous denial with disposable accounts before production use.

## Feedback and event lifecycle validation

- [ ] Active event, feedback enabled: the student form is not shown and the RPC rejects submission until an administrator closes the event.
- [ ] Active event, feedback disabled: the student form is not shown and the RPC rejects submission.
- [ ] Closed event, feedback enabled: an eligible student can submit once; an ineligible student cannot submit.
- [ ] Closed event, feedback disabled: no new submission is accepted, including from a stale client.
- [ ] Enabling feedback on a closed event makes the existing eligible-student workflow available without changing event status.
- [ ] Disabling feedback after a submission preserves the response row and the student's submitted status; administrators can still read it.
- [ ] Reopening an event preserves each prior feedback row and submitted status; administrators can still view prior responses while the event is active.
- [ ] Concurrent feedback-toggle, status, edit, and session-extension requests using the same event version allow only one write; stale requests receive a conflict message and do not increment the version.
- [ ] Anonymous/non-student RPC attempts and direct student table inserts remain denied.
- [ ] Toggling feedback leaves event status and attendance rows unchanged. Manual closure still materializes inferred absences; passing the scheduled end time alone does not close an event.
- [ ] Admin feedback responses are fetched in pages of 25; only the selected page's comments are loaded, and the overall count/average is fetched once per feedback detail.

## If a script fails

- [ ] Stop immediately; do not continue and do not rerun every script blindly.
- [ ] Determine whether the failing script's transaction rolled back and inspect which objects were created.
- [ ] Do not rerun `04_rls_policies_grants.sql` against a database where any of its policies already exist; compare the catalog first.
- [ ] On a still-empty disposable project, recreating the project and restarting from step 1 is the cleanest recovery. Otherwise, back up first and repair only the failed step.
- [ ] Do not use the historical migration archive as a patch source for the fresh baseline.
