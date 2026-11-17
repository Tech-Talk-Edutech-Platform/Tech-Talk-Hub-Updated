-- =============================================================================
-- Trials run in our own classroom, not Google Meet.
--
-- Every live trial booking gets a classroom session (/classroom/<room_code>)
-- with the child on its roster, however the trial was booked: the sales
-- dashboard (book_trial), the website's booking page, or an admin on the
-- schedule. The tutor's calendar event links to the classroom
-- (calendar_events.meet_link = '/classroom/<room_code>'), and the session
-- shows under the tutor's My Classrooms.
--
-- The family joins from an emailed public link (/classroom/<code>?join=1); no
-- account or sign-in is needed. The server sends that email
-- (server/services/trialInvites.ts) and records it in the invite_email_*
-- columns below.
--
-- Removing or cancelling a booking cancels its classroom; restoring it opens
-- a fresh one. Moving the trial to another tutor or time (the schedule's
-- Reassign) moves the classroom and the booking with it.
--
-- Trials booked before this migration keep the Google Meet link the family
-- was already sent (uses_classroom = false).
--
-- None of this can block a booking: if the classroom can't be made, the
-- booking still saves and a warning is logged.
--
-- Safe to re-run.
-- =============================================================================

alter table public.classroom_sessions
  add column if not exists trial_booking_id uuid
    references public.trial_bookings (id) on delete set null;
create unique index if not exists classroom_sessions_live_trial
  on public.classroom_sessions (trial_booking_id)
  where trial_booking_id is not null and status <> 'cancelled';

alter table public.trial_bookings
  add column if not exists uses_classroom boolean not null default true,
  add column if not exists invite_email_status text not null default 'pending'
    check (invite_email_status in ('pending', 'sent', 'failed', 'skipped')),
  add column if not exists invite_email_sent_at timestamptz,
  add column if not exists invite_email_error text,
  add column if not exists invite_email_attempts integer not null default 0;

