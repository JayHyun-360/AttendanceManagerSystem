begin;

update storage.buckets
set allowed_mime_types = array['image/*', 'video/mp4']::text[]
where id = 'public-images';

commit;