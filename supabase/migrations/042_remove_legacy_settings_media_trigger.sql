begin;

drop trigger if exists system_settings_queue_storage_cleanup
  on public.system_settings;

commit;