-- Bookings made before this stay on Meet, and nobody is emailed out of the
-- blue. (now() is when this migration started, so new bookings aren't caught.)
update public.trial_bookings
set uses_classroom = false,
    invite_email_status = 'skipped',
    invite_email_error = 'Booked before classroom trials: this trial uses the tutor’s Meet link.'
where created_at < now()
  and invite_email_attempts = 0
  and invite_email_status = 'pending';

-- An unused 8-digit room code, like the ones class links already use.
create or replace function public.classroom_new_room_code()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  v_code text;
begin
  loop
    v_code := (10000000 + floor(random() * 90000000))::bigint::text;
    exit when not exists (
      select 1 from public.classroom_sessions where room_code = v_code
    );
  end loop;
  return v_code;
end;
$$;

revoke all on function public.classroom_new_room_code() from public, anon, authenticated;

-- Makes a trial booking's classroom match the booking and its slot.
create or replace function public.trial_booking_sync_classroom(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.trial_bookings;
  v_event public.calendar_events;
  v_session public.classroom_sessions;
  v_student_user uuid;
  v_minutes integer;
  v_link text;
begin
  select * into v_booking from public.trial_bookings where id = p_booking_id;
  if not found or not v_booking.uses_classroom then
    return;
  end if;

  -- Removed or cancelled: close the classroom and drop the link.
  if v_booking.removed_at is not null or v_booking.status = 'cancelled' then
    update public.classroom_sessions
    set status = 'cancelled', calendar_event_id = null
    where trial_booking_id = v_booking.id
      and status in ('scheduled', 'not_completed');
    update public.calendar_events
    set meet_link = null
    where id = v_booking.calendar_event_id
      and meet_link like '/classroom/%';
    return;
  end if;

  -- Attended, no-show, lost, enrolled: the classroom is left as it is.
  if v_booking.status <> 'scheduled' then
    return;
  end if;

  select * into v_event from public.calendar_events where id = v_booking.calendar_event_id;
  if not found then
    return;
  end if;
  v_minutes := greatest(5, least(600,
    round(extract(epoch from (v_event.end_time - v_event.start_time)) / 60)::integer));

  select * into v_session from public.classroom_sessions
  where trial_booking_id = v_booking.id and status <> 'cancelled'
  order by created_at desc
  limit 1;

  if not found then
    insert into public.classroom_sessions (
      room_code, title, page_title, class_type, tutor_id, calendar_event_id,
      scheduled_at, duration_minutes, status, created_by, trial_booking_id
    ) values (
      public.classroom_new_room_code(),
      left('Trial: ' || v_booking.student_name, 200),
      'Trial class',
      'trial',
      coalesce(v_event.tutor_id, v_booking.mentor_id),
      v_event.id,
      v_event.start_time,
      v_minutes,
      'scheduled',
      v_booking.booked_by,
      v_booking.id
    )
    returning * into v_session;

    select student_user_id into v_student_user
    from public.leads where id = v_booking.lead_id;

    insert into public.classroom_session_students (
      session_id, student_id, lead_id, display_name, grade, phone, email,
      time_zone, source, special_requirement
    ) values (
      v_session.id,
      v_student_user,
      v_booking.lead_id,
      left(v_booking.student_name, 120),
      nullif(v_booking.student_grade, ''),
      nullif(v_booking.parent_phone, ''),
      v_booking.parent_email,
      'Africa/Nairobi',
      v_booking.source,
      v_booking.notes
    );
  else
    -- Keep an upcoming classroom in step with its slot.
    update public.classroom_sessions
    set tutor_id = coalesce(v_event.tutor_id, v_booking.mentor_id),
        calendar_event_id = v_event.id,
        scheduled_at = v_event.start_time,
        duration_minutes = v_minutes
    where id = v_session.id
      and status = 'scheduled'
      and (tutor_id is distinct from coalesce(v_event.tutor_id, v_booking.mentor_id)
        or calendar_event_id is distinct from v_event.id
        or scheduled_at is distinct from v_event.start_time
        or duration_minutes is distinct from v_minutes);
  end if;

  v_link := '/classroom/' || v_session.room_code;
  update public.calendar_events
  set meet_link = v_link
  where id = v_event.id and meet_link is distinct from v_link;
exception when others then
  raise warning 'trial_booking_sync_classroom(%): %', p_booking_id, sqlerrm;
end;
$$;

revoke all on function public.trial_booking_sync_classroom(uuid) from public, anon, authenticated;

-- Runs at commit, after book_trial() and restore_trial_booking() have
-- finished with the slot (they set its link to the tutor's Meet link).
create or replace function public.trial_bookings_sync_classroom()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.trial_booking_sync_classroom(new.id);
  return null;
end;
$$;

drop trigger if exists trial_bookings_sync_classroom on public.trial_bookings;
create constraint trigger trial_bookings_sync_classroom
  after insert or update of removed_at, status, calendar_event_id
  on public.trial_bookings
  deferrable initially deferred
  for each row execute function public.trial_bookings_sync_classroom();

-- A trial moved to another tutor or time on the schedule: the booking (so
-- the new tutor sees it under Trial bookings) and the classroom follow.
create or replace function public.calendar_events_move_trial()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking_id uuid;
begin
  for v_booking_id in
    select id from public.trial_bookings
    where calendar_event_id = new.id
      and removed_at is null
      and status <> 'cancelled'
  loop
    if new.tutor_id is not null and new.tutor_id is distinct from old.tutor_id then
      update public.trial_bookings
      set mentor_id = new.tutor_id, updated_at = now()
      where id = v_booking_id;
    end if;
    perform public.trial_booking_sync_classroom(v_booking_id);
  end loop;
  return null;
end;
$$;

drop trigger if exists calendar_events_move_trial on public.calendar_events;
create trigger calendar_events_move_trial
  after update of tutor_id, start_time, end_time on public.calendar_events
  for each row
  when (old.tutor_id is distinct from new.tutor_id
    or old.start_time is distinct from new.start_time
    or old.end_time is distinct from new.end_time)
  execute function public.calendar_events_move_trial();
