-- Consolidated current RLS policies and explicit privileges.
-- Supabase-managed Auth and Storage schemas must already exist.

begin;

create policy profiles_select_students
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

create policy profiles_insert_students
  on public.profiles for insert
  with check (auth.uid() = id and role = 'student'::public.user_role);

create policy profiles_update_students
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy profiles_admin_full_access
  on public.profiles for all
  using (public.is_admin())
  with check (public.is_admin());

create policy events_select_authenticated
  on public.events for select to authenticated
  using (true);

create policy events_insert_admin
  on public.events for insert
  with check (public.is_admin());

create policy events_update_admin
  on public.events for update
  using (public.is_admin());

create policy events_delete_admin
  on public.events for delete
  using (public.is_admin());

create policy attendance_logs_select_owner_or_admin
  on public.attendance_logs for select
  using (auth.uid() = student_id or public.is_admin());

create policy attendance_insert_admin
  on public.attendance_logs for insert
  with check (public.is_admin());

create policy attendance_update_admin
  on public.attendance_logs for update
  using (public.is_admin());

create policy attendance_scans_select_owner_or_admin
  on public.attendance_scans for select
  using (auth.uid() = student_id or public.is_admin());

create policy attendance_scans_insert_admin
  on public.attendance_scans for insert
  with check (public.is_admin());

create policy attendance_scans_update_admin
  on public.attendance_scans for update
  using (public.is_admin());

create policy attendance_scans_delete_admin
  on public.attendance_scans for delete
  using (public.is_admin());

create policy fines_student_select
  on public.fines for select
  using (auth.uid() = student_id or public.is_admin());

create policy fines_insert_admin
  on public.fines for insert
  with check (public.is_admin());

create policy fines_update_admin
  on public.fines for update
  using (public.is_admin());

create policy excuse_select_auth
  on public.excuse_requests for select
  using (auth.uid() = student_id or public.is_admin());

create policy announcements_select_authenticated
  on public.announcements for select to authenticated
  using (true);

create policy announcements_insert_admin
  on public.announcements for insert
  with check (public.is_admin());

create policy announcements_update_admin
  on public.announcements for update
  using (public.is_admin());

create policy announcements_delete_admin
  on public.announcements for delete
  using (public.is_admin());

create policy settings_select_public
  on public.system_settings for select
  using (true);

create policy settings_update_admin
  on public.system_settings for update
  using (public.is_admin());

create policy attendance_scan_corrections_select_admin
  on public.attendance_scan_corrections for select to authenticated
  using (public.is_admin());

create policy event_feedback_select_admin
  on public.event_feedback for select to authenticated
  using (public.is_admin());

create policy programs_select_authenticated
  on public.programs for select to authenticated
  using (true);

create policy programs_insert_admin
  on public.programs for insert to authenticated
  with check (public.is_admin());

create policy programs_update_admin
  on public.programs for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Create only the three documented buckets in the Dashboard before this file.
-- Private media reads and all deletions remain subject to Storage RLS.
create policy public_images_public_read
  on storage.objects for select
  using (
    bucket_id = 'public-images'
    and auth.role() in ('anon', 'authenticated')
  );

create policy public_images_admin_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'public-images'
    and public.is_admin()
    and split_part(name, '/', 1) = 'admin'
    and split_part(name, '/', 2) = auth.uid()::text
    and split_part(name, '/', 3) = 'public-media'
    and split_part(name, '/', 4) <> ''
    and split_part(name, '/', 5) = ''
  );

create policy public_images_admin_update
  on storage.objects for update to authenticated
  using (
    bucket_id = 'public-images'
    and public.is_admin()
  )
  with check (
    bucket_id = 'public-images'
    and public.is_admin()
    and split_part(name, '/', 1) = 'admin'
    and split_part(name, '/', 2) <> ''
    and split_part(name, '/', 3) = 'public-media'
    and split_part(name, '/', 4) <> ''
    and split_part(name, '/', 5) = ''
  );

create policy public_images_admin_delete_unreferenced
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'public-images'
    and public.can_delete_storage_object(bucket_id, name)
  );

