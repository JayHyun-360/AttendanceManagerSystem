# Supabase Storage Cleanup Worker

The repository contains the `storage-cleanup` Edge Function source at:

```text
supabase/functions/storage-cleanup/index.ts
```

It processes eligible rows in `public.storage_cleanup_queue` for the three approved buckets: `public-images`, `student-private-media`, and `excuse-documents`. It checks the current database references immediately before deleting an object. In the fresh rebuild, migrations remain archival; the consolidated baseline creates the queue and reference guards.

Application uploads register an intent before writing to Storage. Those rows become eligible only after a 48-hour grace period, allowing onboarding/profile edits to finish. Linking an object cancels its cleanup candidate; later removal or replacement enqueues it again. The worker also respects the request's minimum-age setting, uses retries and concurrent-worker claims, and quarantines rows after repeated failures. The function authenticates requests with the private `CLEANUP_FUNCTION_SECRET` in the `x-cleanup-secret` header.

## Recommended Vault-free scheduler

Use the repository workflow [`storage-cleanup.yml`](../.github/workflows/storage-cleanup.yml) with GitHub Actions scheduled execution.

This is the recommended scheduler for a fresh project because it keeps the cleanup secret in GitHub Actions encrypted repository secrets and sends it only at runtime. It does not depend on `pg_cron`, `pg_net`, or Vault.

Do not create a Supabase `pg_cron` HTTP job containing `CLEANUP_FUNCTION_SECRET`, a Supabase secret key, or any other private key as SQL text.

The workflow runs every 15 minutes and also supports manual `workflow_dispatch`. It invokes the deployed function; when the Edge Function source changes, deploy the updated function separately using the Supabase CLI.

## Deploy the Edge Function

The function source is `supabase/functions/storage-cleanup/index.ts`. Deploy it from the repository root with the Supabase CLI:

```powershell
supabase login
supabase functions deploy storage-cleanup --project-ref YOUR_PROJECT_REF --no-verify-jwt --use-api
```

Use the project reference from the Supabase Dashboard URL (`https://supabase.com/dashboard/project/YOUR_PROJECT_REF`) or **Project Settings → General**. `--no-verify-jwt` is required because this function authenticates requests with its own `x-cleanup-secret` header. The function secret already configured in Supabase is not changed by deploying code; do not add it to this command or commit it.

In the Supabase Dashboard, open **Edge Functions → `storage-cleanup`** to inspect the deployed function and its logs. Deploy the repository code with the CLI rather than editing the function in the Dashboard.

## 1. Configure GitHub Actions secrets

In the GitHub repository:

1. Open **Settings**.
2. Open **Secrets and variables → Actions**.
3. Select **New repository secret**.
4. Create `SUPABASE_URL` with the project URL, for example `https://YOUR_PROJECT_REF.supabase.co`.
5. Create `CLEANUP_FUNCTION_SECRET` with the exact same value already configured in the deployed Supabase Edge Function.
6. Do not paste either secret into the workflow file or any committed document.

The workflow uses these secrets only through `${{ secrets.SUPABASE_URL }}` and `${{ secrets.CLEANUP_FUNCTION_SECRET }}`.

## 2. Enable and test the workflow

The workflow file is:

```text
.github/workflows/storage-cleanup.yml
```

After the file is committed and pushed:

1. Open the repository’s **Actions** tab.
2. Select **Storage cleanup**.
3. Select **Run workflow**.
4. Run it from the intended default branch.
5. Confirm the job completes successfully.

The scheduled trigger is:

```text
*/15 * * * *
```

GitHub Actions may start scheduled workflows a few minutes after the nominal time. The workflow has a 10-minute timeout and sends:

```json
{"limit":25,"minimumAgeHours":24}
```

The 24-hour worker age floor is retained as a recovery window; new upload-intent records also have their own 48-hour `available_at` delay.

## 3. Verify the deployed function manually

After deploying the function and configuring its `CLEANUP_FUNCTION_SECRET` in the target project, a manual check can use the same secret locally without committing it:

```powershell
curl.exe --fail-with-body --request POST `
  "https://YOUR_PROJECT_REF.supabase.co/functions/v1/storage-cleanup" `
  --header "Content-Type: application/json" `
  --header "x-cleanup-secret: PASTE_THE_RANDOM_VALUE_HERE" `
  --data '{"limit":1,"minimumAgeHours":0}'
```

A successful response must contain `"ok":true`. A `401` means the caller’s secret does not match the deployed function secret. Do not weaken the function authentication to resolve a mismatch.

## 4. Inspect the queue

Run in the Supabase SQL Editor:

```sql
select
  id,
  bucket_id,
  object_path,
  status,
  attempts,
  available_at,
  last_error,
  created_at,
  processed_at
from public.storage_cleanup_queue
order by created_at desc;
```

The worker processes only rows with:

- `bucket_id` equal to one of `public-images`, `student-private-media`, or `excuse-documents`
- `status` equal to `pending` or `failed`
- `available_at` in the past
- `created_at` older than the configured minimum age

For each claimed row, the worker checks whether the object exists, fetches the latest references across profiles/events/announcements/excuse requests/settings, and only then deletes. Referenced objects are marked `cancelled`; when their database reference is later removed, a trigger creates a new cleanup row. Missing objects are marked `completed`. Failed deletions keep their queue records and retry; repeated failures are quarantined.

## 5. Verify scheduled execution

In GitHub:

1. Open **Actions → Storage cleanup**.
2. Confirm the scheduled workflow has successful runs approximately every 15 minutes.
3. Open a run and confirm the **Invoke storage cleanup worker** step completed with HTTP success.

The Supabase queue is also a useful operational check:

```sql
select
  status,
  count(*)
from public.storage_cleanup_queue
group by status
order by status;
```

Database-removal candidates are eligible after the 24-hour worker age floor; upload-intent candidates are held for at least 48 hours and extended while an onboarding/profile edit remains active. A successful workflow run can legitimately report `selected: 0` when no eligible candidates exist.

## Production-only configuration

The following must be configured outside the repository:

- GitHub Actions must be enabled for the repository.
- Repository Actions secret `SUPABASE_URL` must be configured.
- Repository Actions secret `CLEANUP_FUNCTION_SECRET` must match the Supabase Function secret configured in the target project.
- The default branch must contain `.github/workflows/storage-cleanup.yml`.
- The workflow must be allowed to run on schedule.

No `pg_cron`, `pg_net`, or Vault setup is required for this recommended scheduler. Do not configure a duplicate Supabase Cron job unless a secure secret-storage mechanism becomes available.

## Security notes

- Never place `CLEANUP_FUNCTION_SECRET` in source control, SQL text, a URL, or chat.
- Never place a Supabase secret key or service-role key in the workflow file. This worker uses its existing dedicated cleanup secret instead.
- GitHub Actions exposes the secret only to the workflow process at runtime; review repository collaborators and Actions permissions accordingly.
- Database triggers enqueue candidates only; they never delete Storage objects.
- The worker checks the latest database references for each object before deletion.
- Private student media is downloaded by authenticated app clients; the worker never creates or persists image URLs.
- The service-role key remains only in the Edge Function environment and is never exposed to browser code.
- Failed rows retry with backoff up to five attempts, then become `quarantined` for review.
