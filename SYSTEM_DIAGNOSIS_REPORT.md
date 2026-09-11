# SYSTEM_DIAGNOSIS_REPORT.md

## Executive Summary

This repository is a Next.js App Router application that has been evolved from a Vite/React UI into a Supabase-backed data architecture. The current implementation has several real production concerns:

1. A full path exists for Google OAuth callback via `/auth/callback` using Supabase `exchangeCodeForSession`, but no real server guard exists in middleware.
2. User/session hydration reads `public.profiles` through a `maybeSingle()` flow in the root page component and routes into onboarding if the profile row does not exist or is incomplete.
3. The SQL migration file contains a `handle_new_user()` trigger written with the correct PostgreSQL trigger variable convention (`NEW`, uppercase) and uses `public.is_admin()` as the canonical admin detector.
4. `app/page.tsx` still retains several UI route-string machine and client-side mock patterns, including local route gating, mock role switch behaviors, and state-driven page transitions rather than strictly verified server-side data responses.
5. The strongest technical diagnosis is that the user is being redirected to onboarding when a `public.profiles` row is missing because the trigger or the backfill path failed to create it. That is a profile/data consistency issue, not a UI-only issue.

The app must be transformed into a deterministic production flow by enforcing a strict profile existence contract, using Supabase data as the only source of truth, replacing route-state shortcuts with real server-auth checks, and eliminating UI-only route changes and timeouts.

---

## 1. Database & Trigger Inspection

### 1.1 Schema baseline

The workspace schema file is [supabase/migrations/001_initial_schema.sql](supabase/migrations/001_initial_schema.sql). It defines the major tables:

- `public.profiles`
- `public.events`
- `public.attendance_logs`
- `public.fines`
- `public.excuse_requests`
- `public.announcements`
- `public.system_settings`

The `profiles` table includes `id uuid primary key references auth.users(id) on delete cascade`, `email`, `first_name`, `middle_initial`, `surname`, `student_id`, `role`, `program`, `year_level`, `section`, `phone`, `contact_email`, `photo_url`, `qr_version`, and `created_at`.

The table is RLS-protected and has policies for select/insert/update/delete. The admin helper is:

```sql
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;
```

This helper is the canonical way the repo checks for admin status and avoids recursive policies.

### 1.2 Trigger inspection

The trigger function is also defined in the same migration file:

```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    first_name,
    middle_initial,
    surname,
    contact_email,
    role,
    photo_url
  )
  values (
    NEW.id,
    NEW.email,
    coalesce(NEW.raw_user_meta_data ->> 'first_name', ''),
    coalesce(NEW.raw_user_meta_data ->> 'middle_initial', ''),
    coalesce(NEW.raw_user_meta_data ->> 'surname', ''),
    NEW.email,
    'student',
    coalesce(NEW.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (id) do nothing;

  return NEW;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
```

This is the correct PostgreSQL PL/pgSQL uppercase token form. In particular:

- `NEW.id`, `NEW.email`, `NEW.raw_user_meta_data` are the correct trigger record references.
- `return NEW;` is correct.
- `on conflict (id) do nothing` is appropriate for an idempotent profile backfill behavior.

### 1.3 Trigger behavior audit

When `auth.users` receives a new record, the database trigger `on_auth_user_created` should fire after insert and insert a corresponding `public.profiles` row with a `student` default role. In the current migration, that row is created with:

- `id` = `auth.users.id`
- `email` = `auth.users.email`
- `first_name`, `middle_initial`, `surname` pulled from `raw_user_meta_data`
- `contact_email` = `new.email`
- `role='student'`
- `photo_url` = `avatar_url` if available

This means a valid login should normally create a profile row automatically. However, if the trigger is malformed, disabled, or the row is not inserted due to a SQL or RLS error, the application will detect `profile = null` and route the user into `onboarding`.

### 1.4 RLS and recursion inspection

The `public.is_admin()` helper is designed to avoid recursive policy loops. The repo also uses `public.profiles` access policies that are intended to gate access by the same helper rather than nested self-referential direct logic.

The recommended secure pattern is:

```sql
create policy profiles_select_students
on public.profiles
for select
using (auth.uid() = id or public.is_admin());
```

This is safer than trying to recursively resolve `profiles` rows through their own role assignments.

### 1.5 Known schema mismatch symptoms

