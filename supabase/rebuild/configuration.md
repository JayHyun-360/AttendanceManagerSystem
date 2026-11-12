# Supabase Dashboard and external configuration

These settings are separate from the consolidated SQL execution sequence in [README.md](./README.md). Do not use any old project credentials or copy old Auth users or Storage files.

## Auth and Google OAuth

1. In the new project's Auth provider settings, enable Google and configure credentials created for the new project.
2. Set the Google callback URI and Supabase Auth redirect allowlist for the new local and production app URLs.
3. Configure the app deployment with the new Supabase URL and public anon key. Never expose a service-role key in a browser variable.
4. Once [03_triggers.sql](./03_triggers.sql) has installed the Auth trigger, register a fresh user. The trigger calls `public.handle_new_user()` and gives the profile the `student` role.
5. Promote the designated first administrator manually through the trusted SQL Editor as the `postgres` database owner. The role guard permits out-of-band promotion only when `auth.role()` is null and `session_user = 'postgres'`; `supabase_admin` and `service_role` are not authorized by this exception. There is no initial admin seed.
6. Confirm onboarding, session exchange, protected routing, and role-based pages work with the new provider configuration.

## Manually managed `dev_notes`

`public.dev_notes` is an announcement/update table maintained by project administrators in Dashboard → Table Editor. The app reads rows with `is_active = true`; it does not provide an editor or client write policy. The baseline creates the table empty and allows authenticated reads of active rows only.

The original live column types could not be recovered from repository files. The bootstrap uses a new compatible UUID/text/timestamp contract to satisfy the application query and the type constraint. It is not a verified copy of the old physical schema. If exact schema parity is required, compare the proposed definition with the old table before executing the baseline. Add new announcement rows only after setup.

The ACL step grants `authenticated` SELECT on `public.dev_notes` only and leaves writes to the project administrator through the Dashboard Table Editor. It explicitly removes existing table ACLs from `PUBLIC`, `anon`, `authenticated`, and `service_role` before applying that read grant. The initial table remains empty.

## Database permissions and defaults

The grants in [04_rls_policies_grants.sql](./04_rls_policies_grants.sql) are part of the baseline, not a Dashboard setting. They revoke broad existing ACLs on the listed application tables, then grant only the table operations needed by the app and cleanup worker. The script keeps Supabase Storage's CRUD grants on `storage.objects` intact, removes only the extra `TRUNCATE`, `REFERENCES`, `TRIGGER`, and `MAINTAIN` privileges from API roles, and preserves `public` schema `USAGE` while removing API-role `CREATE`.

The script hardens default privileges for objects created by `postgres`, including the global default for `PUBLIC` function execution and schema-local table, sequence, and function defaults. It does not alter Supabase-managed `supabase_admin` defaults or managed Auth/Storage grants. Inspect [06_verify.sql](./06_verify.sql) output for effective privileges, default ACLs, schema ACLs, and role memberships. Future objects created by a different owner may have different defaults and must be reviewed before exposure through the API.

The application table matrix and behavior checks are documented in [README.md](./README.md). In particular, `attendance_logs` and `attendance_scan_corrections` have no direct API table grants; `dev_notes` is authenticated SELECT-only; and the cleanup worker has queue SELECT/UPDATE but no direct queue insert/delete or sequence privileges.

## Storage buckets

After `02_routines.sql` and before [04_rls_policies_grants.sql](./04_rls_policies_grants.sql), create exactly these empty buckets in Dashboard → Storage. Do not copy objects or bucket metadata from the old project.

| Bucket | Public | File limit | Allowed MIME types |
| --- | --- | --- | --- |
| `public-images` | Yes | 50 MiB | `image/jpeg`, `image/png`, `image/webp`, `video/mp4` |
| `student-private-media` | No | 20 MiB | `image/jpeg`, `image/png`, `image/webp` |
| `excuse-documents` | No | 20 MiB | `image/jpeg`, `image/png`, `image/webp`, `application/pdf` |

These are the only buckets permitted by the rebuild. Do not create the unused legacy IDs `avatars` or `media`, or any other bucket. The SQL policies do not create buckets; `04_rls_policies_grants.sql` expects all three to exist.

