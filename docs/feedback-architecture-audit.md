# Feedback UX & System Architecture Audit

**Scope:** Public/auth, onboarding, protected student flows, admin flows, Supabase/data boundaries, realtime refreshes, uploads, destructive actions, and reusable feedback infrastructure.

**Audit date:** 2026-09-26

## Executive summary

The system has useful local feedback patterns—especially login, event CRUD, scanner recovery, selected uploads, profile save, settings save, and attendance preflight—but feedback is not currently a reliable application-wide contract.

The highest-risk problems are:

1. **The global toast host is not mounted.** `src/components/ui/sonner.tsx` exists and `Toaster` is imported in places, but the audited root/protected layouts do not render `<Toaster />`. Many `toast.success()` and `toast.error()` calls may therefore be invisible.
2. **Mutation failures are frequently console-only.** Several forms close/reset or local state updates proceed even when persistence fails.
3. **The UI reports success after partial failure.** Profile/settings/event/media cleanup failures can be logged while the user still sees “saved” or “deleted.”
4. **Read failures look like valid empty/default data.** Dashboard, events, announcements, fines, reports, and many admin loaders log errors but render empty/zero/default states without Retry or stale-data indicators.
5. **High-impact actions lack consistent pending locks, confirmation, retry, or typed outcomes.** This affects excuse requests, approvals, attendance deletion/overwrite, bulk attendance, fine clearing, media removal, logout, onboarding, and settings.
6. **The client talks directly to Supabase without a shared result/error contract.** RLS and database triggers provide meaningful protection, but the UI does not consistently distinguish validation, authorization, conflict, network/timeout, partial, and unknown-commit outcomes.
7. **Realtime refreshes are not observable or race-safe.** Subscription status/errors are ignored and callbacks launch uncancelled refetches that may resolve out of order.

## Prioritized recommendations

| Priority | Finding | Why it matters | Recommended direction |
|---|---|---|---|
| **P0** | Mount and standardize global feedback | Toast calls may not be visible anywhere, making existing success/error work ineffective. | Mount exactly one `<Toaster />` in `app/layout.tsx`; remove dead `toastMessage` state; add semantic success/error/warning/partial helpers. |
| **P0** | Stop unconditional success after partial or unknown outcomes | Users may believe data was saved/deleted when cleanup or persistence failed. | Return typed results separating primary database outcome, cleanup outcome, affected IDs, retryability, and unknown commit. Only close/reset after verified primary success. |
| **P0** | Make high-impact mutations awaitable and recoverable | Excuse, attendance, approval, deletion, overwrite, and batch actions can be duplicated or silently fail. | Add per-action pending locks, typed per-item results, confirmation for destructive actions, authoritative rereads, and Retry failed. |
| **P0** | Separate auth/session failure from redirect/default/infinite loading | A backend outage can look like logout, missing profile, or a valid empty system. | Give session, profile, and settings hydration independent `loading/ready/error` states with `Retry`; settle all flags in `finally`; surface logout failures. |
| **P1** | Add resource, partial, stale, and retry states to reads | Failed queries currently render empty or stale-looking screens. | Preserve last-good data during refresh; distinguish `empty` from `failed`, `partial`, and `stale`; provide targeted Retry and last-updated context. |
| **P1** | Introduce typed data/mutation boundaries | Direct client Supabase calls have no normalized error/result contract or operation identity. | Add a typed repository/server-action/API layer for privileged or multi-step commands while retaining RLS as defense in depth. |
| **P1** | Make realtime refreshes scoped and race-safe | Dropped subscriptions and out-of-order refetches can leave stale or inconsistent UI. | Add subscription status/error handling, reconnect/backoff, online state, coalesced/cancellable refresh, sequence guards, and authoritative reconciliation. |
| **P1** | Standardize confirmation and pending behavior | Destructive actions are inconsistent and sometimes irreversible without confirmation. | Create one accessible `AlertDialog` with consequence copy, focus handling, safe cancel, and pending-safe close. |
| **P1** | Make uploads honest and retryable | Selected files, uploaded files, database metadata, and cleanup are not consistently distinguished. | Create shared upload state with validation, progress, cancellation, retry, idempotency, blob cleanup, and partial-batch reporting. |
| **P2** | Finish navigation, QR, route-boundary, empty-state, and accessibility polish | Several routes have blank/dead-end, endless skeleton, or navigation ambiguity. | Add route `loading.tsx`/`error.tsx`, transition-aware navigation, QR retry states, explicit no-data/no-match states, and accessible modal/button primitives. |

## Evidence by area

