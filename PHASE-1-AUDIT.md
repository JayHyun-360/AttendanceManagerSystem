# Adesse — Phase 1 Admin Shell Audit

**Scope:** Audit only. No application code was changed during this phase.

## 1. Verified stack and setup

- **Framework:** Next.js `16.3.4`
- **Router:** Next.js App Router (`app/` directory, `next/navigation`)
- **UI:** React 19; lockfile resolves React `19.2.4`
- **Language:** TypeScript `5.7.x`
- **CSS:** Tailwind CSS v4 using `@import "tailwindcss"`
- **Supabase:** `@supabase/ssr` and `@supabase/supabase-js`
- **Icons:** `lucide-react` `^1.45.0` is installed, but the shell mostly uses custom inline SVG icons
- **Motion:** `framer-motion` `^13.2.0` is installed and used
- **Motion preference:** `motion/react` is not installed or referenced
- **Command palette:** `cmdk` is not installed or referenced
- **shadcn configuration:** `components.json` uses the `new-york` style, RSC enabled, Tailwind v4, and CSS variables
- **Existing shadcn-style components:**
  - `src/components/ui/button.tsx`
  - `src/components/ui/feedback.tsx`
  - `src/components/ui/skeleton.tsx`
  - `src/components/ui/sonner.tsx`
  - `src/components/ui/tabs.tsx`
  - `src/components/ui/tooltip.tsx`

## 2. Shell architecture

### Authenticated layout

File: `app/(protected)/layout.tsx`

This layout:

- Loads the Supabase session and profile.
- Builds the application-level `User` object.
- Performs role-based routing.
- Tracks the active page.
- Renders the shared `TopBar`.
- Renders the shared `Sidebar`.
- Wraps route content in `PageShell`.
- Handles sign out.

Main shell structure:

```tsx
<TopBar ... />
<div>
  <ProtectedSidebar ... />
  <main>
    <PageShell>{children}</PageShell>
  </main>
</div>
```

### Shared shell components

File: `app/shared-page.tsx`

Relevant definitions:

- `ProfileIcon` — around line 2717
- `PageShell` — around line 2906
- `PageHeader` — around line 2914
- `AdesseMark` — around line 2950
- `AdesseWordmark` — around line 2960
- `TopBar` — around line 3054
- `Sidebar` — around line 3237

`app/shared-page.tsx` is approximately 15,000 lines and contains the shell, icons, shared primitives, student pages, admin pages, scanner UI, reports, and settings.

### Route sharing

Authenticated routes live under `app/(protected)/` and inherit the protected layout. Most route files are data-loading adapters that import page components from `app/shared-page.tsx`.

Examples:

- `app/(protected)/admin-dashboard/page.tsx`
- `app/(protected)/admin-events/page.tsx`
- `app/(protected)/admin-students/page.tsx`
- `app/(protected)/admin-settings/page.tsx`
- `app/(protected)/dev-notes/page.tsx`

## 3. Current header

File: `app/shared-page.tsx`, `TopBar` around line 3054

Current behavior:

- Sticky header with a height of `56px`.
- Mobile hamburger opens the navigation drawer.
- Hamburger is hidden at the `lg` breakpoint and above.
- Header branding consists of:
  - Existing Adesse mark on `sm` and above.
  - A divider.
  - `Student Event Attendance & Records System`.
- The long title uses truncation on narrow screens.
- The header does not show the current page title.
- The right side contains:
  - User avatar.
  - First name at `sm` and above.
  - Three-dot menu.
- Clicking the avatar/name button routes to `/profile`.

The mobile logo is explicitly hidden below `sm`:

```tsx
<span className="hidden h-9 w-9 shrink-0 items-center justify-center sm:inline-flex">
  <AdesseMark className="h-8 w-8" />
</span>
```

At a 393px viewport, the mobile header therefore has no visible logo.

## 4. Current sidebar and drawer

File: `app/shared-page.tsx`, `Sidebar` around line 3237

### Desktop

At `lg` and above:

- The sidebar is always visible.
- It has a fixed width of `240px` (`w-60`).
- It is always expanded.
- There is no compact/icon-only state.
- There is no hidden desktop state.
- There is no animated transition between sidebar widths or modes.

### Mobile

Below `lg`:

- The desktop sidebar is hidden.
- When `open` is true, a fixed drawer is mounted.
- The drawer is approximately `288px` wide (`w-72`).
- A dark overlay is placed behind it.
- Clicking the overlay closes it.
- A close button is available inside the drawer.
- There is no drawer entrance/exit animation.
- There is no Escape-key close behavior.
- There is no focus trap.
- There is no body-scroll lock.
- Safe-area padding is not applied to the drawer header/footer.

Current effective modes are only:

1. Persistent expanded desktop sidebar.
2. Closed/open mobile drawer.

The requested three modes do not currently exist:

