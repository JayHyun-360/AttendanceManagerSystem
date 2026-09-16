-- Add an editable profile cover/background image so students can personalize their profile header.

alter table public.profiles
  add column if not exists cover_photo_url text;
