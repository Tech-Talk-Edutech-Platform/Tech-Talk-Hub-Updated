-- Flexible trial booking, in everyone's own time zone.
--
-- 1. Any time, not only open slots. book_trial_at() books a tutor at the time
--    the family wants: it uses the tutor's "Free Slot" when they opened one,
--    and otherwise adds the trial to their calendar, as long as no class of
--    theirs is within 15 minutes of it. A website booking that matches no
--    slot goes to a tutor whose calendar is clear and for whom the time falls
--    between 7 AM and 9 PM (leads_assign_any_tutor).
-- 2. Time zones. The family's zone is kept on the lead (leads.time_zone) and
--    the booking (trial_bookings.family_time_zone); each user's comes from
--    their browser (users.time_zone, set_my_time_zone()). A trial booked for
--    8 AM in Denver then reads 6 PM to a tutor in Nairobi: in the dashboards,
--    the tutor's notification and the emails.
--
-- leads.class_date / class_time stay Nairobi wall-clock time: every existing
-- trigger and function reads them that way.

-- PART 1 ── columns ------------------------------------------------------------

alter table public.leads add column if not exists time_zone text;
alter table public.trial_bookings add column if not exists family_time_zone text;
alter table public.users add column if not exists time_zone text;

comment on column public.leads.time_zone is
  'The family''s IANA time zone (e.g. America/Denver). Null: Africa/Nairobi.';
comment on column public.trial_bookings.family_time_zone is
  'The family''s IANA time zone when the trial was booked. Null: Africa/Nairobi.';
comment on column public.users.time_zone is
  'IANA time zone from the user''s browser (set_my_time_zone). Null: Africa/Nairobi.';

-- A zone Postgres knows (an IANA name), or null.
create or replace function public.known_time_zone(p_zone text)
returns text
language sql
stable
set search_path = public, pg_catalog
as $$
  select z.name
  from pg_catalog.pg_timezone_names z
  where z.name = nullif(btrim(p_zone), '')
  limit 1;
$$;

-- "Tue 25 Nov, 6:00 PM (Nairobi)"
create or replace function public.trial_time_text(p_at timestamptz, p_zone text)
returns text
language sql
stable
set search_path = public, pg_catalog
as $$
  select to_char(
           p_at at time zone coalesce(public.known_time_zone(p_zone), 'Africa/Nairobi'),
           'Dy FMDD Mon, FMHH12:MI AM'
         )
      || ' ('
      || replace(
           regexp_replace(
             coalesce(public.known_time_zone(p_zone), 'Africa/Nairobi'), '^.*/', ''
           ),
           '_', ' '
         )
      || ')';
$$;

-- The tutor's notification line: their own time, then the family's when the
-- clocks differ. "Tue 25 Nov, 6:00 PM (Nairobi) · 8:00 AM Tue 25 Nov for the
-- family (Denver)"
create or replace function public.trial_times_for_tutor(
  p_at timestamptz,
  p_tutor_zone text,
  p_family_zone text
)
returns text
language sql
stable
set search_path = public, pg_catalog
as $$
  select public.trial_time_text(p_at, p_tutor_zone)
      || case
           when public.known_time_zone(p_family_zone) is null
             or (p_at at time zone public.known_time_zone(p_family_zone))
                = (p_at at time zone coalesce(public.known_time_zone(p_tutor_zone), 'Africa/Nairobi'))
             then ''
           else ' · ' || public.trial_time_text(p_at, p_family_zone) || ' for the family'
         end;
$$;

-- Unknown zones are dropped rather than failing the save (a website booking
-- must never fail over a time zone).
create or replace function public.leads_clean_time_zone()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.time_zone := public.known_time_zone(new.time_zone);
  return new;
end;
$$;

drop trigger if exists leads_clean_time_zone on public.leads;
create trigger leads_clean_time_zone
  before insert or update of time_zone on public.leads
  for each row execute function public.leads_clean_time_zone();

-- Every booking path (book_trial, the website mirror, the schedule) takes the
-- family's zone from the lead.
create or replace function public.trial_bookings_family_time_zone()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.family_time_zone is null and new.lead_id is not null then
    select l.time_zone into new.family_time_zone
    from public.leads l
    where l.id = new.lead_id;
  end if;
  new.family_time_zone := public.known_time_zone(new.family_time_zone);
  return new;