create policy student_private_media_owner_admin_read
  on storage.objects for select to authenticated
  using (
    bucket_id = 'student-private-media'
    and (
      split_part(name, '/', 1) = auth.uid()::text
      or public.is_admin()
    )
    and split_part(name, '/', 2) in ('profile', 'cover', 'id')
    and split_part(name, '/', 3) <> ''
    and split_part(name, '/', 4) = ''
  );

create policy student_private_media_owner_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'student-private-media'
    and split_part(name, '/', 1) = auth.uid()::text
    and split_part(name, '/', 2) in ('profile', 'cover', 'id')
    and split_part(name, '/', 3) <> ''
    and split_part(name, '/', 4) = ''
  );

create policy student_private_media_owner_admin_delete_unreferenced
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'student-private-media'
    and public.can_delete_storage_object(bucket_id, name)
  );

create policy excuse_documents_student_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'excuse-documents'
    and split_part(name, '/', 1) = auth.uid()::text
    and split_part(name, '/', 2) <> ''
    and split_part(name, '/', 3) = ''
  );

create policy excuse_documents_admin_read
  on storage.objects for select to authenticated
  using (bucket_id = 'excuse-documents' and public.is_admin());

create policy excuse_documents_admin_delete_unreferenced
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'excuse-documents'
    and public.can_delete_storage_object(bucket_id, name)
  );

-- API roles use public objects through Supabase services, but do not create
-- objects in the application schema.
grant usage on schema public to anon, authenticated, service_role;
revoke create on schema public from public, anon, authenticated, service_role;

-- Clear Supabase's broad per-object defaults from the application tables.
-- Regrant only the operations used by the app and the cleanup worker.
revoke all privileges on table
  public.profiles,
  public.events,
  public.attendance_logs,
  public.attendance_scans,
  public.fines,
  public.excuse_requests,
  public.announcements,
  public.system_settings,
  public.attendance_scan_corrections,
  public.event_feedback,
  public.storage_cleanup_queue,
  public.programs,
  public.dev_notes
from public, anon, authenticated, service_role;

grant select, insert, update on table public.profiles to authenticated;
grant select on table public.profiles to service_role;

grant select, insert, update, delete on table public.events to authenticated;
grant select on table public.events to service_role;

grant select, insert, update, delete on table public.attendance_scans
  to authenticated;
grant select, update on table public.fines to authenticated;
grant select on table public.excuse_requests to authenticated, service_role;

grant select, insert, update, delete on table public.announcements
  to authenticated;
grant select on table public.announcements to service_role;

grant select on table public.system_settings to anon, authenticated, service_role;
grant update on table public.system_settings to authenticated;

grant select on table public.event_feedback to authenticated;
grant select, insert, update on table public.programs to authenticated;
grant select on table public.dev_notes to authenticated;

grant select, update on table public.storage_cleanup_queue to service_role;

-- Keep Supabase Storage's CRUD grants intact; the REST API does not need
-- these additional table privileges.
revoke truncate, references, trigger, maintain on table storage.objects
  from public, anon, authenticated, service_role;

revoke all privileges on sequence public.storage_cleanup_queue_id_seq
  from public, anon, authenticated, service_role;

-- New public-schema objects created as postgres must not inherit API access.
alter default privileges for role postgres in schema public
  revoke all on tables from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on sequences from public, anon, authenticated, service_role;
alter default privileges for role postgres
  revoke execute on functions from public;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated, service_role;

revoke all on function public.is_admin()
  from public, anon, authenticated, service_role;
grant execute on function public.is_admin()
  to anon, authenticated;

revoke all on function public.prevent_admin_self_demotion()
  from public, anon, authenticated, service_role;
revoke all on function public.handle_new_user()
  from public, anon, authenticated, service_role;
revoke all on function public.clear_student_fields_for_admin()
  from public, anon, authenticated, service_role;
revoke all on function public.capture_attendance_fine_policy()
  from public, anon, authenticated, service_role;
revoke all on function public.reconcile_attendance_fine()
  from public, anon, authenticated, service_role;
revoke all on function public.reconcile_excuse_fine()
  from public, anon, authenticated, service_role;
