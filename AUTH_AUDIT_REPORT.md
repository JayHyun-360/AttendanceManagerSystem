# Authentication & Profile Lifecycle Audit Report

This report is based on the code currently present in the workspace:

- [app/page.tsx](app/page.tsx)
- [app/auth/callback/route.ts](app/auth/callback/route.ts)
- [src/lib/supabase.ts](src/lib/supabase.ts)
- [supabase/migrations/001_initial_schema.sql](supabase/migrations/001_initial_schema.sql)

## 1) Standard Sign-Up & Sign-In Flow

### OAuth Google path

Inside the login UI in [app/page.tsx](app/page.tsx), the Google sign-in button triggers:

```ts
const { error } = await supabase.auth.signInWithOAuth({
  provider: "google",
  options: {
    redirectTo: `${window.location.origin}/auth/callback`,
  },
});
```

That callback route is handled by [app/auth/callback/route.ts](app/auth/callback/route.ts):

```ts
const code = requestUrl.searchParams.get("code");
if (code) {
  await supabase.auth.exchangeCodeForSession(code);
}

return NextResponse.redirect(`${origin}/`);
```

So the Google path is a standard OAuth redirect style flow:

1. Start Google sign-in from the client.
2. Redirect to `auth/callback`.
3. Exchange the code for a session.
4. Redirect back to the app root.

### Email/password flow

The code page currently exposes a UI-only “Continue with Email & Password” path for the admin role, but the actual Supabase email-password login method is not implemented in the rendered page. The UI loops through a role selection and then displays an artificial `setTimeout` “proceed” branch. That is not a true Supabase email/password sign-in implementation.

### What happens immediately after `auth.onAuthStateChange` fires

In the root page component in [app/page.tsx](app/page.tsx), the app subscribes to `supabase.auth.onAuthStateChange` and then:

1. Reads `session.user`.
2. Stores the user id in local state (`authUserId`).
3. Queries the `profiles` table using `select('*').eq('id', session.user.id).maybeSingle()`.
4. If `profiles` has no row or the required fields are missing, it sends the user to the onboarding screen.
5. If the profile row exists and is complete enough, it sets the `user` object and routes the user to `admin-dashboard` or `dashboard`.

That means the event is treated as a profile hydration trigger, not as a bare authentication success signal.

## 2) Profile Hydration & Completeness Criteria

The exact client-side completeness gate in [app/page.tsx](app/page.tsx) is:

```ts
if (
  !profile ||
  !profile.student_id ||
  !profile.first_name ||
  !profile.surname
) {
  setPage("onboarding");
  return;
}
```

So the application decides that a user is not onboarded when:

- the profile row is absent (`!profile`), or
- `student_id` is empty, or
- `first_name` is empty, or
- `surname` is empty.

This is a client-side field-level gate. In JavaScript, an empty string is falsey. So yes, if a legacy or backfilled row exists with:

```sql
first_name = ''
surname = ''
```

then the check will satisfy the `!profile.first_name` and `!profile.surname` condition and push the user to the onboarding route.

This is why a backfilled profile row with empty string values is not considered a valid onboarded record.

## 3) Routing & State Revalidation

### Middleware vs. client-side page state route guard

There is no real workspace `middleware.ts` file in this repository. The only app route redirect/flow is the OAuth callback in [app/auth/callback/route.ts](app/auth/callback/route.ts), and the actual UI route gating is implemented in the single page-state machine inside [app/page.tsx](app/page.tsx).

That means route switching is driven entirely by the `page` string state machine:

```ts
const [page, setPage] = useState<Page>("landing");
```

The page component internally switches between landing, login, onboarding, dashboard, admin-dashboard, and others. This is a plain client-side route model and not a Next.js App Router server middleware gate.

### Refresh or revalidation before navigation

The onboarding form handler in [app/page.tsx](app/page.tsx) does not use `router.refresh()` or any server-side profile revalidation after submit. It writes the user profile through `supabase.from('profiles').upsert()` in the `handleOnboarding()` and `handleProfileSave()` flows. After that, it directly sets page state and navigates:

```ts
setPage("dashboard");
```

There is no `router.refresh()` or `revalidatePath()` sequence in the page component before the dashboard is shown.

### Race / state-merge risk

There is a genuine race risk because the page is both:

- a client-side route switcher (`setPage`), and
- an auth/profile hydration scanner (`getSession` + `onAuthStateChange` + profile query).

This means onboarding may be triggered by the client before the app has a stable server-side route JWT or RLS permission baseline. Since there is no server middleware route gate, the client state route machine becomes the real gate. That is acceptable for a static UI prototype, but not for a deterministic production auth system.

## 4) Verdict & Refactoring Plan

### Does this align with standard Next.js + Supabase auth flow best practices?

Not fully.

What is aligned:

- Google OAuth uses `signInWithOAuth` with a redirect callback.
- Supabase client is centralized in [src/lib/supabase.ts](src/lib/supabase.ts).
- Profile rows are loaded by `maybeSingle()` instead of strict `.single()`.
- The admin policy helper `public.is_admin()` now exists in [supabase/migrations/001_initial_schema.sql](supabase/migrations/001_initial_schema.sql).

What is not aligned:

- Email/password sign-in is not actually implemented in the client.
- There is no `middleware.ts` file in the root workspace to enforce session-aware route rules.
- Profile completeness logic is ambiguous and not hard-coded as a robust database predicate.
- UI route transitions are handled through a monolithic client page state switcher instead of App Router server/client separation.
- The code has a local route state machine that can drift away from the actual auth session state.

### Recommended deterministic refactor plan

1. Create a real App Router `middleware.ts` guard.
   - Route `/dashboard`, `/events`, `/admin`, `/profile`, etc. through the session cookie/JWT guard.
   - Redirect unauthenticated users to the home or login route.
   - Permit `/auth/callback` to evaluate the OAuth exchange and return safely.

2. Create a single auth context provider.
   - Put all session, user, and profile state in one provider.
   - Make `auth.onAuthStateChange` the canonical session event.
   - Remove duplicated page-level hydration logic in the page component.

3. Normalize profile schema and onboarding checks.
   - Treat backend profile completeness as a strict check:
     - `first_name IS NOT NULL` and `<> ''`
     - `surname IS NOT NULL` and `<> ''`
     - `student_id IS NOT NULL` and `<> ''`
   - Only route into the dashboard when the profile row passes that gate.

4. Use `maybeSingle()` or a `select(...).limit(1)` query pattern for missing records.
   - `maybeSingle()` is correct because it returns `null` when there is no row instead of forcing a `406` error from PostgREST.

5. Preserve the onboarding route and `handleOnboarding` row creation as a distinct step.
   - Do not let empty-string profile records bypass the onboarding flow.
   - If a row exists but is incomplete, route the user to onboarding immediately and require the user to fill in all required fields.

6. Move route decisions to a single server/client source of truth.
   - A deterministic route guard should not be duplicated in a page component route state machine.
   - Make the UI route follow the session and profile state after `hydrateProfile()` success.

7. Implement real email/password auth.
   - Replace the UI-only “Continue with Email & Password” route with a proper `signInWithPassword()` branch if the project intends to support classic email/password sign-in.
   - Keep Google OAuth in the callback route and clearly separate these flows.

## Final summary

The current workspace has enough Supabase and auth scaffolding to support the desired user lifecycle, but the application is still too monolithic and too local in the UI state machine. The backend and the app route model need to be separated. A real `middleware.ts` guard, one provider-owned auth state object, and a stricter profile completeness predicate would make the sign-in, profile hydration, and onboarding transition deterministic and consistent with standard Next.js + Supabase best practices.
