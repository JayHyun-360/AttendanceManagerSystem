# Attendance Manager System

## Academic Project Notice

This is a student-developed project for the Development Application subject, created for learning, coursework, demonstrations, and academic presentation or defense.

The project's original source code, user interface, visual design, branding, and original assets remain the property of the project owner. Public availability of this repository is for academic reference only. Copying, reusing, redistributing, or repurposing these original materials in another project requires the project owner's permission.

This notice expresses the project owner's intent and does not claim a special school policy or any legal protection.

## Local Development

Use your own Supabase development or test project. Do not connect this application, its migrations, or its optional Edge Function to another person's or a production project.

### Requirements

- Node.js 22 (pinned by `.mise.toml`)
- pnpm
- A Supabase development/test project

### Install and configure

```bash
pnpm install
```

Copy `.env.example` to `.env.local`:

```powershell
Copy-Item .env.example .env.local
```

On macOS or Linux, use `cp .env.example .env.local` instead.

Edit `.env.local` and enter your own project's URL and anon key. These `NEXT_PUBLIC_` values are public client configuration, not privileged credentials. Never put a service-role key, database password, OAuth client secret, or other server secret in a `NEXT_PUBLIC_` variable or commit `.env.local`.

### Create and migrate your Supabase project

1. Create a separate Supabase development/test project.
2. Apply the SQL files in `supabase/migrations/` to your own test project's SQL Editor in ascending filename order, one file at a time. Apply the two `020` files in lexical filename order. Because migration version `020` is duplicated, do not use `supabase db push` until the migration history has been reconciled. Confirm the selected Supabase project is yours before running SQL.
3. Copy the test project's URL and anon key from its API settings into `.env.local`.

### Create the first administrator

New accounts are created as students, and the application does not allow users to grant themselves the admin role. After signing up with your own test account, use the SQL Editor in your own Supabase project's dashboard as its project owner to promote that account. Confirm the account ID belongs to you before running the update:

```sql
update public.profiles
set role = 'admin'
where id = 'YOUR_OWN_AUTH_USER_UUID'
returning id, email, role;
```

This owner-only bootstrap does not weaken the app's RLS or profile-role protection. Do not run it against another person's or a production project.

The private-ID migration is intended for fresh classmate/test projects. It does not move existing `id_photo_url` objects out of the public bucket. If using a database with existing ID photos, first arrange an authorized copy into private storage and remove the old public objects; do not assume changing the application code revokes already-public URLs.

### Google sign-in

Create your own Google OAuth client. In Google Cloud Console, add your Supabase project's callback URL as an authorized redirect URI:

```text
https://YOUR_TEST_PROJECT_REF.supabase.co/auth/v1/callback
```

In your Supabase project's Authentication provider settings, enable Google and enter that OAuth client's ID and secret. In Supabase Authentication URL configuration, set the local site URL to `http://localhost:3000` and allow `http://localhost:3000/auth/callback` as a redirect URL. The application redirects OAuth users to its local `/auth/callback` route; that route exchanges the authorization code for a session.

Keep the Google client secret in your own Supabase provider settings, not in this repository or `.env.local`.

### Run the application

```bash
pnpm dev
```

Open <http://localhost:3000>.

Automatic event closure uses `pg_cron`. Enable the extension before applying migration 024; if it is enabled afterward, rerun that migration's scheduling block. The app can run without `pg_cron`, but events will not close automatically on a schedule.

### Deferred storage cleanup worker

The cleanup worker is not required to run the application and is not currently operational: the repository does not yet create `storage_cleanup_queue` or enqueue work items. Do not deploy or schedule it until that schema and queue mechanism are implemented. See [the worker guide](docs/storage-cleanup-worker.md) for the current status.

This is an educational/class project. Use your own test data, OAuth credentials, and Supabase project when running or modifying it.
