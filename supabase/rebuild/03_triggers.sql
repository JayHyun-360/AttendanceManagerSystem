-- Consolidated current triggers. Run after 01_core_schema.sql and 02_routines.sql.

begin;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create trigger profiles_clear_student_fields_for_admin
  before update of role on public.profiles
  for each row execute function public.clear_student_fields_for_admin();

create trigger profiles_guard_role_change
  before insert or update on public.profiles
  for each row execute function public.prevent_admin_self_demotion();

create trigger profiles_guard_storage_references
  before insert or update on public.profiles
  for each row execute function public.guard_new_storage_references();

create trigger profiles_resolve_pending_id_exception_by_photo
  after update of id_photo_url on public.profiles
  for each row execute function public.resolve_pending_id_exception_by_photo();

create trigger profiles_materialize_student_absences_insert
  after insert on public.profiles
  for each row execute function public.materialize_student_absences_after_profile_change();

create trigger profiles_materialize_student_absences_update
  after update of role, program on public.profiles
  for each row execute function public.materialize_student_absences_after_profile_change();

create trigger profiles_validate_program_insert
  before insert on public.profiles
  for each row execute function public.validate_program_selection();

create trigger profiles_validate_program_update
  before update of program on public.profiles
  for each row execute function public.validate_program_selection();

create trigger events_materialize_inferred_absences_insert
  after insert on public.events
  for each row execute function public.materialize_event_absences_after_change();

create trigger events_materialize_inferred_absences_update
  after update of status, event_date, program, multi_session,
    morning_end, afternoon_end, end_time on public.events
  for each row execute function public.materialize_event_absences_after_change();

create trigger events_cancel_only_without_attendance
  before update of status on public.events
  for each row execute function public.guard_event_cancellation_without_attendance();

create trigger events_validate_program_insert
  before insert on public.events
  for each row execute function public.validate_program_selection();

create trigger events_validate_program_update
  before update of program on public.events
  for each row execute function public.validate_program_selection();

create trigger attendance_scans_capture_fine_policy_insert
  before insert on public.attendance_scans
  for each row execute function public.capture_attendance_fine_policy();

create trigger attendance_scans_capture_fine_policy_update
  before update of status on public.attendance_scans
  for each row execute function public.capture_attendance_fine_policy();

create trigger attendance_scans_reconcile_fine_insert
  after insert on public.attendance_scans
  for each row execute function public.reconcile_attendance_fine();

create trigger attendance_scans_reconcile_fine_update
  after update of event_id, student_id, session_label, status, fine_policy_enabled
  on public.attendance_scans
  for each row execute function public.reconcile_attendance_fine();

create trigger attendance_scans_require_active_event_insert
  before insert on public.attendance_scans
  for each row execute function public.guard_attendance_scan_event_status();

create trigger attendance_scans_require_active_event_update
  before update of event_id on public.attendance_scans
  for each row execute function public.guard_attendance_scan_event_status();

create trigger excuse_requests_reconcile_fine
  after update of status on public.excuse_requests
  for each row execute function public.reconcile_excuse_fine();

create trigger excuse_requests_link_fine
  before insert on public.excuse_requests
  for each row execute function public.link_excuse_request_fine();

create trigger events_guard_storage_references
  before insert or update on public.events
  for each row execute function public.guard_new_storage_references();

create trigger announcements_guard_storage_references
  before insert or update on public.announcements
  for each row execute function public.guard_new_storage_references();

create trigger excuse_requests_guard_storage_references
  before insert or update on public.excuse_requests
  for each row execute function public.guard_new_storage_references();

create trigger system_settings_guard_storage_references
  before insert or update on public.system_settings
  for each row execute function public.guard_new_storage_references();

create trigger profiles_enqueue_removed_media
  after update or delete on public.profiles
  for each row execute function public.enqueue_removed_profile_media();

create trigger events_enqueue_removed_media
  after update or delete on public.events
  for each row execute function public.enqueue_removed_event_media();

create trigger announcements_enqueue_removed_media
  after update or delete on public.announcements
  for each row execute function public.enqueue_removed_announcement_media();

create trigger excuse_requests_enqueue_removed_media
  after update or delete on public.excuse_requests
  for each row execute function public.enqueue_removed_excuse_media();

create trigger system_settings_enqueue_removed_media
  after update or delete on public.system_settings
  for each row execute function public.enqueue_removed_system_settings_media();

create trigger storage_cleanup_queue_lock_claim
  before update of status on public.storage_cleanup_queue
  for each row execute function public.lock_storage_cleanup_claim();

commit;