end;
$$;

drop trigger if exists trial_bookings_family_time_zone on public.trial_bookings;
create trigger trial_bookings_family_time_zone
  before insert or update of family_time_zone on public.trial_bookings
  for each row execute function public.trial_bookings_family_time_zone();

-- Trials booked before this migration: the family's zone is unknown, which
-- reads as Nairobi, as it always has.

-- PART 2 ── each user's own zone --------------------------------------------

-- Called by the dashboard with the browser's zone; only ever touches the
-- caller's own row, and only that column.
create or replace function public.set_my_time_zone(p_zone text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_zone text := public.known_time_zone(p_zone);
begin
  if auth.uid() is null or v_zone is null then
    return;
  end if;
  update public.users
  set time_zone = v_zone
  where id = auth.uid() and time_zone is distinct from v_zone;
end;
$$;

revoke all on function public.set_my_time_zone(text) from public, anon;
grant execute on function public.set_my_time_zone(text) to authenticated;

-- PART 3 ── who can take a trial at a given time -----------------------------

-- Every active tutor with: the open slot they have at exactly that time (if
-- any), whether a class of theirs is within 15 minutes of it, and their zone.
-- Says nothing about the classes themselves.
create or replace function public.trial_tutor_availability(
  p_start timestamptz,
  p_minutes integer default 60
)
returns table (mentor_id uuid, slot_id uuid, busy boolean, time_zone text)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_end timestamptz :=
    p_start + make_interval(mins => greatest(15, least(coalesce(p_minutes, 60), 240)));
begin
  if not (public.classroom_is_admin() or public.is_marketer()) then
    raise exception 'Only the sales team and admins can see tutor availability.'
      using errcode = '42501';
  end if;
  if p_start is null then
    return;
  end if;

  return query
  select
    u.id,
    (
      select e.id
      from public.calendar_events e
      where e.tutor_id = u.id
        and e.title = 'Free Slot'
        and e.class_id is null
        and e.booking_status is distinct from 'cancelled'
        and e.start_time = p_start
        and not exists (
          select 1 from public.trial_bookings b
          where b.calendar_event_id = e.id
            and b.removed_at is null
            and b.status <> 'cancelled'
        )
      order by e.created_at
      limit 1
    ),
    exists (
      select 1
      from public.calendar_events e
      where e.tutor_id = u.id
        and e.title <> 'Free Slot'
        and e.booking_status is distinct from 'cancelled'
        and e.start_time < v_end + interval '15 minutes'
        and e.end_time > p_start - interval '15 minutes'
    ),
    coalesce(u.time_zone, 'Africa/Nairobi')
  from public.users u
  where u.role = 'tutor'
    and u.is_active is not false;
end;
$$;

revoke all on function public.trial_tutor_availability(timestamptz, integer) from public, anon;
grant execute on function public.trial_tutor_availability(timestamptz, integer) to authenticated;

-- PART 4 ── book a tutor at any time ------------------------------------------

-- Open slots that overlap a trial aren't free any more. Only empty ones go.
create or replace function public.trial_clear_overlapping_slots(
  p_tutor uuid,
  p_keep uuid,
  p_start timestamptz,
  p_end timestamptz
)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.calendar_events e
  where e.tutor_id = p_tutor
    and e.id <> p_keep
    and e.title = 'Free Slot'
    and e.class_id is null
    and e.start_time < p_end
    and e.end_time > p_start
    and public.calendar_event_student_reason(e.id) is null;
$$;

revoke all on function public.trial_clear_overlapping_slots(uuid, uuid, timestamptz, timestamptz)
  from public, anon, authenticated;

-- Books the parent's child with this tutor at p_start (one hour), in the
-- family's time zone p_time_zone. The tutor's open slot at that time is used
-- when there is one; otherwise the hour is added to their calendar, unless a
-- class of theirs is within 15 minutes of it. The rest is book_trial(): the
-- booking, the lead, the WhatsApp messages, the tutor's notification and
-- (through its trigger) the trial's classroom.
create or replace function public.book_trial_at(
  p_lead_id uuid,
  p_mentor_id uuid,
  p_start timestamptz,
  p_time_zone text,
  p_category text,
  p_student_name text,
  p_student_grade text,
  p_notes text default null
)
returns public.trial_bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tutor public.users;
  v_zone text := public.known_time_zone(p_time_zone);
  v_slot uuid;
  v_end timestamptz := p_start + interval '1 hour';
begin
  if not (public.classroom_is_admin() or public.is_marketer()) then
    raise exception 'Only the sales team and admins can book trials.'
      using errcode = '42501';
  end if;
  if p_start is null or p_start <= now() then
    raise exception 'That time has already passed. Pick a later time.';
  end if;
  if p_start > now() + interval '180 days' then
    raise exception 'Trials can be booked up to six months ahead.';
  end if;

  select * into v_tutor
  from public.users
  where id = p_mentor_id and role = 'tutor' and is_active is not false;
  if not found then
    raise exception 'That tutor isn''t taking trials. Pick another tutor.';
  end if;

  -- One booking at a time per tutor, so two reps can't fill the same hour.
  perform pg_advisory_xact_lock(hashtext(p_mentor_id::text));

  select e.id into v_slot
  from public.calendar_events e
  where e.tutor_id = p_mentor_id
    and e.title = 'Free Slot'
    and e.class_id is null
    and e.booking_status is distinct from 'cancelled'
    and e.start_time = p_start
    and not exists (
      select 1 from public.trial_bookings b
      where b.calendar_event_id = e.id
        and b.removed_at is null
        and b.status <> 'cancelled'
    )
  order by e.created_at
  limit 1
  for update;

  if v_slot is null then
    if exists (
      select 1
      from public.calendar_events e
      where e.tutor_id = p_mentor_id
        and e.title <> 'Free Slot'
        and e.booking_status is distinct from 'cancelled'
        and e.start_time < v_end + interval '15 minutes'
        and e.end_time > p_start - interval '15 minutes'
    ) then
      raise exception '% already has a class around then. Pick another time or tutor.',
        coalesce(nullif(split_part(btrim(v_tutor.full_name), ' ', 1), ''), 'This tutor');
    end if;
    -- Added as an open slot; book_trial() turns it into the trial.
    insert into public.calendar_events (
      title, tutor_id, start_time, end_time, class_type, booking_status, session_status
    ) values (
      'Free Slot', p_mentor_id, p_start, v_end, 'trial', 'confirmed', 'scheduled'
    )
    returning id into v_slot;
  end if;

  perform public.trial_clear_overlapping_slots(p_mentor_id, v_slot, p_start, v_end);

  -- The family's zone goes on the lead first: the booking copies it from
  -- there, and book_trial() writes it into the tutor's notification.
  if v_zone is not null then
    update public.leads set time_zone = v_zone where id = p_lead_id;
  end if;

  return public.book_trial(
    p_lead_id, v_slot, p_category, p_student_name, p_student_grade, p_notes
  );
end;
$$;

revoke all on function public.book_trial_at(uuid, uuid, timestamptz, text, text, text, text, text)
  from public, anon;
grant execute on function public.book_trial_at(uuid, uuid, timestamptz, text, text, text, text, text)
  to authenticated;

-- PART 5 ── book_trial(): the tutor's notification in their own time ----------
-- Unchanged apart from the notification, which used to say Nairobi time.

create or replace function public.book_trial(
  p_lead_id uuid,
  p_slot_id uuid,
  p_category text,
  p_student_name text,
  p_student_grade text,
  p_notes text default null
)
returns public.trial_bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_marketer boolean := public.is_marketer();
  v_lead public.leads;
  v_slot public.calendar_events;
  v_meet_link text;
  v_tutor_zone text;
  v_marketer uuid;
  v_student text := nullif(btrim(p_student_name), '');
  v_notes text := nullif(btrim(p_notes), '');
  v_booking public.trial_bookings;
begin
  if not (public.classroom_is_admin() or v_is_marketer) then
    raise exception 'Only the sales team and admins can book trials.'
      using errcode = '42501';
  end if;
  if v_student is null then
    raise exception 'Add the student''s name.';
  end if;
  if not exists (select 1 from public.grade_categories where id = p_category) then
    raise exception 'Choose the student''s program.';
  end if;
  if not exists (
    select 1 from public.grade_categories where p_student_grade = any (grades)
  ) then
    raise exception 'Choose the student''s grade.';
  end if;

  select * into v_lead from public.leads where id = p_lead_id for update;
  if not found then
    raise exception 'That parent was not found.';
  end if;
  if not public.sales_can_work(v_lead.marketer_id) then
    raise exception 'Another sales rep is working with this parent.'
      using errcode = '42501';
  end if;
  if exists (
    select 1 from public.trial_bookings
    where lead_id = p_lead_id and status = 'scheduled' and removed_at is null
  ) then
    raise exception 'This parent already has a trial booked.';
  end if;

  select * into v_slot from public.calendar_events where id = p_slot_id for update;
  if not found
     or v_slot.title <> 'Free Slot'
     or v_slot.class_id is not null
     or v_slot.booking_status = 'cancelled'
     or v_slot.tutor_id is null then
    raise exception 'That session was just taken. Pick another time.';
  end if;
  if v_slot.start_time <= now() then
    raise exception 'That session has already started. Pick another time.';
  end if;
  if exists (
    select 1 from public.mentor_grade_categories where mentor_id = v_slot.tutor_id
  ) and not exists (
    select 1 from public.mentor_grade_categories
    where mentor_id = v_slot.tutor_id and category_id = p_category
  ) then
    raise exception 'This tutor doesn''t take trials for that program.';
  end if;

  select nullif(btrim(personal_meet_link), ''), time_zone
  into v_meet_link, v_tutor_zone
  from public.users where id = v_slot.tutor_id;
  v_marketer := coalesce(v_lead.marketer_id, case when v_is_marketer then auth.uid() end);

  -- The booking is saved before the lead changes, so PART 5's mirror trigger
  -- sees it and doesn't add a second one.
  insert into public.trial_bookings (
    calendar_event_id, lead_id, mentor_id, marketer_id, booked_by, category_id,
    parent_name, parent_phone, parent_email, student_name, student_grade,
    source, notes
  ) values (
    v_slot.id, v_lead.id, v_slot.tutor_id, v_marketer, auth.uid(), p_category,
    coalesce(nullif(btrim(v_lead.parent_name), ''), 'Parent'),
    coalesce(v_lead.phone, ''),
    nullif(btrim(v_lead.email), ''),
    v_student, p_student_grade,
    case
      when v_lead.lead_source in ('website', 'sales_call', 'whatsapp', 'privyr')
        then v_lead.lead_source
      when v_lead.lead_source is null then 'sales_call'
      else 'website'
    end,
    v_notes
  )
  returning * into v_booking;

  update public.calendar_events
  set title = 'Trial: ' || v_student,
      class_type = 'trial',
      booking_status = 'confirmed',
      session_status = 'scheduled',
      meet_link = coalesce(v_meet_link, meet_link),
      notes = v_notes
  where id = v_slot.id;

  update public.leads
  set student_name = v_student,
      grade = p_student_grade,
      status = 'Trial Scheduled',
      class_date = (v_slot.start_time at time zone 'Africa/Nairobi')::date,
      class_time = (v_slot.start_time at time zone 'Africa/Nairobi')::time,
      assigned_tutor_id = v_slot.tutor_id,
      last_contacted_at = now(),
      marketer_id = v_marketer
  where id = v_lead.id;

  if v_lead.student_user_id is not null then
    insert into public.event_attendance (event_id, student_id)
    values (v_slot.id, v_lead.student_user_id)
    on conflict (event_id, student_id) do nothing;
  end if;

  if btrim(v_booking.parent_phone) <> '' then
    insert into public.whatsapp_messages
      (trial_booking_id, lead_id, direction, phone, template, scheduled_for)
    values
      (v_booking.id, v_lead.id, 'outbound', v_booking.parent_phone, 'trial_confirmation', now()),
      (v_booking.id, v_lead.id, 'outbound', v_booking.parent_phone, 'trial_reminder',
       greatest(now(), v_slot.start_time - interval '2 hours'));
  end if;

  insert into public.notifications (user_id, message, read, created_at)
  values (
    v_slot.tutor_id,
    'New trial booked with you: ' || v_student || ' on '
      || public.trial_times_for_tutor(v_slot.start_time, v_tutor_zone, v_booking.family_time_zone)
      || '.',
    false,
    now()
  );

  return v_booking;
end;
$$;

-- PART 6 ── website bookings that miss every slot -----------------------------

-- The website's own trigger (leads_auto_assign_trial_slot) only books a
-- tutor's open slot at exactly the time the family picked. When none matched,
-- this gives the trial to a tutor whose calendar is clear then and for whom
-- it falls between 7 AM and 9 PM their time: the one with the fewest upcoming
-- trials. Bookings less than two hours away, and times no tutor can take,
-- stay in the admins' unassigned queue as before. It never blocks the lead.
create or replace function public.leads_assign_any_tutor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start timestamptz;
  v_end timestamptz;
  v_category text;
  v_student text;
  v_tutor record;
  v_event uuid;
begin
  if new.assigned_tutor_id is not null
     or new.class_date is null
     or new.class_time is null then
    return null;
  end if;
  v_start := (new.class_date + new.class_time) at time zone 'Africa/Nairobi';
  v_end := v_start + interval '1 hour';
  if v_start < now() + interval '2 hours' or v_start > now() + interval '180 days' then
    return null;
  end if;
  if exists (
    select 1 from public.trial_bookings
    where lead_id = new.id and removed_at is null and status = 'scheduled'
  ) then
    return null;
  end if;

  select id into v_category from public.grade_categories
  where new.grade = any (grades)
  order by sort_order
  limit 1;
  v_student := coalesce(nullif(btrim(new.student_name), ''), 'Trial student');

  begin
    for v_tutor in
      select
        u.id,
        nullif(btrim(u.personal_meet_link), '') as meet_link,
        u.time_zone
      from public.users u
      where u.role = 'tutor'
        and u.is_active is not false
        -- A tutor with no programs set takes every program.
        and (
          v_category is null
          or not exists (select 1 from public.mentor_grade_categories m where m.mentor_id = u.id)
          or exists (
            select 1 from public.mentor_grade_categories m
            where m.mentor_id = u.id and m.category_id = v_category
          )
        )
        -- Inside the tutor's day.
        and (v_start at time zone coalesce(u.time_zone, 'Africa/Nairobi'))::time >= time '07:00'
        and (v_end at time zone coalesce(u.time_zone, 'Africa/Nairobi'))::time <= time '21:00'
        and (v_start at time zone coalesce(u.time_zone, 'Africa/Nairobi'))::date
          = (v_end at time zone coalesce(u.time_zone, 'Africa/Nairobi'))::date
      order by (
        select count(*) from public.trial_bookings b
        join public.calendar_events e on e.id = b.calendar_event_id
        where b.mentor_id = u.id
          and b.status = 'scheduled'
          and b.removed_at is null
          and e.start_time > now()
      ), random()
    loop
      perform pg_advisory_xact_lock(hashtext(v_tutor.id::text));
      continue when exists (
        select 1
        from public.calendar_events e
        where e.tutor_id = v_tutor.id
          and e.title <> 'Free Slot'
          and e.booking_status is distinct from 'cancelled'
          and e.start_time < v_end + interval '15 minutes'
          and e.end_time > v_start - interval '15 minutes'
      );

      insert into public.calendar_events (
        title, tutor_id, start_time, end_time, class_type, booking_status,
        session_status, meet_link
      ) values (
        'Trial: ' || v_student, v_tutor.id, v_start, v_end, 'trial', 'confirmed',
        'scheduled', v_tutor.meet_link
      )
      returning id into v_event;

      perform public.trial_clear_overlapping_slots(v_tutor.id, v_event, v_start, v_end);

      if new.student_user_id is not null then
        insert into public.event_attendance (event_id, student_id)
        values (v_event, new.student_user_id)
        on conflict (event_id, student_id) do nothing;
      end if;

      -- Giving the lead its tutor runs leads_sync_trial_booking, which adds
      -- the booking for this event (and with it the classroom).
      update public.leads set assigned_tutor_id = v_tutor.id where id = new.id;

      if not exists (
        select 1 from public.trial_bookings
        where calendar_event_id = v_event and removed_at is null
      ) then
        raise exception 'the booking for event % was not added', v_event;
      end if;

      insert into public.notifications (user_id, message, read, created_at)
      values (
        v_tutor.id,
        'A trial has been added to your calendar: ' || v_student || ' on '
          || public.trial_times_for_tutor(v_start, v_tutor.time_zone, new.time_zone)
          || '.',
        false,
        now()
      );
      exit;
    end loop;
  exception when others then
    -- Everything above is undone; the trial waits in the unassigned queue.
    raise warning 'leads_assign_any_tutor(%): %', new.id, sqlerrm;
  end;

  return null;
end;
$$;

revoke all on function public.leads_assign_any_tutor() from public, anon, authenticated;

-- AFTER triggers run in name order: this one goes before
-- leads_sync_trial_booking, which then finds the lead already handled.
drop trigger if exists leads_assign_any_tutor on public.leads;
create trigger leads_assign_any_tutor
  after insert or update of class_date, class_time on public.leads
  for each row execute function public.leads_assign_any_tutor();

-- The website's slot trigger, unchanged apart from its notification, which
-- printed the time in UTC with no zone.
create or replace function public.auto_assign_trial_lead_on_booking_time()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_date date;
  v_time time;
  v_slot public.calendar_events%rowtype;
  v_name text;
begin
  if new.assigned_tutor_id is not null then return new; end if;
  v_date := nullif(to_jsonb(new)->>'class_date', '')::date;
  v_time := nullif(to_jsonb(new)->>'class_time', '')::time;
  if v_date is null or v_time is null then return new; end if;

  v_name := coalesce(
    nullif(to_jsonb(new)->>'student_name', ''),
    nullif(to_jsonb(new)->>'name', ''),
    'Trial student'
  );

  for v_slot in
    select e.*
    from public.calendar_events e
    where e.title = 'Free Slot'
      and e.booking_status <> 'cancelled'
      and e.session_status = 'scheduled'
      and e.start_time > now()
      and (e.start_time at time zone 'Africa/Nairobi')::date = v_date
      and (e.start_time at time zone 'Africa/Nairobi')::time = v_time
    order by e.start_time
    for update skip locked
  loop
    perform pg_advisory_xact_lock(hashtext(v_slot.tutor_id::text));
    if exists (
      select 1 from public.calendar_events e
      where e.tutor_id = v_slot.tutor_id
        and e.id <> v_slot.id
        and e.booking_status <> 'cancelled'
        and e.start_time < v_slot.end_time + interval '15 minutes'
        and e.end_time > v_slot.start_time - interval '15 minutes'
    ) then
      continue;
    end if;

    update public.calendar_events
    set title = 'Trial: ' || v_name,
        class_type = 'trial',
        booking_status = 'confirmed',
        session_status = 'scheduled',
        meet_link = coalesce(nullif(to_jsonb(new)->>'personal_meet_link', ''), meet_link)
    where id = v_slot.id and title = 'Free Slot';

    if not found then continue; end if;
    new.assigned_tutor_id := v_slot.tutor_id;

    if nullif(to_jsonb(new)->>'student_user_id', '') is not null then
      insert into public.event_attendance (event_id, student_id)
      values (v_slot.id, (to_jsonb(new)->>'student_user_id')::uuid)
      on conflict (event_id, student_id) do nothing;
    end if;

    insert into public.notifications (user_id, message, read, created_at)
    values (
      v_slot.tutor_id,
      'A trial has been assigned to your calendar: ' || v_name || ' on '
        || public.trial_times_for_tutor(
             v_slot.start_time,
             (select u.time_zone from public.users u where u.id = v_slot.tutor_id),
             new.time_zone
           )
        || '.',
      false,
      now()
    );
    exit;
  end loop;

  return new;
end;
$$;

-- PART 7 ── the trial's classroom shows the student's own time ---------------

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
      coalesce(v_booking.family_time_zone, 'Africa/Nairobi'),
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
