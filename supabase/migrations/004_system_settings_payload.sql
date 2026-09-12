alter table public.system_settings
  add column if not exists settings jsonb not null default '{}'::jsonb;

update public.system_settings
set settings = '{}'::jsonb
where settings is null;