`public-images` is only for administrator-managed event promotions, published announcement media, and public system-settings carousel assets. It is intentionally public for read access. Never upload student IDs, verification images, profile photos, or cover photos there.

`student-private-media` stores uploaded student ID/verification images, profile photos, and cover images using `<auth.uid()>/<profile|cover|id>/<uuid>.<extension>`. Uploaded images are referenced by canonical object paths, and the UI downloads them with the signed-in user's session and displays temporary in-memory blob URLs; Storage RLS permits downloads only for the owner and authenticated administrators. The existing Google OAuth avatar fallback can remain as an external `photo_url` until the student uploads a replacement; it is not copied into Storage and is never used for ID or cover images.

`excuse-documents` remains private and stores `<auth.uid()>/<uuid>.<extension>` paths. Students can upload only; administrators can retrieve attachments through the existing five-minute signed-URL workflow. Student access to the private document after submission is not required by the current UI.

The policies grant no UPDATE access to either private bucket. Student-owned image deletion and administrator deletion are allowed only when the database confirms that no profile, event, announcement, excuse request, or carousel record references the object. The database reference triggers coordinate with deletion and reject private student image references that do not use the correct owner/category path. A student's ID image can be removed only after the profile reference is cleared; that makes the student profile incomplete and requires a new upload.

The upload helper registers each object path before uploading it. Its cleanup queue entry is held for 48 hours while a form/profile edit may still be in progress; active onboarding and profile editors extend the lease every six hours. Linking the object to a database record cancels the candidate; removing or replacing the reference queues it again. The worker checks the latest database references for each object immediately before deletion, handles all three buckets, and retains failed queue rows for retry.

## Realtime

The app subscribes to `public.events` and `public.excuse_requests`. In Dashboard → Database → Publications, check that `supabase_realtime` includes both tables after `05_seed_defaults.sql` and before `06_verify.sql`. If missing, and only if not already members, the following SQL Editor commands add them:

```sql
alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.excuse_requests;
```

Check membership first because adding an existing member can fail. Realtime delivery still relies on grants and RLS.

## Event closure

Event closure is controlled by administrators through the app. Do not enable or schedule a pg_cron job for automatic event closure. The former [07_optional_pg_cron.sql](./07_optional_pg_cron.sql) entry point is retired and contains no executable statements. Applying this fresh-project baseline does not unschedule jobs already installed in a separately deployed database; inspect that database and manually unschedule any automatic-closure job. Historical migration 024 remains archival and must not be run as part of this rebuild.

Manual closure continues to invoke the existing inferred-absence trigger behavior. The Storage cleanup worker is not a pg_cron job; keep its credentials out of SQL and use the repository's GitHub Actions workflow instead.

## Edge Function and GitHub Actions

Deploy [storage-cleanup/index.ts](../functions/storage-cleanup/index.ts) separately from the repository root using the Supabase CLI and the new project reference:

```powershell
supabase functions deploy storage-cleanup --project-ref YOUR_NEW_PROJECT_REF --no-verify-jwt --use-api
```

Supabase provides `SUPABASE_URL` and its available API key environment variables to Edge Functions. Legacy-key projects expose `SUPABASE_SERVICE_ROLE_KEY`; projects using the newer key format expose `SUPABASE_SECRET_KEYS`. Do not manually create secrets with the reserved `SUPABASE_` prefix.

The current worker reads `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, so confirm the target project's Edge Function runtime supplies that legacy service-role variable. If it does not, the worker must be updated to use the project's supported secret-key variable before deployment. Configure only the custom `CLEANUP_FUNCTION_SECRET` in the new project, and keep its value out of source control.

The function uses its own `x-cleanup-secret` authentication, so deploy it with `--no-verify-jwt`. Keep the service-role key only in the Edge Function environment.

The repository workflow [storage-cleanup.yml](../../.github/workflows/storage-cleanup.yml) calls the function every 15 minutes and supports manual dispatch. Reconfigure GitHub Actions repository secrets `SUPABASE_URL` and `CLEANUP_FUNCTION_SECRET` for the new project; enable Actions and scheduled workflows, then test a manual run. The workflow does not need the service-role key. See [storage-cleanup-worker.md](../../docs/storage-cleanup-worker.md) for operational details.
