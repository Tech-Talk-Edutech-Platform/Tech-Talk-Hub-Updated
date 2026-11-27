-- Recordings: every student sees only their own.
--
-- Before this, a student saw their own recordings plus EVERY recording with
-- no student set. Classroom recordings get a student only when exactly one
-- student was in the class, so group-class recordings (and "All students"
-- uploads) showed up for every student on the platform, and then wouldn't
-- play, because the file rule only let a student open recordings in their
-- own name. Now a student sees a recording when:
--
--   * it's in their name (class_recordings.student_id), or
--   * it came from a class they were on the list for
--     (classroom_session_students), or
--   * their own tutor uploaded it for "all my students" (no student, no class).
--
-- The private 'class-recordings' bucket follows the same rule. Tutors and
-- admins are unchanged (20261117130000_tutor_own_recordings.sql).
--
-- Also:
--   * class_recordings.class_kind: 'trial' or 'regular' for uploads, so
--     admins can filter. Classroom recordings don't need it: a trial class is
--     linked to its booking (classroom_sessions.trial_booking_id).
--   * Tutors can upload video files (MP4, WebM, MOV) as well as paste links.
--   * An index for the three-month clean-up (server/routes/cronRecordings.ts).
--
-- Safe to re-run.

alter table public.class_recordings add column if not exists class_kind text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'class_recordings_class_kind_check'
  ) then
    alter table public.class_recordings
      add constraint class_recordings_class_kind_check
      check (class_kind in ('trial', 'regular'));
  end if;
end;
$$;

comment on column public.class_recordings.class_kind is
  'Uploads only: trial or regular. Classroom recordings take it from the class.';

create index if not exists class_recordings_created_at
  on public.class_recordings (created_at);

-- True when the signed-in student may watch this recording.
create or replace function public.student_can_see_recording(
  p_student_id uuid,
  p_classroom_session_id uuid,
  p_tutor_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and (
    p_student_id = auth.uid()
    or (
      p_classroom_session_id is not null
      and exists (
        select 1 from public.classroom_session_students
        where session_id = p_classroom_session_id and student_id = auth.uid()
      )
    )
    or (
      p_student_id is null
      and p_classroom_session_id is null
      and p_tutor_id is not null
      and exists (
        select 1 from public.users
        where id = auth.uid() and role = 'student' and assigned_tutor_id = p_tutor_id
      )
    )
  );
$$;

revoke all on function public.student_can_see_recording(uuid, uuid, uuid) from public, anon;
grant execute on function public.student_can_see_recording(uuid, uuid, uuid) to authenticated;

drop policy if exists "class recordings: students read theirs" on public.class_recordings;
create policy "class recordings: students read theirs" on public.class_recordings
  for select to authenticated
  using (public.student_can_see_recording(student_id, classroom_session_id, tutor_id));

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
        public.is_my_recording(r.tutor_id, r.classroom_session_id)
        or public.student_can_see_recording(r.student_id, r.classroom_session_id, r.tutor_id)
      )
  );
$$;

update storage.buckets
set allowed_mime_types = array['video/webm', 'video/mp4', 'video/quicktime']
where id = 'class-recordings';
