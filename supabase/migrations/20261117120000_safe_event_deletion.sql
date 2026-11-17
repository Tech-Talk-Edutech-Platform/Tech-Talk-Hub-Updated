-- =============================================================================
-- Calendar sessions: deleting mistakes safely, and no booked session without
-- a student.
--
--   * A session with a student in it can't be deleted, by anyone, from any
--     screen (trigger calendar_events_guard_delete). "A student" means any of:
--       - a row in event_attendance (registered students),
--       - a linked `classes` row (accepted bookings),
--       - a live trial booking (trial students are leads, not accounts, so
--         they never appear in event_attendance),
--       - a pending or accepted booking request from a student,
--       - a student on the roster of the session's classroom.
--   * delete_calendar_event() is what the dashboards call. It deletes an empty
--     session; one that removed or cancelled trial bookings still point at is
--     archived instead (booking_status 'cancelled'), because those bookings
--     keep the time for the sales history.
--   * A booked (non "Free Slot") session can't be inserted without a student
--     (deferred trigger calendar_events_require_student, checked at commit).
--     Booked sessions come from booking a student into a free slot:
--     book_trial(), respond_to_class_booking_request() and the booking page's
--     auto-assign all do that, so none of them is affected.
--   * Tutors may only insert free slots directly; the RPCs above do the rest.
--
-- Safe to re-run.
-- =============================================================================

