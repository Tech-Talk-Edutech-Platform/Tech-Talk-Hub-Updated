-- =============================================================================
-- Tutors can delete classes nobody was invited to.
--
--   * delete_classroom_session(id): the class's tutor (or an admin) deletes a
--     class made by mistake. Refused once anyone was booked into it: invited
--     students and trial students both make a roster row, and a class students
--     were invited to stays on record whether or not they joined. Also refused
--     for a trial booking's classroom, a class with an end-of-class report
--     (completed / not completed), and one that alerts were sent from.
--   * classroom_session_delete_blocker(id): why the caller can't delete it, or
--     null when they can. The dashboard shows this reason.
--   * Withdrawing an invite is now allowed only before the class's start time,
--     and only while nobody has joined. Before, it was allowed until the tutor
--     opened the room, so a tutor could withdraw the invites of a class nobody
--     came to and then delete it.
--
-- Tutors still can't delete classes directly (there is no tutor delete
-- policy); they go through delete_classroom_session(). Admins keep deleting
-- any class from Dashboard › Classroom.
--
-- Apply after 20261117150000_trial_classrooms.sql (it reads
-- classroom_sessions.trial_booking_id), with `npx supabase db push` or by
-- pasting into the SQL Editor. Safe to re-run.
-- =============================================================================

create or replace function public.classroom_session_delete_blocker(p_session_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_session public.classroom_sessions;
begin
  select * into v_session from public.classroom_sessions where id = p_session_id;
  if not found then
    return 'This class no longer exists.';
  end if;
  if not (public.classroom_is_admin() or v_session.tutor_id = auth.uid()) then
    return 'Only this class''s tutor or an admin can delete it.';
  end if;
  if exists (
    select 1 from public.classroom_session_students where session_id = p_session_id
  ) then
    return 'Students were invited to this class, so it stays on record.';
  end if;
  if v_session.trial_booking_id is not null then
    return 'This class belongs to a trial booking. Cancel the booking instead.';
  end if;
  if v_session.status in ('completed', 'not_completed') then
    return 'This class has an end-of-class report, so it stays on record.';
  end if;
  if exists (
    select 1 from public.classroom_alerts where session_id = p_session_id
  ) then
    return 'Alerts were sent from this class, so it stays on record.';
  end if;
  return null;
end;
$$;

revoke all on function public.classroom_session_delete_blocker(uuid) from public, anon;
grant execute on function public.classroom_session_delete_blocker(uuid) to authenticated;

create or replace function public.delete_classroom_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_blocker text;
begin
  -- Lock the class first: an invite sent at the same moment either lands
  -- before this check (and blocks the delete) or fails because the class is
  -- gone.
  perform 1 from public.classroom_sessions where id = p_session_id for update;

  v_blocker := public.classroom_session_delete_blocker(p_session_id);
  if v_blocker is not null then
    raise exception '%', v_blocker using errcode = 'P0001';
  end if;

  delete from public.classroom_sessions where id = p_session_id;
end;
$$;

revoke all on function public.delete_classroom_session(uuid) from public, anon;
grant execute on function public.delete_classroom_session(uuid) to authenticated;

-- Withdrawing an invite deletes the roster row (and anything given in class),
-- so tutors may do it only before the start time and before anyone joins.
-- After that the invite stays, and with it the class.
drop policy if exists "classroom roster: tutor uninvite" on public.classroom_session_students;
create policy "classroom roster: tutor uninvite" on public.classroom_session_students
  for delete to authenticated
  using (
    public.classroom_can_teach(session_id)
    and exists (
      select 1 from public.classroom_sessions s
      where s.id = session_id
        and s.status = 'scheduled'
        and s.started_at is null
        and (s.scheduled_at is null or s.scheduled_at > now())
    )
  );
