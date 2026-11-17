-- =============================================================================
-- Class recordings: each tutor sees only their own.
--
-- Before this, "Tutors and admins manage class recordings" let every tutor
-- read, change and delete every recording, and "Students can view own class
-- recordings" let ANY signed-in user (tutors and sales included) read every
-- recording with no student set. Now:
--
--   admins    everything
--   tutors    the recordings they taught (tutor_id, or the classroom session
--             the recording came from); they add, edit and delete only those
--   students  their own, plus "all students" recordings (no student set)
--
-- The private 'class-recordings' bucket follows the same rule
-- (classroom_can_read_recording).
--
-- Safe to re-run.
-- =============================================================================

create or replace function public.is_student()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users where id = auth.uid() and role = 'student'
  );
$$;

revoke all on function public.is_student() from public, anon;
grant execute on function public.is_student() to authenticated;

-- True when the caller taught this recording's class.
create or replace function public.is_my_recording(
  p_tutor_id uuid,
  p_classroom_session_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and (
    p_tutor_id = auth.uid()
    or (
      p_classroom_session_id is not null
      and exists (
        select 1 from public.classroom_sessions
        where id = p_classroom_session_id and tutor_id = auth.uid()
      )
    )
  );
$$;

revoke all on function public.is_my_recording(uuid, uuid) from public, anon;
grant execute on function public.is_my_recording(uuid, uuid) to authenticated;

drop policy if exists "Tutors and admins manage class recordings" on public.class_recordings;
drop policy if exists "Students can view own class recordings" on public.class_recordings;

drop policy if exists "class recordings: admins manage" on public.class_recordings;
create policy "class recordings: admins manage" on public.class_recordings
  for all to authenticated
  using (public.classroom_is_admin()) with check (public.classroom_is_admin());

drop policy if exists "class recordings: tutor read own" on public.class_recordings;
create policy "class recordings: tutor read own" on public.class_recordings
  for select to authenticated
  using (public.is_my_recording(tutor_id, classroom_session_id));

drop policy if exists "class recordings: tutor add own" on public.class_recordings;
create policy "class recordings: tutor add own" on public.class_recordings
  for insert to authenticated
  with check (public.classroom_is_staff() and tutor_id = auth.uid());

drop policy if exists "class recordings: tutor edit own" on public.class_recordings;
create policy "class recordings: tutor edit own" on public.class_recordings
  for update to authenticated
  using (public.is_my_recording(tutor_id, classroom_session_id))
  with check (tutor_id = auth.uid());

drop policy if exists "class recordings: tutor delete own" on public.class_recordings;
create policy "class recordings: tutor delete own" on public.class_recordings
  for delete to authenticated
  using (public.is_my_recording(tutor_id, classroom_session_id));

drop policy if exists "class recordings: students read theirs" on public.class_recordings;
create policy "class recordings: students read theirs" on public.class_recordings
  for select to authenticated
  using (
    student_id = auth.uid()
    or (student_id is null and public.is_student())
  );

-- Storage: the same people may open the file behind a recording.
create or replace function public.classroom_can_read_recording(p_path text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.classroom_is_admin() or exists (
    select 1 from public.class_recordings r
    where r.recording_url = p_path
      and (
        r.student_id = auth.uid()
        or public.is_my_recording(r.tutor_id, r.classroom_session_id)
      )
  );
$$;