### 1. Global feedback infrastructure

- `app/layout.tsx:18-23` mounts only `TooltipProvider`.
- `app/(protected)/layout.tsx` imports `Toaster`, but its returned JSX does not render it.
- `toastMessage` in the protected layout is declared but not assigned.
- `src/components/ui` has button, skeleton, sonner, tabs, and tooltip, but no shared `Dialog`, `AlertDialog`, `ErrorState`, `EmptyState`, `RetryButton`, `LoadingButton`, or form-field primitives.
- Two ad hoc modal implementations exist:
  - `app/shared-page.tsx:4912-4988`
  - `app/LandingExperienceClient.tsx:3202-3244`
- `src/components/ui/button.tsx` has no standard loading prop or `aria-busy` behavior.

### 2. Auth, shell, onboarding, and profile

- `app/(protected)/layout.tsx:90-236` logs session/profile/settings failures instead of rendering recoverable error states.
- Settings hydration can leave the shell on a generic spinner if an exception occurs before readiness is settled.
- Logout resets local state and navigates even when `signOut` fails (`app/(protected)/layout.tsx:287-297`).
- OAuth callback errors redirect without a reason or retry context (`app/auth/callback/route.ts:39-82`).
- Onboarding upsert failures and invalid data are primarily console-only (`app/(protected)/onboarding/page.tsx:10-89`); the submit contract returns `void`, so the UI cannot reliably know whether persistence succeeded.
- Profile/media cleanup failures are logged while the UI can still show unconditional success (`app/(protected)/profile/page.tsx:103-117`).
- Upload handlers can remain in an uploading state when exceptions bypass `catch/finally`.

### 3. Student flows

- Dashboard, events, announcements, and fines loaders commonly use `console.error` without visible error/retry state.
- Empty events and announcements can render blank areas instead of explicit empty/no-match copy.
- Excuse submission (`app/(protected)/attendance-history/page.tsx:242-270`) logs insert failures and closes the modal/refreshes without an awaitable result contract.
- QR generation/download (`app/shared-page.tsx:2919-2965`, `6047-6145`) lacks distinct pending, failure, success, and retry states.
- Proof attachment displays a filename but does not clearly distinguish selected/local proof from successfully uploaded storage proof.
- `my-fines` can look like “no fines” when one or more underlying queries fail.

### 4. Admin flows

- Many admin loaders log query errors only: dashboard, events, scanner, attendees, students, announcements, excuse requests, reports, and settings.
- Event CRUD is one of the stronger areas, but delete/status actions still need consistent per-row pending state, confirmation, and cleanup partial-failure reporting.
- Attendee deletion has no consistent confirmation, pending state, success/error feedback, or retry (`app/(protected)/admin-attendees/page.tsx:283-295`).
- Bulk attendance emits success styling even when failed writes exist (`app/shared-page.tsx:11469-11510`), clears selection, and provides no Retry failed flow.
- Approve/deny/waive excuse actions lack confirmation, per-request pending state, and visible failure/success feedback (`app/(protected)/admin-excuse-requests/page.tsx:91-107`).
- Reports can keep old report data visible while filters reload, without a stale/pending indicator (`app/(protected)/admin-reports/page.tsx:94-105`, `323-350`).
- Settings can show saved success after media cleanup failure (`app/(protected)/admin-settings/page.tsx:194-218`).
- Announcement create/edit forms may close/reset even when the route mutation fails; delete lacks consistent confirmation and feedback.
- Print/PNG export has no consistent pending, success, or failure feedback.

### 5. Data and realtime boundaries

- Business mutations are issued directly from browser components through `src/lib/supabase.ts`; there is no business API/server-action boundary beyond the auth callback route.
- RLS, uniqueness constraints, and database triggers are meaningful strengths, especially around attendance and fine reconciliation. They should remain defense in depth.
- There is no shared classification for validation, authorization, conflict, network/timeout, partial success, or unknown commit.
- Some updates do not verify affected-row counts or returned authoritative rows.
- Event version checks are performed client-side but are not consistently part of the atomic update predicate.
- `src/lib/realtime.ts:3-24` ignores subscription status/errors and fires uncancelled refetches. Consumers can race and let slower old responses overwrite newer data.
- Storage cleanup and database metadata updates are separate operations; cleanup errors are often console-only.

## Recommended feedback state model

### Resource reads

```text
idle
  -> loading
  -> ready(data)
  -> empty
  -> failed(error, retryable)
  -> partial(data, failedSources)
  -> stale(data, refreshError)
```

Keep last-good data during refresh failure. Never represent a failed query as an empty array or zero total.

