-- Convert student profiles cleanly when their role is changed to admin.
-- Identity and contact fields remain available for the admin account.

begin;

create or replace function public.clear_student_fields_for_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'admin'::public.user_role
     and old.role is distinct from new.role then
    new.student_id := null;
    new.program := null;
    new.year_level := null;
    new.section := null;
    new.qr_version := null;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_clear_student_fields_for_admin on public.profiles;
create trigger profiles_clear_student_fields_for_admin
before update of role on public.profiles
for each row
execute function public.clear_student_fields_for_admin();

commit;
