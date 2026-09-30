begin;

update storage.buckets
set
  public = false,
  file_size_limit = 20971520,
  allowed_mime_types = array['image/*', 'application/pdf']::text[]
where id = 'excuse-documents';

commit;