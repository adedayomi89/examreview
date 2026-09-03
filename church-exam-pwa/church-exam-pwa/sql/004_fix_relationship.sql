-- =========================================================================
-- Migration 004: fix "more than one relationship was found for 'profiles'
-- and 'classes'" (PGRST201). Some earlier migration step left two foreign
-- keys pointing from profiles.class_id to classes.id — this finds and
-- removes any duplicates, leaving exactly one, cleanly named.
-- Supabase Dashboard -> SQL Editor -> New query -> paste this whole file -> Run
-- =========================================================================

do $$
declare
  r record;
begin
  for r in
    select conname
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and confrelid = 'public.classes'::regclass
      and contype = 'f'
  loop
    execute format('alter table public.profiles drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.profiles
  add constraint profiles_class_id_fkey
  foreign key (class_id) references public.classes(id) on delete set null;

-- Make sure PostgREST picks up the change immediately rather than waiting
-- for its next periodic refresh.
notify pgrst, 'reload schema';
