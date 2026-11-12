-- Intentional baseline configuration only. No historical application rows.

begin;

insert into public.system_settings (
  id,
  system_name,
  qr_expiration_minutes,
  settings
)
values (
  1,
  'Adesse',
  5,
  '{"finesEnabled": false}'::jsonb
)
on conflict (id) do nothing;

insert into public.programs (name, active, sort_order, legacy_aliases)
values
  ('BSIT - Information Technology', true, 10, array['BSIT']),
  ('BSCS - Computer Science', true, 20, array['BSCS']),
  ('BSBA - Business Administration', true, 30, array['BSBA']),
  ('BSEd - Secondary Education', true, 40, array['BSEd']),
  ('BSHM - Hospitality Management', true, 50, array['BSHM'])
on conflict (name) do nothing;

commit;
