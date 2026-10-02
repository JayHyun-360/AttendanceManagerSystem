begin;
create table if not exists public.dev_notes (
	id uuid primary key default gen_random_uuid(),
	title text not null,
	message text not null,
	type text not null default 'info'
		check (type in ('info', 'warning', 'feature', 'update')),
	is_active boolean not null default true,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

alter table public.dev_notes enable row level security;
grant select on table public.dev_notes to authenticated;

drop policy if exists dev_notes_select_active on public.dev_notes;
create policy dev_notes_select_active
	on public.dev_notes
	for select to authenticated
	using (is_active);

do $$
begin
	if exists (
		select 1
		from pg_publication
		where pubname = 'supabase_realtime'
	) and not exists (
		select 1
		from pg_publication_tables
		where pubname = 'supabase_realtime'
			and schemaname = 'public'
			and tablename = 'dev_notes'
	) then
		execute 'alter publication supabase_realtime add table public.dev_notes';
	end if;
end;
$$;

commit;