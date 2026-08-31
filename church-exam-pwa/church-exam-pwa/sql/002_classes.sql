-- =========================================================================
-- Migration: student classes (Righteousness, Holiness, Peace, Joy, YAYA, ...)
-- Safe to run once on a database that already has sql/schema.sql applied.
-- Supabase Dashboard -> SQL Editor -> New query -> paste this whole file -> Run
-- =========================================================================

-- ---------- CLASSES ---------------------------------------------------------
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- Seed with the classes mentioned — safe to run even if some already exist.
-- Add more any time from Admin -> Site settings -> Classes (no SQL needed later).
insert into public.classes (name) values
  ('Righteousness'), ('Holiness'), ('Peace'), ('Joy'), ('YAYA')
on conflict (name) do nothing;

alter table public.classes enable row level security;

drop policy if exists "classes_select_all" on public.classes;
create policy "classes_select_all" on public.classes for select using (true);

drop policy if exists "classes_write_admin" on public.classes;
create policy "classes_write_admin" on public.classes for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------- PROFILES: link each student to a class --------------------------
alter table public.profiles
  add column if not exists class_id uuid references public.classes(id) on delete set null;

-- ---------- Update signup trigger to also store the chosen class ------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, username, class_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    coalesce(new.raw_user_meta_data->>'full_name', 'Student'),
    new.raw_user_meta_data->>'username',
    nullif(new.raw_user_meta_data->>'class_id', '')::uuid
  );
  return new;
end;
$$;
-- (the existing on_auth_user_created trigger already points at this function,
-- so no need to recreate the trigger itself — replacing the function is enough)
