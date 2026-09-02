-- =========================================================================
-- Migration 003: question types, class-restricted exams, teacher role,
-- and student self-service password recovery.
-- Safe to run once on a database that already has schema.sql + 002_classes.sql
-- applied. Supabase Dashboard -> SQL Editor -> New query -> paste -> Run.
-- =========================================================================

-- ---------- MORE QUESTION TYPES ---------------------------------------------
alter table public.questions drop constraint if exists questions_question_type_check;
alter table public.questions add constraint questions_question_type_check
  check (question_type in ('single', 'multiple', 'true_false', 'fill_blank', 'matching'));

-- For 'matching' questions, each option row is a left-hand term
-- (option_html) paired with the correct right-hand text it matches to.
alter table public.options add column if not exists match_text text;

-- ---------- ASSIGN EXAMS TO SPECIFIC CLASSES --------------------------------
-- No rows for an exam = visible/open to every class (unchanged default
-- behaviour for all your existing exams). One or more rows = restricted to
-- just those classes.
create table if not exists public.exam_classes (
  exam_id uuid not null references public.exams(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  primary key (exam_id, class_id)
);
alter table public.exam_classes enable row level security;

drop policy if exists "exam_classes_select_signed_in" on public.exam_classes;
create policy "exam_classes_select_signed_in" on public.exam_classes for select
  using (auth.uid() is not null);
drop policy if exists "exam_classes_write_admin" on public.exam_classes;
create policy "exam_classes_write_admin" on public.exam_classes for all
  using (public.is_admin()) with check (public.is_admin());

-- Starting an attempt now also requires: exam has no class restriction at
-- all, OR the student's own class is one of the assigned ones.
drop policy if exists "attempts_insert_own" on public.attempts;
create policy "attempts_insert_own" on public.attempts for insert with check (
  student_id = auth.uid()
  and exists (select 1 from public.exams e where e.id = exam_id and e.is_open)
  and (
    not exists (select 1 from public.exam_classes ec where ec.exam_id = exam_id)
    or exists (
      select 1 from public.exam_classes ec
      join public.profiles p on p.class_id = ec.class_id
      where ec.exam_id = exam_id and p.id = auth.uid()
    )
  )
);

-- ---------- TEACHER ROLE ----------------------------------------------------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('admin', 'student', 'teacher'));

-- Which class(es) each teacher is responsible for. A teacher with no rows
-- here manages nothing yet — assign at least one class from Admin -> Teachers.
create table if not exists public.teacher_classes (
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  primary key (teacher_id, class_id)
);
alter table public.teacher_classes enable row level security;

create or replace function public.is_teacher()
returns boolean
language sql
security definer
stable
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher');
$$;

drop policy if exists "teacher_classes_select" on public.teacher_classes;
create policy "teacher_classes_select" on public.teacher_classes for select
  using (public.is_admin() or teacher_id = auth.uid());
drop policy if exists "teacher_classes_write_admin" on public.teacher_classes;
create policy "teacher_classes_write_admin" on public.teacher_classes for all
  using (public.is_admin()) with check (public.is_admin());

-- Teachers can see attempts for students in their assigned class(es), same
-- as admins already could for everyone.
drop policy if exists "attempts_select_own_or_admin" on public.attempts;
create policy "attempts_select_own_or_admin" on public.attempts for select using (
  student_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1 from public.teacher_classes tc
    join public.profiles p on p.class_id = tc.class_id
    where tc.teacher_id = auth.uid() and p.id = attempts.student_id
  )
);

-- ---------- STUDENT SELF-SERVICE PASSWORD RECOVERY --------------------------
-- Holds a salted hash only — never the plain recovery code. Written and
-- checked exclusively by the two Netlify functions using the service role;
-- ordinary clients never read or write this column directly.
alter table public.profiles add column if not exists recovery_hash text;