revoke all on function public.materialize_student_absences_after_profile_change()
  from public, anon, authenticated, service_role;
revoke all on function public.materialize_event_absences_after_change()
  from public, anon, authenticated, service_role;
revoke all on function public.materialize_student_inferred_absences(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.materialize_event_inferred_absences(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.validate_program_selection()
  from public, anon, authenticated, service_role;
revoke all on function public.guard_attendance_scan_event_status()
  from public, anon, authenticated, service_role;
revoke all on function public.guard_event_cancellation_without_attendance()
  from public, anon, authenticated, service_role;
revoke all on function public.link_excuse_request_fine()
  from public, anon, authenticated, service_role;
revoke all on function public.enqueue_removed_profile_media()
  from public, anon, authenticated, service_role;
revoke all on function public.enqueue_removed_event_media()
  from public, anon, authenticated, service_role;
revoke all on function public.enqueue_removed_announcement_media()
  from public, anon, authenticated, service_role;
revoke all on function public.enqueue_removed_excuse_media()
  from public, anon, authenticated, service_role;
revoke all on function public.enqueue_removed_settings_media(jsonb, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function public.enqueue_removed_system_settings_media()
  from public, anon, authenticated, service_role;

revoke all on function public.extend_event_session(uuid, text, integer, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.extend_event_session(uuid, text, integer, integer)
  to authenticated;

revoke all on function public.is_fines_enabled()
  from public, anon, authenticated, service_role;
grant execute on function public.is_fines_enabled() to authenticated;

revoke all on function public.event_session_fine_amount(
  uuid, text, public.attendance_status
) from public, anon, authenticated, service_role;
revoke all on function public.event_session_has_ended(date, time)
  from public, anon, authenticated, service_role;

revoke all on function public.submit_excuse_request(uuid, text, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.submit_excuse_request(uuid, text, text, text)
  to authenticated;

revoke all on function public.review_excuse_request(uuid, public.excuse_status)
  from public, anon, authenticated, service_role;
grant execute on function public.review_excuse_request(uuid, public.excuse_status)
  to authenticated;

revoke all on function public.get_public_events()
  from public, anon, authenticated, service_role;
grant execute on function public.get_public_events()
  to anon, authenticated;

revoke all on function public.correct_closed_event_inferred_absence(
  uuid, uuid, text, public.attendance_status, text
) from public, anon, authenticated, service_role;
grant execute on function public.correct_closed_event_inferred_absence(
  uuid, uuid, text, public.attendance_status, text
) to authenticated;

revoke all on function public.get_my_event_feedback_status(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.get_my_event_feedback_status(uuid)
  to authenticated;

revoke all on function public.submit_event_feedback(uuid, integer, text)
  from public, anon, authenticated, service_role;
grant execute on function public.submit_event_feedback(uuid, integer, text)
  to authenticated;

revoke all on function public.get_admin_event_feedback_summary(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.get_admin_event_feedback_summary(uuid)
  to authenticated;

revoke all on function public.enqueue_storage_cleanup_value(text, text)
  from public, anon, authenticated, service_role;

revoke all on function public.storage_object_path(text, text)
  from public, anon, authenticated, service_role;
revoke all on function public.is_storage_object_referenced(text, text)
  from public, anon, authenticated, service_role;
revoke all on function public.assert_storage_reference(text, text, uuid, text)
  from public, anon, authenticated, service_role;
revoke all on function public.guard_new_storage_references()
  from public, anon, authenticated, service_role;
revoke all on function public.lock_storage_cleanup_claim()
  from public, anon, authenticated, service_role;
revoke all on function public.register_storage_upload(text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.register_storage_upload(text, text)
  to authenticated;
revoke all on function public.extend_storage_upload_intent(text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.extend_storage_upload_intent(text, text)
  to authenticated;
revoke all on function public.can_delete_storage_object(text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.can_delete_storage_object(text, text)
  to authenticated;

revoke all on function public.get_admin_report_aggregates(date, date, integer, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.get_admin_report_aggregates(date, date, integer, integer)
  to authenticated;

revoke all on function public.event_program_matches(text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.event_program_matches(text, text)
  to authenticated;

commit;
