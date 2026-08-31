-- =========================================================================
-- RCCG Chapel of Resurrection, Zone 9 HQs — Sunday School Exam Portal
-- Run this whole file once in Supabase: Dashboard -> SQL Editor -> New query
-- =========================================================================

-- ---------- CLASSES -------------------------------------------------------
-- Sunday School classes (Righteousness, Holiness, Peace, Joy, YAYA, ...).
-- Manageable later from Admin -> Site settings -> Classes, no SQL needed.
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);
insert into public.classes (name) values
  ('Righteousness'), ('Holiness'), ('Peace'), ('Joy'), ('YAYA')
on conflict (name) do nothing;

-- ---------- PROFILES -----------------------------------------------------
-- One row per auth.users row. role = 'admin' | 'student'.
-- Students sign up with a username; a synthetic email is generated client-side
-- (see src/lib/supabaseClient.js) so real Supabase Auth still applies.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'student' check (role in ('admin', 'student')),
  full_name text not null,
  username text unique,
  class_id uuid references public.classes(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Helper used throughout RLS policies below.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Auto-create a profile row whenever a new auth user is created.
-- full_name / role / username are passed in via signUp() "options.data".
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- SITE SETTINGS -------------------------------------------------
-- Single-row table the admin edits from "Site settings".
create table if not exists public.site_settings (
  id int primary key default 1,
  church_name text not null default 'RCCG Chapel of Resurrection, Zone 9 HQs',
  church_address text not null default 'Km. 38, Lekki-Epe Expressway, opp. Blenco Supermarket, Eputu, Lagos',
  department_name text not null default 'Sunday School Department',
  welcome_message text not null default 'Welcome! Sign in to take your quarterly review exam.',
  logo_url text,
  constraint single_row check (id = 1)
);
insert into public.site_settings (id) values (1) on conflict (id) do nothing;

-- ---------- EXAMS ----------------------------------------------------------
create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text default '',
  duration_minutes int not null default 20 check (duration_minutes > 0),
  is_open boolean not null default false,
  pass_mark_percent int not null default 50,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  question_order int not null default 0,
  question_html text not null default '',
  question_image_url text,
  question_type text not null default 'single' check (question_type in ('single', 'multiple')),
  points int not null default 1 check (points > 0)
);

create table if not exists public.options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  option_order int not null default 0,
  option_html text not null default '',
  option_image_url text,
  is_correct boolean not null default false
);

-- ---------- ATTEMPTS --------------------------------------------------------
-- One row per student per exam. answers = { [question_id]: [option_id, ...] }
create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted')),
  answers jsonb not null default '{}'::jsonb,
  score numeric,
  total_points numeric,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  unique (exam_id, student_id)
);

-- ---------- INDEXES ---------------------------------------------------------
create index if not exists idx_questions_exam on public.questions(exam_id);
create index if not exists idx_options_question on public.options(question_id);
create index if not exists idx_attempts_student on public.attempts(student_id);
create index if not exists idx_attempts_exam on public.attempts(exam_id);

-- =========================================================================
-- ROW LEVEL SECURITY
-- =========================================================================
alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.site_settings enable row level security;
alter table public.exams enable row level security;
alter table public.questions enable row level security;
alter table public.options enable row level security;
alter table public.attempts enable row level security;

-- CLASSES: public read (needed on the signup form before login), admin write.
drop policy if exists "classes_select_all" on public.classes;
create policy "classes_select_all" on public.classes for select using (true);
drop policy if exists "classes_write_admin" on public.classes;
create policy "classes_write_admin" on public.classes for all
  using (public.is_admin()) with check (public.is_admin());

-- PROFILES: everyone can read (needed for leaderboards/admin student list);
-- a user may update only their own row's full_name; only admins can write role.
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles for select using (true);

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles for insert with check (id = auth.uid());

drop policy if exists "profiles_update_self_or_admin" on public.profiles;
create policy "profiles_update_self_or_admin" on public.profiles for update
  using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_delete_admin" on public.profiles;
create policy "profiles_delete_admin" on public.profiles for delete using (public.is_admin());

-- SITE SETTINGS: public read, admin write.
drop policy if exists "settings_select_all" on public.site_settings;
create policy "settings_select_all" on public.site_settings for select using (true);
drop policy if exists "settings_update_admin" on public.site_settings;
create policy "settings_update_admin" on public.site_settings for update using (public.is_admin());

