-- Persist uploaded event gallery media, including images and MP4 videos.

begin;

alter table public.events
  add column if not exists media_urls text[] not null default '{}';

commit;
