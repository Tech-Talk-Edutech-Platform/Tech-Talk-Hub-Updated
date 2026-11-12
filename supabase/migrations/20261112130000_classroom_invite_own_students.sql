-- =============================================================================
-- Tutors may only invite their own students.
--
-- A tutor's students are the users with role 'student' and
-- assigned_tutor_id = the tutor (set by admins in Users & Staff). Tutors can
-- invite only those students, and only to classes they teach. Admins can
-- still book anyone through Dashboard › Classroom.
--
-- Tutors may update roster rows in their classes (End class records
-- attendance), so a trigger also stops them pointing an existing invite at a
-- different student.
--
-- Apply with `npx supabase db push` (or paste into the SQL Editor), after
-- 20261112120000_classroom_invites_badges.sql. No type changes. Safe to
-- re-run.
-- =============================================================================

create or replace function public.classroom_is_my_student(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = p_student_id
      and role = 'student'
      and assigned_tutor_id = auth.uid()
  );
$$;

revoke execute on function public.classroom_is_my_student(uuid) from public, anon;
grant execute on function public.classroom_is_my_student(uuid) to authenticated;

drop policy if exists "classroom roster: tutor invite" on public.classroom_session_students;
create policy "classroom roster: tutor invite" on public.classroom_session_students
  for insert to authenticated
  with check (
    public.classroom_can_teach(session_id)
    and public.classroom_is_my_student(student_id)
  );

create or replace function public.classroom_roster_guard_student()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.student_id is distinct from old.student_id
    and auth.uid() is not null
    and not public.classroom_is_admin()
  then
    raise exception 'Only an admin can change which student a booking is for.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists classroom_roster_guard_student on public.classroom_session_students;
create trigger classroom_roster_guard_student
  before update of student_id on public.classroom_session_students
  for each row execute function public.classroom_roster_guard_student();