-- EXAMS: any signed-in user can read the list (students need to see current
-- AND future exams); only admins can create/edit/delete.
drop policy if exists "exams_select_signed_in" on public.exams;
create policy "exams_select_signed_in" on public.exams for select using (auth.uid() is not null);
drop policy if exists "exams_write_admin" on public.exams;
create policy "exams_write_admin" on public.exams for all using (public.is_admin()) with check (public.is_admin());

-- QUESTIONS: admins always; students once the parent exam is open, OR if
-- they already have an attempt on it (so a student mid-exam can still finish
-- even if an admin locks the exam while they're working).
drop policy if exists "questions_select" on public.questions;
create policy "questions_select" on public.questions for select using (
  public.is_admin()
  or exists (select 1 from public.exams e where e.id = exam_id and e.is_open)
  or exists (select 1 from public.attempts at where at.exam_id = exam_id and at.student_id = auth.uid())
);
drop policy if exists "questions_write_admin" on public.questions;
create policy "questions_write_admin" on public.questions for all using (public.is_admin()) with check (public.is_admin());

-- OPTIONS: same rule, one join deeper. Note: is_correct is included in every
-- row returned to students while an exam is open — the client UI hides it,
-- but for a stricter setup you would split correctness into an admin-only
-- table/view. Documented in README as a known trade-off for simplicity.
drop policy if exists "options_select" on public.options;
create policy "options_select" on public.options for select using (
  public.is_admin()
  or exists (
    select 1 from public.questions q
    join public.exams e on e.id = q.exam_id
    where q.id = question_id and e.is_open
  )
  or exists (
    select 1 from public.questions q
    join public.attempts at on at.exam_id = q.exam_id and at.student_id = auth.uid()
    where q.id = question_id
  )
);
drop policy if exists "options_write_admin" on public.options;
create policy "options_write_admin" on public.options for all using (public.is_admin()) with check (public.is_admin());

-- ATTEMPTS: a student can create/read/update only their own attempt on an
-- OPEN exam; admins can read every attempt (for grading/oversight).
drop policy if exists "attempts_select_own_or_admin" on public.attempts;
create policy "attempts_select_own_or_admin" on public.attempts for select using (
  student_id = auth.uid() or public.is_admin()
);
drop policy if exists "attempts_insert_own" on public.attempts;
create policy "attempts_insert_own" on public.attempts for insert with check (
  student_id = auth.uid()
  and exists (select 1 from public.exams e where e.id = exam_id and e.is_open)
);
drop policy if exists "attempts_update_own" on public.attempts;
-- USING gates which existing rows can be touched (must be your own, still in
-- progress). WITH CHECK governs the row *after* the update — deliberately
-- looser (just "still yours"), otherwise submitting (which changes status to
-- 'submitted') would fail Postgres's own re-check of the USING clause.
create policy "attempts_update_own" on public.attempts for update
  using (student_id = auth.uid() and status = 'in_progress')
  with check (student_id = auth.uid());

-- =========================================================================
-- STORAGE (question / option images, and the site logo)
-- =========================================================================
insert into storage.buckets (id, name, public)
values ('exam-media', 'exam-media', true)
on conflict (id) do nothing;

drop policy if exists "exam_media_public_read" on storage.objects;
create policy "exam_media_public_read" on storage.objects for select
  using (bucket_id = 'exam-media');

drop policy if exists "exam_media_admin_write" on storage.objects;
create policy "exam_media_admin_write" on storage.objects for insert
  with check (bucket_id = 'exam-media' and public.is_admin());

drop policy if exists "exam_media_admin_update" on storage.objects;
create policy "exam_media_admin_update" on storage.objects for update
  using (bucket_id = 'exam-media' and public.is_admin());

drop policy if exists "exam_media_admin_delete" on storage.objects;
create policy "exam_media_admin_delete" on storage.objects for delete
  using (bucket_id = 'exam-media' and public.is_admin());

-- =========================================================================
-- ONE-TIME: promote your first admin account.
-- 1) Sign up normally through the app's Admin screen (it calls supabase
--    auth signUp with role="admin" in the metadata) OR sign up a student
--    account then run the line below with that email.
-- 2) Or simply run this after any signup to force a given user to admin:
--
--    update public.profiles set role = 'admin'
--    where id = (select id from auth.users where email = 'you@example.com');
-- =========================================================================
