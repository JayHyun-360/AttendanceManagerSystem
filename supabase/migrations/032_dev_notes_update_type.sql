begin;

alter table public.dev_notes
  drop constraint if exists dev_notes_type_check;

alter table public.dev_notes
  add constraint dev_notes_type_check
  check (type in ('info', 'warning', 'feature', 'update'));

commit;