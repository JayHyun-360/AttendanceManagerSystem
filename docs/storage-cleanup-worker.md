# Supabase Storage Cleanup Worker

The repository contains the already-deployed `storage-cleanup` Edge Function at:

```text
supabase/functions/storage-cleanup/index.ts
```

It processes eligible rows in `public.storage_cleanup_queue`, checks all known database media references, and deletes only unreferenced objects from the `public-images` bucket. Migration `039_storage_cleanup_queue.sql` creates or upgrades the queue and enqueues old media references after replacements or removals.

The worker waits at least 24 hours after a queue row is created by default. It supports retries, concurrent-worker claiming, and quarantine handling. The deployed function authenticates the caller with the private `CLEANUP_FUNCTION_SECRET` sent in the `x-cleanup-secret` header.

## Recommended Vault-free scheduler

Use the repository workflow [`storage-cleanup.yml`](../.github/workflows/storage-cleanup.yml) with GitHub Actions scheduled execution.

This is recommended for the current project because the live Supabase project does not provide the Vault extension. Supabase’s documented `pg_cron` → `pg_net` Edge Function pattern requires Vault, or would otherwise require storing a secret directly in SQL. The GitHub Actions workflow keeps the cleanup secret in GitHub Actions encrypted repository secrets and sends it only at runtime.

Do not create a Supabase `pg_cron` HTTP job containing `CLEANUP_FUNCTION_SECRET`, a Supabase secret key, or any other private key as SQL text.

The workflow runs every 15 minutes and also supports manual `workflow_dispatch`. It invokes the existing deployed function; no Edge Function code change or redeployment is required.

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

The 24-hour minimum age is intentionally preserved as a recovery window.

## 3. Verify the deployed function manually

The function is already deployed and its `CLEANUP_FUNCTION_SECRET` is already configured. If a manual check is needed, use the same secret locally without committing it:

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

- `bucket_id = 'public-images'`
- `status` equal to `pending` or `failed`
- `available_at` in the past
- `created_at` older than the configured minimum age

Rows still referenced by profiles, events, announcements, system settings, carousel posters, or excuse requests are not deleted and are quarantined.

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

New candidates should be processed only after their 24-hour delay. A successful workflow run can legitimately report `selected: 0` when no eligible candidates exist.

## Production-only configuration

The following must be configured outside the repository:

- GitHub Actions must be enabled for the repository.
- Repository Actions secret `SUPABASE_URL` must be configured.
- Repository Actions secret `CLEANUP_FUNCTION_SECRET` must match the deployed Supabase Function secret.
- The default branch must contain `.github/workflows/storage-cleanup.yml`.
- The workflow must be allowed to run on schedule.

No `pg_cron`, `pg_net`, or Vault setup is required for this recommended scheduler. Do not configure a duplicate Supabase Cron job unless a secure secret-storage mechanism becomes available.

## Security notes

- Never place `CLEANUP_FUNCTION_SECRET` in source control, SQL text, a URL, or chat.
- Never place a Supabase secret key or service-role key in the workflow file. This worker uses its existing dedicated cleanup secret instead.
- GitHub Actions exposes the secret only to the workflow process at runtime; review repository collaborators and Actions permissions accordingly.
- Database triggers enqueue candidates only; they never delete Storage objects.
- The worker performs a complete database reference check before deletion.
- Failed rows retry with backoff up to five attempts, then become `quarantined` for review.