### Mutations

```text
idle
  -> validating
  -> pending(operationId)
  -> success(authoritativeData)
  -> failed(error, retryable)
  -> conflict(serverVersion)
  -> partial(primarySuccess, failedSecondaryIds)
  -> unknownCommit(reconcileRequired)
```

### Uploads

```text
idle
  -> validating
  -> uploading(progress)
  -> uploaded(url)
  -> failed(error, retryable)
  -> cancelled
```

A selected local file is not the same thing as an uploaded/committed URL.

### Destructive actions

```text
idle
  -> confirmationRequired
  -> pending
  -> success | failed | cancelled
```

Keep the dialog open on failure and disable only the affected action while pending.

### Batch actions

Return per-item results plus an aggregate status:

```text
success | partial | failed | unknown
```

Retain failed/unknown IDs and provide `Retry failed` instead of clearing the entire selection.

## Recommended reusable primitives

Create these under `src/components/ui` or a shared feature layer:

- `Toaster` mounted once globally.
- Semantic toast helpers: success, error, warning, partial success, unknown outcome.
- `useResourceState` / `useQueryResource` with retry, stale state, last-good data, and last-updated metadata.
- `useAsyncAction` / `useMutationState` with pending locks, duplicate protection, cancellation, operation IDs, and typed results.
- `LoadingButton` with pending label, spinner, disabled state, and `aria-busy`.
- `ErrorState`, `EmptyState`, `PartialDataBanner`, `StaleDataBadge`, and `RetryButton`.
- Accessible `Modal` / `FormModal` and `AlertDialog` with labels, focus management, Escape handling, scroll lock, and pending-safe close.
- Typed error normalization for validation, authorization, conflict, network/timeout, unknown commit, and partial cleanup.
- Reusable upload hook/component with validation, serialization, cancellation, retry, blob URL lifecycle, and batch outcomes.
- Scoped realtime hook with subscription status, reconnect, offline status, debounce/coalescing, cancellation, sequence guards, and reconciliation.

## Recommended implementation sequence

1. Define result/error contracts and the error taxonomy.
2. Mount the global `Toaster`; remove dead toast state; add semantic toast helpers and basic feedback primitives.
3. Fix P0 flows: protected hydration, onboarding, excuse submit/review, attendee deletion, bulk attendance, logout, profile/settings cleanup.
4. Add shared `Modal`/`AlertDialog` and apply confirmation plus per-action pending state to delete, overwrite, approval, waiver, fine clearing, and media removal.
5. Convert route loaders to resource states with Retry and last-good-data retention, starting with protected layout, dashboard, events, announcements, fines, reports, admin lists, and settings.
6. Introduce typed repository/server-action boundaries for privileged or multi-step operations; verify affected rows, versions, and authoritative results.
7. Replace the realtime helper with scoped, observable, cancellable, race-safe subscriptions.
8. Consolidate uploads and storage cleanup, including proof attachment semantics and partial-success retry.
9. Apply navigation, QR, empty-state, not-found, modal accessibility, and route-boundary polish.

## Verification checklist

- Trigger visible success, error, warning, and partial toasts on public, auth, onboarding, protected, and admin routes.
- Force session, profile, settings, database, authorization, timeout, duplicate, and network failures; verify distinct user-facing recovery.
- Confirm every mutation disables only its relevant controls while pending and prevents duplicate clicks.
- Confirm forms/modals remain open after failure and only close after verified success.
- Confirm destructive and overwrite actions have accessible confirmation and safe cancellation.
- Simulate database success plus media-cleanup failure; verify partial-success warning and retry rather than unconditional success.
- Test successful empty, no-match, backend error, partial dependency error, and refresh failure for every route query.
- Test realtime disconnect, reconnect, burst events, out-of-order responses, and unmount during fetch.
- Verify affected-row/version checks and explicit conflict/duplicate/rejected/unknown-commit outcomes.
- Test uploads with invalid type/size, cancellation, timeout, retry, duplicate retry, partial batch failure, and draft discard.
- Test QR generation/download, disappeared event/profile, and unauthenticated states for recovery rather than null/endless skeleton.
- Run accessibility checks for dialog semantics, focus, keyboard behavior, toaster announcements, inline errors, `aria-busy`, and Retry controls.

## Bottom line

The system does not primarily lack more toast calls; it lacks a **consistent operation-feedback architecture**. Start by making every read and mutation truthfully report its state, then reuse that contract across the existing UI. The most urgent change is to fix invisible/global feedback and the P0 trust paths before adding cosmetic polish.
