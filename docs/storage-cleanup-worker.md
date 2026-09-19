# Supabase Storage Cleanup Worker

This function processes rows in `public.storage_cleanup_queue` and removes only unreferenced objects from the `public-images` bucket. It waits at least 24 hours after a queue row is created, checks all known media-bearing tables, deletes through the Supabase Storage API, and records completion or failure.

## 1. Prepare a local Supabase Functions directory

Use a temporary directory or your project directory. Do not paste the service-role key into source code.

```bash
mkdir -p supabase/functions/storage-cleanup
cp /tmp/storage-cleanup-edge-function/index.ts \
  supabase/functions/storage-cleanup/index.ts
```

If you do not already have the Supabase CLI, install it using the official instructions:

<https://supabase.com/docs/guides/cli>

## 2. Log in and link the production project

```bash
supabase login
supabase link --project-ref lbznngfvgebwagsfigni
```

The project reference above comes from the Supabase project URL shown in the error message. Confirm that the linked project is the intended production project before deploying.

## 3. Create a private function secret

Run this locally:

```bash
openssl rand -hex 32
```

Copy the generated value. Then set it as a Supabase Function secret:

```bash
supabase secrets set CLEANUP_FUNCTION_SECRET='PASTE_THE_RANDOM_VALUE_HERE'
```

Do not commit this value or send it in chat.

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided to deployed Supabase Edge Functions by the Supabase runtime. The service-role key is never placed in the browser or in the repository.

## 4. Deploy the function

Because the function authenticates requests with its own secret header, disable the platform's default JWT requirement for this function:

```bash
supabase functions deploy storage-cleanup --no-verify-jwt
```

The deployed URL will be:

```text
https://lbznngfvgebwagsfigni.supabase.co/functions/v1/storage-cleanup
```

## 5. Test it manually

Use the same random secret value from step 3. The function intentionally waits 24 hours before processing newly queued rows. For a one-time test of the rows already shown in the queue, pass `minimumAgeHours: 0`:

```bash
curl --fail-with-body --request POST \
  'https://lbznngfvgebwagsfigni.supabase.co/functions/v1/storage-cleanup' \
  --header 'Content-Type: application/json' \
  --header 'x-cleanup-secret: PASTE_THE_RANDOM_VALUE_HERE' \
  --data '{"limit":25,"minimumAgeHours":0}'
```

A successful response looks like this:

```json
{
  "ok": true,
  "bucket": "public-images",
  "minimumAgeHours": 0,
  "selected": 2,
  "deleted": 2,
  "stillReferenced": 0,
  "failed": 0,
  "quarantined": 0,
  "skippedByAnotherWorker": 0
}
```

If a file is still referenced by a profile, event, announcement, settings JSON, or excuse request, the function does not delete it. It marks the queue row as `quarantined`.

Check the queue in the SQL Editor:

```sql
select
  id,
  bucket_id,
  object_path,
  status,
  attempts,
  last_error,
  created_at,
  processed_at
from public.storage_cleanup_queue
order by created_at desc;
```

## 6. Store scheduling secrets in Supabase Vault

In the Supabase Dashboard, enable these extensions if they are not already enabled:

- `pg_cron`
- `pg_net`
- `vault`

Then run the following SQL **once**. Replace both placeholders. Use the same function secret from step 3 and your project's publishable key from **Project Settings → API**.

```sql
select vault.create_secret(
  'https://lbznngfvgebwagsfigni.supabase.co',
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

The publishable key is safe to use as the `apikey` header for invoking the Edge Function. Never use the service-role key in this scheduling SQL.

## 7. Schedule the worker every 15 minutes

Run this SQL once:

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

The worker will process up to 25 eligible rows every 15 minutes. It will only process rows at least 24 hours old, which provides a recovery window for accidental UI changes.

## 8. Monitor scheduled executions

```sql
select
  jobid,
  jobname,
  schedule,
  active
from cron.job
where jobname = 'storage-cleanup-every-15-minutes';
```

To inspect recent HTTP invocation results:

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

To stop the schedule:

```sql
select cron.unschedule('storage-cleanup-every-15-minutes');
```

## Security notes

- Never place `SUPABASE_SERVICE_ROLE_KEY` in the frontend, GitHub repository, SQL editor text, or client-side environment variables.
- Keep `CLEANUP_FUNCTION_SECRET` private. It authorizes the scheduled worker endpoint.
- The function performs a database reference check before deletion.
- The queue uses a 24-hour delay by default.
- A failed row is retried with backoff up to five attempts, then marked `quarantined` for review.
- The current function handles the `public-images` bucket and the media references identified in the audit. If other buckets are used, add separate explicit handling rather than broad deletion logic.