-- Why a session can't be deleted, or null when nobody is booked into it.
create or replace function public.calendar_event_student_reason(p_event_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when exists (
      select 1 from public.event_attendance where event_id = p_event_id
    ) then 'a student is on its attendance list'
    when exists (
      select 1 from public.calendar_events
      where id = p_event_id and class_id is not null
    ) then 'it belongs to a student''s booked class'
    when exists (
      select 1 from public.trial_bookings
      where calendar_event_id = p_event_id
        and removed_at is null
        and status <> 'cancelled'
    ) then 'a trial student is booked into it'
    when exists (
      select 1 from public.class_booking_requests
      where calendar_event_id = p_event_id
        and status in ('pending', 'accepted')
    ) then 'a student has requested it (accept or reject the request first)'
    when exists (
      select 1
      from public.classroom_session_students r
      join public.classroom_sessions s on s.id = r.session_id
      where s.calendar_event_id = p_event_id
        and s.status <> 'cancelled'
    ) then 'its classroom has a student on the roster'
  end;
$$;

revoke all on function public.calendar_event_student_reason(uuid) from public, anon, authenticated;

-- For the dashboards: why the caller can't delete this session, or null when
-- they can. Only the session's tutor and admins may ask.
create or replace function public.calendar_event_delete_blocker(p_event_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_event public.calendar_events;
begin
  select * into v_event from public.calendar_events where id = p_event_id;
  if not found then
    return 'This session no longer exists.';
  end if;
  if not (public.classroom_is_admin() or v_event.tutor_id = auth.uid()) then
    return 'Only this session''s tutor or an admin can delete it.';
  end if;
  if v_event.session_status = 'ongoing' then
    return 'This class is running right now. End it first.';
  end if;
  return public.calendar_event_student_reason(p_event_id);
end;
$$;

revoke all on function public.calendar_event_delete_blocker(uuid) from public, anon;
grant execute on function public.calendar_event_delete_blocker(uuid) to authenticated;

-- Deletes a session booked by mistake. Returns 'deleted', or 'archived' when
-- old trial bookings still need its time.
create or replace function public.delete_calendar_event(p_event_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.calendar_events;
  v_blocker text;
begin
  select * into v_event from public.calendar_events where id = p_event_id for update;
  if not found then
    raise exception 'This session no longer exists. Refresh the calendar.';
  end if;
  if not (public.classroom_is_admin() or v_event.tutor_id = auth.uid()) then
    raise exception 'Only this session''s tutor or an admin can delete it.'
      using errcode = '42501';
  end if;

  v_blocker := public.calendar_event_delete_blocker(p_event_id);
  if v_blocker is not null then
    raise exception 'This session can''t be deleted: %.', v_blocker;
  end if;

  -- An empty classroom made for this session goes with it.
  update public.classroom_sessions
  set status = 'cancelled', calendar_event_id = null
  where calendar_event_id = p_event_id
    and status in ('scheduled', 'not_completed');

  if exists (select 1 from public.trial_bookings where calendar_event_id = p_event_id) then
    update public.calendar_events
    set booking_status = 'cancelled',
        title = 'Free Slot',
        class_type = default,
        notes = null
    where id = p_event_id;
    return 'archived';
  end if;

  delete from public.calendar_events where id = p_event_id;
  return 'deleted';
end;
$$;

revoke all on function public.delete_calendar_event(uuid) from public, anon;
grant execute on function public.delete_calendar_event(uuid) to authenticated;

-- Nobody deletes a session a student is in, whichever screen or query does it.
create or replace function public.calendar_events_guard_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reason text := public.calendar_event_student_reason(old.id);
begin
  if v_reason is not null then
    raise exception 'This session can''t be deleted: %. Cancel or remove the booking first.', v_reason
      using errcode = 'P0001';
  end if;
  return old;
end;
$$;

drop trigger if exists calendar_events_guard_delete on public.calendar_events;
create trigger calendar_events_guard_delete
  before delete on public.calendar_events
  for each row execute function public.calendar_events_guard_delete();

-- A booked session is never created empty. Checked at commit, so a function
-- that inserts the session and then its student in one transaction is fine.
create or replace function public.calendar_events_require_student()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.calendar_events;
begin
  -- The row as it is at commit; it may have been changed or deleted since.
  select * into v_event from public.calendar_events where id = new.id;
  if not found
     or v_event.title = 'Free Slot'
     or v_event.booking_status = 'cancelled' then
    return null;
  end if;
  if public.calendar_event_student_reason(v_event.id) is null then
    raise exception 'A booked session needs a student. Open a free slot, then book the student into it.'
      using errcode = 'P0001';
  end if;
  return null;
end;
$$;

drop trigger if exists calendar_events_require_student on public.calendar_events;
create constraint trigger calendar_events_require_student
  after insert on public.calendar_events
  deferrable initially deferred
  for each row execute function public.calendar_events_require_student();

-- Tutors: read everything they could before, insert free slots only, update
-- and delete their own sessions (deletes still pass the guard above).
drop policy if exists "Tutors manage own events" on public.calendar_events;
drop policy if exists "calendar events: tutor insert free slots" on public.calendar_events;
create policy "calendar events: tutor insert free slots" on public.calendar_events
  for insert to authenticated
  with check (tutor_id = auth.uid() and title = 'Free Slot' and class_id is null);
drop policy if exists "calendar events: tutor update own" on public.calendar_events;
create policy "calendar events: tutor update own" on public.calendar_events
  for update to authenticated
  using (tutor_id = auth.uid()) with check (tutor_id = auth.uid());
drop policy if exists "calendar events: tutor delete own" on public.calendar_events;
create policy "calendar events: tutor delete own" on public.calendar_events
  for delete to authenticated
  using (tutor_id = auth.uid());

-- restore_trial_booking() checks the slot is still a free slot, but not that
-- it was deleted (archived) since. Refuse to put a booking back on one.
create or replace function public.trial_bookings_guard_restore()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.removed_at is not null and new.removed_at is null and exists (
    select 1 from public.calendar_events
    where id = new.calendar_event_id and booking_status = 'cancelled'
  ) then
    raise exception 'The tutor deleted this time from their calendar. Book a new trial instead.';
  end if;
  return new;
end;
$$;

drop trigger if exists trial_bookings_guard_restore on public.trial_bookings;
create trigger trial_bookings_guard_restore
  before update of removed_at on public.trial_bookings
  for each row execute function public.trial_bookings_guard_restore();