The row that the repo currently writes into `public.profiles` should not include a `updated_at` field because the migration file in the workspace schema only defines `created_at`, not `updated_at`. The `updated_at` field appears in the backup or generated artifact context but not in the canonical migration. That mismatch must be fixed by either:

- removing `updated_at` from any insert list, or
- adding `updated_at` to the actual table if the schema is meant to support it.

The exact error shown by the user (`ERROR: 42703: column "updated_at" of relation "profiles" does not exist`) is consistent with that mismatch.

---

## 2. Elimination of Mock-Up State Overrides

### 2.1 Where mock-like patterns remain

The main UI route and behavior layer sits in [app/page.tsx](app/page.tsx). It has a giant route-state machine:

```ts
const [page, setPage] = useState<Page>("landing");
const [user, setUser] = useState<User | null>(null);
```

The UI is a state-machine-driven single page, not a true server-routed App Router flow. The page uses local `setPage`, `setUser`, `setTimeout`, and `navigate()` transitions inside the same component. This is a mock-style UI override pattern.

Specific issues:

- `const show = (msg: string, variant: ... ) => { setToast(...); setTimeout(...); }`
- `proceed()` in login uses a `setTimeout(() => { setLoading(null); onLogin(role); }, 1100)` artificial transition.
- `handleLogin(role)` in the main page is a route state override that either sets a dummy user and routes into `admin-dashboard` or `onboarding` with fake state shortcuts.
- `isBare` page gating is a UI route-state convenience rather than a server route gate.

These patterns must be removed by making authentication and navigation depend on server-validated `auth.user` + `profiles` records from Supabase rather than synthetic local transitions.

### 2.2 Exact removal strategy

1. Remove `setTimeout` UI transition from the login flow. Do not proceed artificially after a delay. Perform a verified `await`ed call to Supabase only.
2. Remove all `setUser()` dummy fallback values, including fake admin creation and fake `student` object creation in `handleLogin()`.
3. Remove route transitions that depend on an arbitrary `role` local variable. Route strictly by a verified Supabase `profile.role` field, not by client-selected UI state.
4. Replace `page` route machine as an entitlement model with:
   - an App Router `middleware.ts` that checks whether the user is signed in,
   - a server page guard that sends unauthenticated users to `/login`, and
   - an `AuthContext` provider that emits `user`, `profile`, and `role` based on Supabase responses.

### 2.3 Production-safe replacement

The correct frontend source of truth should be:

```ts
const {
  data: { session },
} = await supabase.auth.getSession();
const { data: profile } = await supabase
  .from("profiles")
  .select("*")
  .eq("id", session.user.id)
  .maybeSingle();
```

Only after `profile` is confirmed by the database should the UI route the user to:

- onboarding if required fields are missing,
- dashboard if role is `student`,
- admin-dashboard if role is `admin`.

No mocked fallback user or route string machine should be used.

---

## 3. Real Auth & Onboarding Data-Flow Architecture

### 3.1 Current architecture

The current app architecture in [app/page.tsx](app/page.tsx) does the following:

1. App loads.
2. Hydration effect calls `supabase.auth.getSession()`.
3. If a session exists, it calls `profiles` table with `maybeSingle()`.
4. If no row exists or required fields are missing, it sends the user to `onboarding`.
5. If a row exists and fields are complete, it maps `profile` into the `User` type and sets `page` as `dashboard` or `admin-dashboard`.

This architecture is close to a real one, but it is not a truly secure `server guard` system because the page still depends on a local client event route state to decide where to go.

### 3.2 Missing record vs incomplete profile diagnosis

The user must be distinguished between two separate cases:

A. Missing row in `public.profiles`

This indicates:

- the `handle_new_user()` trigger failed,
- the row was never inserted,
- the `auth.users` table row exists but `profiles` was not emitted by trigger / backfill,
- or the user is a legacy record outside the trigger path.

The diagnostic response should be:

- run a profile backfill query from `auth.users` into `public.profiles`;
- log that the trigger is not firing or the row is not inserted;
- route to onboarding only if the user has a session but an incomplete profile row with required fields. Do not route to onboarding if the record is truly missing—backfill first.

B. Incomplete profile row

This is a legitimate onboarding case if the required fields are empty:

- `first_name`
- `surname`
- `student_id`
- `program`
- `year_level`
- `section`

The UI route should not force onboarding if the row is missing from `profiles`. It should first query `profiles`, then create or backfill a row before deciding whether the profile is incomplete.

