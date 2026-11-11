-- =============================================================================
-- Tutors can start their own calls.
--
-- Until now only admins could create classroom_sessions rows. This lets a
-- tutor (or any staff member) create a session they teach themselves, so the
-- "Start a call" button in Dashboard › My Classrooms works.
--
-- Who may host (end the call for everyone) is decided by the API server in
-- server/services/classroomAccess.ts: admins, and the session's tutor.
--
-- Apply with `npx supabase db push` (or paste into the SQL Editor), then
-- `npm run gen:types`. Safe to re-run.
-- =============================================================================

drop policy if exists "classroom sessions: tutor insert" on public.classroom_sessions;
create policy "classroom sessions: tutor insert" on public.classroom_sessions
  for insert to authenticated
  with check (public.classroom_is_staff() and tutor_id = auth.uid());
