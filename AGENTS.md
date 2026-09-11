# figma-make-app

Next.js App Router project with Supabase-backed Google OAuth and profile onboarding.

## Development Server

A Next.js development server is normally started through `pnpm dev` or the project workspace task.

## Project Structure

This is the active App Router structure. The main UI is implemented in an app-level client page component and the Supabase client is centralized in the shared library file.

- `app/page.tsx` - Main UI route machine and app UI implementation.
- `app/auth/callback/route.ts` - Google OAuth callback route that exchanges the auth code for a Supabase session.
- `src/lib/supabase.ts` - Shared Supabase JavaScript client initialized from the public environment variables.
- `app/globals.css` - Active global styling entrypoint and Tailwind CSS v4 import.
- `next.config.mjs` - Next.js configuration with a `@` alias that maps to `src`.
- `package.json` - Runtime and build scripts, package metadata, and dependency versions.

## Dependencies

- Runtime: Next.js 16.3.4, React 19, React DOM 19.
- Styling: Tailwind CSS v4 import through the global CSS entrypoint.
- Build tooling: TypeScript 5.7, PostCSS, and the Tailwind PostCSS plugin.
- Formatting: oxfmt.

## Styling

This project uses Tailwind CSS v4 by importing `tailwindcss` globally from the CSS file. Global CSS is living in the App Router CSS entrypoint rather than a Vite entrypoint.

## Code quality

- Use double quotes for strings containing apostrophes (`"We're here to help"`), or escape them in single-quoted strings. An unescaped apostrophe in a single-quoted string breaks the build.
- Ensure JSX tags are closed and braces are balanced.
- Export components as default exports.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