1. Expanded.
2. Compact/icon-only.
3. Hidden.

## 5. Navigation configuration

The navigation is defined inline inside `Sidebar` rather than in a standalone configuration file.

### Admin navigation

1. Overview → `/admin-dashboard`
2. Events → `/admin-events`
3. QR Scanner → `/admin-scanner`
4. Attendees → `/admin-attendees`
5. Students → `/admin-students`
6. Announcements → `/admin-announcements`
7. Dev Notes → `/dev-notes`
8. Excuse Requests → `/admin-excuse-requests`
9. Reports → `/admin-reports`
10. Settings → `/admin-settings`

### Student navigation

1. Home → `/dashboard`
2. Events → `/events`
3. My QR Code → `/my-qr`
4. Announcements → `/announcements`
5. Dev Notes → `/dev-notes`
6. Attendance → `/attendance-history`
7. My Fines → `/my-fines`
8. Profile → `/profile`

Routing knowledge is duplicated in multiple places:

- `pathToPage` in `app/(protected)/layout.tsx`
- `routeFromPage` in `app/(protected)/layout.tsx`
- Another `routeFromPage` inside `Sidebar`
- Inline navigation arrays inside `Sidebar`

This should be consolidated before adding global search or centralized page titles.

## 6. Logo source and drawer issue

The shell uses:

```ts
const adesseLogoSrc = "/adesse-a.svg";
```

Asset: `public/adesse-a.svg`

Other logo assets include:

- `public/adesse-logo.svg`
- `public/adesse-logo.png`
- `public/adesse-favicon.svg`

The current shell logo is an SVG containing an embedded base64 PNG image rather than a simple vector Λ mark.

The drawer uses `AdesseWordmark variant="mobile"`. That component combines:

```tsx
<AdesseMark />
<span className="adesse-display">desse</span>
```

The mark already visually resembles an A, and the separate `desse` text is manually placed beside it. That is why the drawer visually reads as **“A desse”** instead of one coherent wordmark.

The requested minimalist upside-down V, `Λ`, is not currently implemented as a dedicated vector component or asset.

## 7. Page titles and toolbars

Shared component: `PageHeader` in `app/shared-page.tsx` around line 2914.

Most pages render a title, optional subtitle, and optional action/toolbar through `PageHeader`.

Examples include:

- Events
- My QR Code
- Announcements
- My Attendance
- My Fines
- Profile
- Admin Events
- Attendees
- Students
- Admin Announcements
- Excuse Requests
- Reports
- Management & Settings

Some pages use custom headings instead:

- Student dashboard uses a custom greeting.
- Admin dashboard uses `Admin Overview`.
- Event detail and announcement detail views use custom headings.
- Loading/error states have their own titles.

The current top bar does not show a page title. If a page title is added to the header without adjusting content titles, duplicate titles may appear.

Recommendation: create centralized route metadata and decide whether the header title is:

- A compact contextual label while the content title remains primary, or
- A replacement for selected content-level titles.

## 8. Search and command palette

There is currently no global search or command palette.

Not found:

- `cmdk`
- `CommandDialog`
- `CommandPalette`
- Global search context/provider
- `motion/react`

There are page-local searches, including:

- Admin students search by name, ID, program, or section.
- Admin attendees student search.

These are local filters, not global navigation/search.

## 9. Auth, user name, avatar, and sign out

### Session and profile

File: `app/(protected)/layout.tsx`

The layout:

1. Calls `supabase.auth.getSession()`.
2. Reads the authenticated user ID.
3. Queries the `profiles` table.
4. Hydrates the application `User` object.
5. Redirects incomplete profiles to `/onboarding`.

The `User` type is defined in `app/shared-page.tsx` around line 948 and includes:

- `firstName`
- `middleInitial`
- `surname`
- `role`
- `photoUrl`
- Contact and enrollment fields

### Avatar

File: `app/shared-page.tsx`, `ProfileIcon` around line 2717

- Uses `user.photoUrl` when available.
- Falls back to a generic gray profile icon.
- The header fallback does not use initials.
- Google profile metadata can be used as a fallback photo during session hydration.
- Google photo URLs may be persisted to `profiles.photo_url`.

### Header user name

The header displays only:

```tsx
user.firstName
```

The surname is not shown. At widths below `sm`, the name is hidden and only the avatar remains.

### Sign out

File: `app/(protected)/layout.tsx`

Sign out calls:

```ts
supabase.auth.signOut()
```

Then it:

- Shows a loading/success/error toast.
- Clears local protected state.
- Routes to `/login`.

The sidebar footer exposes the visible `Sign out` button.

## 10. Problems ranked by impact

### High impact

1. **No compact/icon-only or hidden desktop sidebar modes.**
2. **The shell is centralized in an approximately 15,000-line file.**
3. **Navigation and route metadata are duplicated.**
4. **The mobile drawer lacks motion, Escape handling, focus management, and body-scroll locking.**
5. **The current logo is not the requested Λ mark and produces the “A desse” appearance.**

