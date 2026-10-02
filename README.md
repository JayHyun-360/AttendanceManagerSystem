# Attendance Manager System

## Academic Project Notice

This is a student-developed project for the Development Application subject, created for learning, coursework, demonstrations, and academic presentation or defense.

The project's original source code, user interface, visual design, branding, and original assets remain the property of the project owner. Public availability of this repository is for academic reference only. Copying, reusing, redistributing, or repurposing these original materials in another project requires the project owner's permission.

This notice expresses the project owner's intent and does not claim a special school policy or any legal protection.

## Local Development

Use your own Supabase development or test project. Do not connect this application, its migrations, or its optional Edge Function to another person's or a production project.

### Requirements

- Node.js 20.9 or newer
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

### Optional storage cleanup Edge Function

The cleanup worker is not required to run the application. If you choose to deploy it, install and authenticate the Supabase CLI, then follow [the worker guide](docs/storage-cleanup-worker.md) using only your own development/test project. The Supabase runtime supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to the Edge Function. Create a unique `CLEANUP_FUNCTION_SECRET` and set it with the Supabase CLI secrets command for your test project. Do not add any of these server-side secrets to `.env.local`, `.env.example`, or client-exposed variables.

This is an educational/class project. Use your own test data, OAuth credentials, and Supabase project when running or modifying it.