### 3.3 Need for central AuthContext

The correct architecture is to centralize auth data in a server-capable provider. The route should not depend on a root page component with scattered effect hooks that set the page state arbitrarily.

Recommended components:

- `src/lib/supabase.ts` for clients.
- `app/auth/callback/route.ts` for OAuth code exchange.
- `app/middleware.ts` or root `middleware.ts` for session/role gating.
- `components/AuthContext.tsx` or `lib/auth.ts` that wraps the app and exposes:
  - `session`
  - `profile`
  - `role`
  - `isAdmin`

The context should read from Supabase through `getSession()`, `maybeSingle()`, and `select()` once, and it should be the only source of UI access decisions.

### 3.4 Need for server-side middleware

There is currently no server-side middleware file visible in the workspace. The `app/auth/callback/route.ts` callback only exchanges the code and redirects to `/`. That means there is no server route guard on the incoming route tree and no central enforcement point for user login or admin restriction.

Recommended `middleware.ts`:

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const protectedPrefix = ["/dashboard", "/admin-dashboard"];

  const token = request.cookies.get("sb-access-token");
  if (!token && protectedPrefix.some((x) => pathname.startsWith(x))) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}
```

In a real Supabase Next.js App Router architecture, the middleware should read Supabase session cookies and redirect unauthorized requests before page rendering.

### 3.5 Strict form validation requirement

The onboarding flow in [app/page.tsx](app/page.tsx) is a UI form that can be used to upsert profile data. It should not proceed if the minimal business fields are not present:

- `first_name`
- `surname`
- `student_id`

The code should block on a missing/empty `student_id` and validate `first_name` and `surname` length and `student_id` uniqueness before writing a row to `public.profiles`.

The correct guard is:

```ts
if (!firstName.trim() || !surname.trim() || !studentId.trim()) {
  return;
}
```

Then call a Supabase RPC or direct update/insert that fails if required fields are missing.

---

## 4. Concrete Action Plan

### Phase 1 — Database normalization

1. Ensure the `public.profiles` table includes only columns supported by the actual schema (`created_at` exists; `updated_at` must either be added intentionally or removed from any query).
2. Ensure the `handle_new_user()` trigger uses uppercase `NEW` and `NEW.raw_user_meta_data` correctly.
3. Ensure `on_auth_user_created` fires after `auth.users` insert and always writes a `public.profiles` row.
4. Apply RLS policies that only use `public.is_admin()` and `auth.uid()` comparisons; remove any policy logic that becomes recursive.

### Phase 2 — Auth provider architecture

1. Create a real `AuthContext` in the App Router world.
2. Ensure all app data and UI are read from `Supabase` and not from client-side fake state.
3. Ensure all route decisions come from the server and the database rather than local component route-flags.

### Phase 3 — Middleware and route guard

1. Create `middleware.ts` at the root or in `app/` as appropriate for App Router.
2. Protect `/dashboard`, `/admin-dashboard`, and similar private pages by server cookie or session checks.
3. Redirect users to `/login` if they lack a session.
4. For admin endpoints, verify if the profile row has the `role='admin'` and route accordingly.

### Phase 4 — Onboarding and profile hygiene

1. Make onboarding only follow if a session exists but `profiles` is missing or incomplete.
2. On a `profile` missing condition, create the row from `auth.users` instead of immediately landing in onboarding.
3. Validate required profile fields before a row is inserted or upserted.
4. Block `role='admin'` self-assignment via trigger/policy and never route a student to an admin page through a local UI branch.

### Phase 5 — Frontend cleanup

1. Delete mock route objects and local `role` switch shortcuts from `app/page.tsx`.
2. Delete `setTimeout` fake login transitions.
3. Replace local `setUser()` fallback mocks with `supabase`-backed hydrated user objects.
4. Make the UI read-only from the server-backed context and data store.

---

## Assessment Summary

This repository has a credible migration direction toward a real Supabase + Next.js App Router architecture. The main gaps are:

- missing real server middleware guard,
- route-gating by page state and local state instead of server-side profile/role truth,
- mock login and admin branch shortcuts,
- use of local dummy user objects and route strings to pretend an authenticated persona exists,
- missing deterministic profile creation backfill when `auth.users` creates a row.

The correct long-term production fix is to remove all UI-level state machine assumptions and turn `public.profiles` into the single deterministic source of truth for role, profile, and user identity.