### Medium impact

6. The mobile header hides the brand mark below `sm`.
7. The long product descriptor is a poor mobile header label.
8. Page title rendering is inconsistent across dashboard, detail, and standard pages.
9. Custom inline SVG icons are used even though `lucide-react` is installed.

### Lower impact

10. `app/globals.css` applies a broad transition rule to all elements.
11. Safe-area handling exists in scanner UI but not in the shell header or drawer.

## 11. Recommendations

### Header

Use a responsive three-part header:

- **Left:** sidebar/menu toggle and Λ mark.
- **Center/primary area:** current page title or short context label.
- **Right:** global search trigger, profile/avatar, overflow menu.

Desktop should show the Λ mark consistently and use the current page name instead of the long product descriptor as the primary context.

Mobile should:

- Keep the Λ mark visible.
- Use a short, truncatable page title.
- Use an icon-sized search trigger.
- Respect top safe-area insets.

### Sidebar approach

**Recommendation: use a custom shell based on the existing sidebar, enhanced with motion and existing shadcn primitives.**

Reasons:

- The current sidebar is already custom.
- Three desktop modes are not just a standard mobile drawer.
- Existing route behavior can be preserved.
- A custom build makes width, label, logo, and content transitions easier to coordinate.
- shadcn `Tooltip`, `Button`, and potentially `Sheet`/`Dialog` can still be used where appropriate.

The preferred library from the brief, `motion/react`, is not installed. Phase 2 must either add the `motion` package or continue with the installed `framer-motion`.

### Three-mode animation

Use one state type:

```ts
type SidebarMode = "expanded" | "compact" | "hidden";
```

- **Expanded:** full width, icons and labels.
- **Compact:** narrow width, icons only, tooltips on hover/focus.
- **Hidden:** no sidebar width reserved; content expands.
- **Mobile:** temporary drawer presentation derived from the same navigation model.

Animate:

- Sidebar width.
- Main content available width.
- Label opacity and position.
- Logo scale/position.
- Compact-mode tooltip appearance.

For reduced motion:

- Use the motion library’s reduced-motion hook.
- Disable interpolated width/position animation.
- Apply immediate state changes.
- Preserve keyboard focus and accessible labels.

### Λ logo placement

- **Expanded:** Λ plus “Adesse” or short wordmark.
- **Compact:** Λ only, centered.
- **Hidden:** no sidebar logo; retain Λ in the header.
- **Mobile drawer:** Λ plus “Adesse” as one coherent lockup.
- **Mobile header:** Λ remains visible.

Prefer a clean vector component or simple SVG rather than the embedded base64 PNG asset.

### Global search

Desktop:

- Use a compact header search trigger.
- Open a command palette on click.
- Support `Ctrl+K` / `⌘K`.
- Start with navigation destinations, page names, and common admin actions.
- Navigate through a centralized route map.
- Keep page-local data searches separate initially.

Mobile:

- Use a search icon or compact trigger.
- Open the same command palette as a full-screen or bottom-sheet presentation.
- Provide a clear close action and focus management.

## 12. Questions before Phase 2

1. Should the Λ be only a symbol, or should expanded mode also show an “Adesse” wordmark?
2. Should the header show the current page name, the full product descriptor, or both?
3. How should users restore a hidden sidebar: header button only, edge handle, keyboard shortcut, or another method?
4. Should compact mode be user-controlled and persisted, or automatic at certain widths?
5. What should the desktop default be: expanded, compact, or responsive?
6. Should global search initially cover only navigation/actions, or also students, events, announcements, and attendance records?
7. Should the existing Students and Attendees local searches remain unchanged?
8. Should Phase 2 install/use `motion` with `motion/react`, or continue using installed `framer-motion`?
9. Should admin users continue routing to `/profile` from the header avatar?
10. Should the existing Help & Feedback menu remain unchanged?

## 13. Phase 2 plan

Likely files to create or change:

- `app/(protected)/layout.tsx`
  - Shell state and current page metadata.
- `app/shared-page.tsx`
  - Replace or extract the existing `TopBar`, `Sidebar`, and logo rendering.
- `app/globals.css`
  - Safe-area and reduced-motion shell styles if required.
- `src/components/ui/...`
  - Search/command primitives if needed.
- New `src/components/shell/` files:
  - `app-header.tsx`
  - `app-sidebar.tsx`
  - `app-logo.tsx`
  - `global-search.tsx`
  - `navigation-config.ts`
- `package.json` and `pnpm-lock.yaml`
  - Only if adding `motion` or a command-palette dependency.
- Relevant page components
  - Only if title duplication requires small changes.

## Phase 1 status

- **Application code changed:** No
- **Audit report created:** Yes
- **Phase 2:** Waiting for approval and answers to the questions above
