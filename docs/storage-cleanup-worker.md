# Supabase Storage Cleanup Worker

The repository contains the `storage-cleanup` Edge Function at:

```text
supabase/functions/storage-cleanup/index.ts
```

It processes eligible rows in `public.storage_cleanup_queue`, checks all known database media references, and deletes only unreferenced objects from the `public-images` bucket. Migration `039_storage_cleanup_queue.sql` creates or upgrades the queue and enqueues old media references after replacements or removals.

The worker waits at least 24 hours after a queue row is created by default. It supports retries, concurrent-worker claiming, and quarantine handling. The function requires a private `CLEANUP_FUNCTION_SECRET` header and uses the Supabase-provided `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` runtime secrets.

## Deployment order

Complete these steps in order:

1. Link the intended Supabase project.
2. Configure `CLEANUP_FUNCTION_SECRET`.
3. Deploy the Edge Function.
4. Manually verify the deployed function with the secret.
5. Enable `pg_cron`, `pg_net`, and Vault if needed.
6. Store the scheduler secrets in Vault.
7. Create the scheduled job.
8. Verify the job and its HTTP responses.

Do not create the scheduled job before the function is deployed, its secret is configured, and the manual request succeeds.

## 1. Link the Supabase project

Run from the repository root. Replace the placeholder with the project reference for the intended production project.

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

Do not commit the project reference if it is considered sensitive in your environment, and never commit secret values.

## 2. Configure the Edge Function secret

Generate a random secret locally:

```bash
openssl rand -hex 32
```

Copy the generated value into the following command. Run it locally; do not place the value in source code or SQL committed to the repository:

```bash
supabase secrets set CLEANUP_FUNCTION_SECRET='PASTE_THE_RANDOM_VALUE_HERE'
```

The function also requires these values, which Supabase provides automatically to deployed Edge Functions:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Never add the service-role key to the repository, browser code, scheduler SQL, or chat messages.

## 3. Deploy the Edge Function

The function validates its own `x-cleanup-secret` header, so disable the platform’s default JWT verification for this endpoint:

```bash
supabase functions deploy storage-cleanup --no-verify-jwt
```

The deployed endpoint is:

```text
https://YOUR_PROJECT_REF.supabase.co/functions/v1/storage-cleanup
```

## 4. Manually verify the deployed function

Use the same secret configured in step 2. This request limits processing to one row and uses `minimumAgeHours: 0` only for an intentional deployment test. It does not bypass reference checks.

```bash
curl --fail-with-body --request POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/storage-cleanup' \
  --header 'Content-Type: application/json' \
  --header 'x-cleanup-secret: PASTE_THE_RANDOM_VALUE_HERE' \
  --data '{"limit":1,"minimumAgeHours":0}'
```

A successful response has `ok: true` and includes counters such as:

```json
{
  "ok": true,
  "bucket": "public-images",
  "selected": 0,
  "deleted": 0,
  "stillReferenced": 0,
  "failed": 0,
  "quarantined": 0,
  "skippedByAnotherWorker": 0
}
```

A `401` response means the `x-cleanup-secret` value does not match the configured function secret. A database or reference-check error must be resolved before enabling the scheduler.

## 5. Inspect the queue

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

## 6. Prepare the scheduler extensions and secrets

The scheduler is not configured by a repository migration because it requires project-specific URL and secret values. In the Supabase Dashboard, enable these extensions if they are not already enabled:

- `pg_cron`
- `pg_net`
- `vault`

Run the following SQL once in the Supabase SQL Editor. Replace every placeholder. Use the same private function secret from step 2 and the project’s publishable key from **Project Settings → API**. Do not use the service-role key.

```sql
select vault.create_secret(
  'https://YOUR_PROJECT_REF.supabase.co',
  'storage_cleanup_project_url'
);

select vault.create_secret(
  'PASTE_THE_RANDOM_VALUE_HERE',
  'storage_cleanup_function_secret'
);

select vault.create_secret(
  'PASTE_YOUR_PUBLISHABLE_KEY_HERE',
  'storage_cleanup_publishable_key'
);
```

The publishable key is used only as the `apikey` header for the Edge Function request. The private cleanup secret is sent separately as `x-cleanup-secret`.

## 7. Create the scheduled job

Run this SQL only after the manual function request in step 4 succeeds and the Vault secrets in step 6 exist.

The first statement makes rerunning the setup safe by removing only a previous job with the same name:

```sql
select cron.unschedule(jobid)
from cron.job
where jobname = 'storage-cleanup-every-15-minutes';
```

Then create the schedule:

```sql
select cron.schedule(
  'storage-cleanup-every-15-minutes',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := (
      select decrypted_secret
      from vault.decrypted_secrets
      where name = 'storage_cleanup_project_url'
    ) || '/functions/v1/storage-cleanup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'storage_cleanup_publishable_key'
      ),
      'x-cleanup-secret', (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'storage_cleanup_function_secret'
      )
    ),
    body := jsonb_build_object(
      'limit', 25,
      'minimumAgeHours', 24
    )
  ) as request_id;
  $$
);
```

The job invokes the worker every 15 minutes, processes up to 25 eligible rows per invocation, and preserves the worker’s 24-hour recovery window.

## 8. Verify scheduled execution

Confirm the job is active:

```sql
select
  jobid,
  jobname,
  schedule,
  active
from cron.job
where jobname = 'storage-cleanup-every-15-minutes';
```

After at least one scheduled interval, inspect the HTTP invocation results:

```sql
select
  id,
  status_code,
  content,
  error_msg,
  created
from net._http_response
order by created desc
limit 20;
```

A successful invocation should show an HTTP 200 response with an `ok: true` JSON body. If the response is `401`, verify that the Vault cleanup secret exactly matches `CLEANUP_FUNCTION_SECRET`. If the response reports a database or reference-check failure, disable the schedule until the issue is resolved.

To stop the schedule without deleting queue data:

```sql
select cron.unschedule('storage-cleanup-every-15-minutes');
```

## Security notes

- Never place `SUPABASE_SERVICE_ROLE_KEY` in frontend code, the repository, scheduler SQL, or chat.
- Keep `CLEANUP_FUNCTION_SECRET` private. It authorizes requests to the deployed worker.
- Do not expose the cleanup secret in a public URL or query string.
- The worker performs a complete database reference check before deletion.
- Database triggers enqueue candidates only; they never delete Storage objects.
- The queue uses a 24-hour delay by default.
- Failed rows retry with backoff up to five attempts, then become `quarantined` for review.
- The current worker handles the `public-images` bucket and the audited media references only.

## Production-only configuration still required

The repository provides the Edge Function and deployment instructions. The following must still be configured in the intended Supabase project:

- Supabase CLI project linking.
- `CLEANUP_FUNCTION_SECRET` Function secret.
- Edge Function deployment.
- `pg_cron`, `pg_net`, and Vault availability.
- Vault secrets for the project URL, cleanup secret, and publishable key.
- The `storage-cleanup-every-15-minutes` cron job.

Scheduling is not considered active until the job query shows `active = true` and `net._http_response` contains a successful invocation.
