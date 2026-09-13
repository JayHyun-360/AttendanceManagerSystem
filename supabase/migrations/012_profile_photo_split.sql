-- Split profile photo from student ID photo so they can be managed independently.
-- This migration adds the separate field required for ID verification uploads.

alter table public.profiles
  add column if not exists id_photo_url text;

-- NOTE:
-- We intentionally do not auto-backfill id_photo_url from photo_url.
-- Existing user data may contain a single legacy image that was previously reused
-- for both fields, and the app should preserve the user's real profile photo while
-- allowing the ID photo to be uploaded separately.
