-- =============================================================================
-- Sales & trials: what the Sales & Marketing team (role `marketer`) works on.
--
--   leads              parents to reach out to (existing table; + marketer_id, notes)
--   trial_bookings     one row per booked trial; the slot stays in calendar_events
--   sales              a family enrolled after a trial
--   sales_targets      each rep's monthly target
--   whatsapp_messages  confirmations / reminders to send (by hand until the
--                      WhatsApp Business API is connected)
--   grade_categories + mentor_grade_categories   which programs a tutor takes
--
-- Every change to bookings, sales and a rep's leads goes through the
-- SECURITY DEFINER functions in PART 4, which check who is calling. Clients
-- only read these tables (RLS in PART 3).
--
-- Trials booked outside the sales dashboard (the public booking page's
-- auto-assign trigger, or an admin assigning a trial on the schedule) are
-- mirrored into trial_bookings by PART 5, so the team sees every trial.
--
-- Also fixes two account problems (PART 1):
--   * handle_new_user() took the role from user-supplied signup metadata, so
--     anyone could sign up as 'owner'. Roles now come from app_metadata, which
--     only the server can set (see server/routes/adminUsers.ts).
--   * Every signed-in user (students included) could read every lead, and
--     admins had no UPDATE policy on leads, so edits on the Leads page and
--     trial assignment on the schedule were silently ignored.
--
-- Front end: src/features/sales/SupabaseSalesDataProvider.tsx.
-- =============================================================================


-- PART 1 ── accounts ----------------------------------------------------------

-- A new account's role: app_metadata.role (server-only), else 'student' when a
-- self-signup asked for it, else 'non_user'. Unknown values become 'non_user'
-- instead of failing the signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_requested text := coalesce(
    nullif(new.raw_app_meta_data->>'role', ''),
    case when new.raw_user_meta_data->>'role' = 'student' then 'student' end
  );
  v_role public.user_role := 'non_user';
begin
  if v_requested = any (enum_range(null::public.user_role)::text[]) then
    v_role := v_requested::public.user_role;
  end if;

  insert into public.users (id, full_name, email, role, personal_meet_link)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      'User'
    ),
    new.email,
    v_role,
    new.raw_user_meta_data->>'personal_meet_link'
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        role = excluded.role;

  return new;
end;
$$;


-- PART 2 ── tables -------------------------------------------------------------

-- The rep working this parent; null until someone picks them up (e.g. a lead
-- from the website form).
alter table public.leads
  add column if not exists marketer_id uuid references public.users(id) on delete set null,
  add column if not exists notes text;

create index if not exists leads_marketer_idx
  on public.leads (marketer_id, created_at desc);
-- Duplicate checks compare phone numbers by their digits.
create index if not exists leads_phone_digits_idx
  on public.leads ((regexp_replace(coalesce(phone, ''), '\D', '', 'g')));

-- The three programs (front end: src/features/sales/gradeCategories.ts).
create table if not exists public.grade_categories (
  id text primary key,
  label text not null,
  grades text[] not null,
  sort_order integer not null default 0
);

insert into public.grade_categories (id, label, grades, sort_order) values
  ('junior-coders', 'Junior Coders', array['K','1','2','3'], 1),
  ('future-developers', 'Future Developers', array['4','5','6','7'], 2),
  ('tech-professionals', 'Tech Professionals', array['8','9','10','11','12'], 3)
on conflict (id) do update
  set label = excluded.label, grades = excluded.grades, sort_order = excluded.sort_order;

-- The programs a tutor takes trials for. A tutor with no rows takes every
-- program, so trials can be booked before an admin sets these.
create table if not exists public.mentor_grade_categories (
  mentor_id uuid not null references public.users(id) on delete cascade,
  category_id text not null references public.grade_categories(id) on delete cascade,
  primary key (mentor_id, category_id)
);

create table if not exists public.trial_bookings (
  id uuid primary key default gen_random_uuid(),
  -- The tutor's slot, now a class_type = 'trial' event. One live booking per
  -- slot (trial_bookings_live_slot); removed and cancelled ones keep the id.
  calendar_event_id uuid not null
    references public.calendar_events(id) on delete restrict,
  lead_id uuid references public.leads(id) on delete set null,
  mentor_id uuid not null references public.users(id),
  -- The rep credited with it; null for a website booking nobody picked up.
  marketer_id uuid references public.users(id) on delete set null,
  -- Who pressed "book" (a rep or an admin); null when it came from the website.
  booked_by uuid references public.users(id) on delete set null,
  category_id text not null references public.grade_categories(id),
  parent_name text not null,
  parent_phone text not null,
  parent_email text,
  student_name text not null,
  student_grade text not null,
  source text not null
    check (source in ('website', 'sales_call', 'whatsapp', 'privyr')),
  status text not null default 'scheduled'
    check (status in ('scheduled', 'attended', 'no_show', 'converted', 'lost', 'cancelled')),
  notes text,
  -- Soft delete for bookings made in error; see remove_trial_booking().
  removed_at timestamptz,
  removed_by uuid references public.users(id) on delete set null,
  removal_reason text
    check (removal_reason in ('mistake', 'duplicate', 'wrong_details', 'other')),
  removal_note text,
  -- Set when the booking is copied to Privyr, so it's never copied twice.
  privyr_lead_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists trial_bookings_live_slot
  on public.trial_bookings (calendar_event_id)
  where removed_at is null and status <> 'cancelled';
create index if not exists trial_bookings_marketer_idx
  on public.trial_bookings (marketer_id, created_at desc);
create index if not exists trial_bookings_mentor_idx
  on public.trial_bookings (mentor_id);
create index if not exists trial_bookings_lead_idx
  on public.trial_bookings (lead_id);

-- A family that paid for a plan after a trial.
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  trial_booking_id uuid unique references public.trial_bookings(id) on delete set null,
  -- The rep credited; null for a sale nobody on the team closed.
  marketer_id uuid references public.users(id) on delete set null,
  recorded_by uuid references public.users(id) on delete set null,
  student_name text not null,
  plan text not null,
  amount_kes integer not null check (amount_kes >= 0),
  closed_at timestamptz not null default now()
);

create index if not exists sales_marketer_closed_idx
  on public.sales (marketer_id, closed_at desc);

create table if not exists public.sales_targets (
  marketer_id uuid not null references public.users(id) on delete cascade,
  -- First day of the month.
  month date not null check (extract(day from month) = 1),
  target_sales integer not null check (target_sales > 0),
  primary key (marketer_id, month)
);

-- Messages to parents. 'queued' ones are due at scheduled_for; a rep sends
-- them from WhatsApp and marks them sent (mark_whatsapp_sent). Once the
-- WhatsApp Business API is connected, the server sends them instead. An empty
-- body means "the template's text" (src/features/sales/whatsapp.ts).
create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  trial_booking_id uuid references public.trial_bookings(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  direction text not null check (direction in ('outbound', 'inbound')),
  phone text not null,
  template text check (template in ('trial_confirmation', 'trial_reminder', 'trial_follow_up')),
  body text not null default '',
  status text not null default 'queued'
    -- 'cancelled': was queued, but its booking was removed or cancelled.
    check (status in ('queued', 'sent', 'delivered', 'read', 'failed', 'received', 'cancelled')),
  provider_message_id text unique,
  error text,
  scheduled_for timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_messages_queue_idx
  on public.whatsapp_messages (scheduled_for) where status = 'queued';
create index if not exists whatsapp_messages_booking_idx
  on public.whatsapp_messages (trial_booking_id);


-- PART 3 ── access -------------------------------------------------------------

create or replace function public.is_marketer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'marketer'
  );
$$;

revoke all on function public.is_marketer() from public, anon;
grant execute on function public.is_marketer() to authenticated;

alter table public.grade_categories enable row level security;
alter table public.mentor_grade_categories enable row level security;
alter table public.trial_bookings enable row level security;
alter table public.sales enable row level security;
alter table public.sales_targets enable row level security;
alter table public.whatsapp_messages enable row level security;

drop policy if exists "grade categories: staff read" on public.grade_categories;
create policy "grade categories: staff read"
  on public.grade_categories for select to authenticated using (true);

drop policy if exists "mentor programs: staff read" on public.mentor_grade_categories;
create policy "mentor programs: staff read"
  on public.mentor_grade_categories for select to authenticated using (true);
drop policy if exists "mentor programs: admins manage" on public.mentor_grade_categories;
create policy "mentor programs: admins manage"
  on public.mentor_grade_categories for all to authenticated
  using (public.classroom_is_admin()) with check (public.classroom_is_admin());

-- The whole sales team sees every booking (so nobody double-books a family);
-- tutors see their own trials. Changes go through PART 4.
drop policy if exists "trial bookings: sales, admins and the tutor read" on public.trial_bookings;
create policy "trial bookings: sales, admins and the tutor read"
  on public.trial_bookings for select to authenticated
  using (
    public.classroom_is_admin()
    or public.is_marketer()
    or mentor_id = auth.uid()
  );

-- Team-wide, for the leaderboard and "top closer" achievement.
drop policy if exists "sales: sales team and admins read" on public.sales;
create policy "sales: sales team and admins read"
  on public.sales for select to authenticated
  using (public.classroom_is_admin() or public.is_marketer());

drop policy if exists "targets: admins and the rep read" on public.sales_targets;
create policy "targets: admins and the rep read"
  on public.sales_targets for select to authenticated
  using (public.classroom_is_admin() or marketer_id = auth.uid());
drop policy if exists "targets: admins manage" on public.sales_targets;
create policy "targets: admins manage"
  on public.sales_targets for all to authenticated
  using (public.classroom_is_admin()) with check (public.classroom_is_admin());

drop policy if exists "whatsapp: sales team and admins read" on public.whatsapp_messages;
create policy "whatsapp: sales team and admins read"
  on public.whatsapp_messages for select to authenticated
  using (public.classroom_is_admin() or public.is_marketer());

-- Leads hold parents' phone numbers: only admins, the rep working the parent
-- (or any rep, while nobody has picked them up) and the assigned tutor read
-- them. The public booking page keeps inserting through "Public can insert
-- leads".
drop policy if exists "Authenticated users can view leads" on public.leads;
drop policy if exists "leads: staff read" on public.leads;
create policy "leads: staff read"
  on public.leads for select to authenticated
  using (
    public.classroom_is_admin()
    or assigned_tutor_id = auth.uid()
    or (public.is_marketer() and (marketer_id = auth.uid() or marketer_id is null))
  );
drop policy if exists "leads: admins manage" on public.leads;
create policy "leads: admins manage"
  on public.leads for all to authenticated
  using (public.classroom_is_admin()) with check (public.classroom_is_admin());


-- PART 4 ── sales actions ------------------------------------------------------

-- True when the caller may act on a lead or booking credited to p_marketer_id:
-- admins always; reps on their own and on unassigned ones.
create or replace function public.sales_can_work(p_marketer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.classroom_is_admin()
    or (public.is_marketer()
        and (p_marketer_id is null or p_marketer_id = auth.uid()));
$$;

revoke all on function public.sales_can_work(uuid) from public, anon;
grant execute on function public.sales_can_work(uuid) to authenticated;

-- Saves a parent to reach out to. A rep's parent is theirs straight away.
create or replace function public.sales_add_lead(
  p_parent_name text,
  p_phone text,
  p_email text default null,
  p_source text default 'sales_call',
  p_notes text default null
)
returns public.leads
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := nullif(btrim(p_parent_name), '');
  v_digits text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_existing public.leads;
  v_owner text;
  v_lead public.leads;
begin
  if not (public.classroom_is_admin() or public.is_marketer()) then
    raise exception 'Only the sales team and admins can add parents.'
      using errcode = '42501';
  end if;
  if v_name is null then
    raise exception 'Add the parent''s name.';
  end if;
  if length(v_digits) < 9 then
    raise exception 'Add the parent''s full phone number.';
  end if;
  if p_source not in ('website', 'sales_call', 'whatsapp', 'privyr') then
    raise exception 'Choose where the parent came from.';
  end if;

  select * into v_existing from public.leads
  where regexp_replace(coalesce(phone, ''), '\D', '', 'g') = v_digits
  order by created_at desc
  limit 1;
  if found then
    select full_name into v_owner from public.users where id = v_existing.marketer_id;
    raise exception '% already has this number%. Find them in the parents list instead.',
      coalesce(nullif(btrim(v_existing.parent_name), ''), 'Another parent'),
      case
        when v_existing.marketer_id is null then ''
        when v_existing.marketer_id = auth.uid() then ' (they''re yours)'
        else ' (with ' || coalesce(v_owner, 'another rep') || ')'
      end;
  end if;

  insert into public.leads (parent_name, phone, email, lead_source, status, marketer_id, notes)
  values (
    v_name,
    '+' || v_digits,
    nullif(lower(btrim(p_email)), ''),
    p_source,
    'New',
    case when public.is_marketer() then auth.uid() end,
    nullif(btrim(p_notes), '')
  )
  returning * into v_lead;

  return v_lead;
end;
$$;

-- Records a call or message ('contacted') or that the parent isn't interested.
-- Whoever reaches out to an unassigned parent takes them on.
create or replace function public.sales_set_lead_status(p_lead_id uuid, p_status text)
returns public.leads
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead public.leads;
begin
  select * into v_lead from public.leads where id = p_lead_id for update;
  if not found then
    raise exception 'That parent was not found.';
  end if;
  if not public.sales_can_work(v_lead.marketer_id) then
    raise exception 'Another sales rep is working with this parent.'
      using errcode = '42501';
  end if;
  if p_status not in ('contacted', 'not_interested') then
    raise exception 'Unknown status: %', p_status;
  end if;
  if p_status = 'not_interested' and exists (
    select 1 from public.trial_bookings
    where lead_id = p_lead_id and status = 'scheduled' and removed_at is null
  ) then
    raise exception 'This parent has a trial booked. Cancel or remove it first.';
  end if;

  update public.leads
  set status = case p_status when 'contacted' then 'Contacted' else 'Lost' end,
      last_contacted_at = now(),
      marketer_id = coalesce(
        marketer_id,
        case when public.is_marketer() then auth.uid() end
      )
  where id = p_lead_id
  returning * into v_lead;

  return v_lead;
end;
$$;

-- Books a parent's child into a tutor's free slot, in one transaction: the
-- booking is saved, the slot becomes the tutor's trial (with their meeting
-- link), the lead gets the child's details, the WhatsApp confirmation and
-- 2-hour reminder are queued, and the tutor is notified.
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

  select nullif(btrim(personal_meet_link), '') into v_meet_link
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
      || to_char(v_slot.start_time at time zone 'Africa/Nairobi', 'Dy DD Mon, HH24:MI')
      || ' (EAT).',
    false,
    now()
  );

  return v_booking;
end;
$$;

-- Hands a trial's slot back to its tutor as a Free Slot.
create or replace function public.sales_release_slot(p_booking public.trial_bookings)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.calendar_events
  set title = 'Free Slot',
      class_type = default,
      booking_status = default,
      session_status = default,
      notes = null
  where id = p_booking.calendar_event_id;

  delete from public.event_attendance where event_id = p_booking.calendar_event_id;

  update public.whatsapp_messages
  set status = 'cancelled'
  where trial_booking_id = p_booking.id and status = 'queued';

  -- Back to "to contact" unless another trial is still booked.
  update public.leads
  set status = 'Contacted',
      class_date = null,
      class_time = null,
      assigned_tutor_id = null
  where id = p_booking.lead_id
    and not exists (
      select 1 from public.trial_bookings b
      where b.lead_id = p_booking.lead_id
        and b.id <> p_booking.id
        and b.removed_at is null
        and b.status = 'scheduled'
    );
end;
$$;

revoke all on function public.sales_release_slot(public.trial_bookings) from public, anon, authenticated;

-- Removes (soft-deletes) a booking made in error: wrong time, tutor or parent,
-- or a duplicate. The slot is free again and queued messages are stopped.
-- A parent cancelling is set_trial_status(..., 'cancelled') instead.
create or replace function public.remove_trial_booking(
  p_booking_id uuid,
  p_reason text,
  p_note text default null
)
returns public.trial_bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.trial_bookings;
begin
  select * into v_booking from public.trial_bookings where id = p_booking_id for update;
  if not found then
    raise exception 'That booking was not found.';
  end if;
  if not public.sales_can_work(v_booking.marketer_id) then
    raise exception 'You can only remove your own bookings.' using errcode = '42501';
  end if;
  if v_booking.removed_at is not null then
    raise exception 'This booking was already removed.';
  end if;
  if v_booking.status <> 'scheduled' then
    raise exception 'This trial already has an outcome. Change the outcome instead.';
  end if;
  if p_reason is null or p_reason not in ('mistake', 'duplicate', 'wrong_details', 'other') then
    raise exception 'Choose why the booking is being removed.';
  end if;
  if p_reason = 'other' and nullif(btrim(p_note), '') is null then
    raise exception 'Add a short note saying why.';
  end if;

  update public.trial_bookings
  set removed_at = now(),
      removed_by = auth.uid(),
      removal_reason = p_reason,
      removal_note = nullif(btrim(p_note), ''),
      updated_at = now()
  where id = v_booking.id
  returning * into v_booking;

  perform public.sales_release_slot(v_booking);

  insert into public.notifications (user_id, message, read, created_at)
  select v_booking.mentor_id,
         'Trial removed from your calendar: ' || v_booking.student_name || ' on '
           || to_char(e.start_time at time zone 'Africa/Nairobi', 'Dy DD Mon, HH24:MI')
           || ' (EAT). The time is free again.',
         false, now()
  from public.calendar_events e
  where e.id = v_booking.calendar_event_id and e.start_time > now();

  return v_booking;
end;
$$;

-- Puts a removed booking back, if its slot is still free and in the future and
-- the parent hasn't been booked into another trial since.
create or replace function public.restore_trial_booking(p_booking_id uuid)
returns public.trial_bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.trial_bookings;
  v_slot public.calendar_events;
  v_meet_link text;
  v_student_user uuid;
begin
  select * into v_booking from public.trial_bookings where id = p_booking_id for update;
  if not found then
    raise exception 'That booking was not found.';
  end if;
  if not public.sales_can_work(v_booking.marketer_id) then
    raise exception 'You can only restore your own bookings.' using errcode = '42501';
  end if;
  if v_booking.removed_at is null then
    raise exception 'This booking isn''t removed.';
  end if;

  select * into v_slot from public.calendar_events
  where id = v_booking.calendar_event_id
  for update;
  if not found or v_slot.title <> 'Free Slot' or v_slot.class_id is not null then
    raise exception 'Someone else has been booked into this time since.';
  end if;
  if v_slot.start_time <= now() then
    raise exception 'The trial time has passed. Book a new trial instead.';
  end if;
  if exists (
    select 1 from public.trial_bookings
    where lead_id = v_booking.lead_id
      and id <> v_booking.id
      and removed_at is null
      and status = 'scheduled'
  ) then
    raise exception 'This parent has another trial booked since.';
  end if;

  update public.trial_bookings
  set removed_at = null,
      removed_by = null,
      removal_reason = null,
      removal_note = null,
      updated_at = now()
  where id = v_booking.id
  returning * into v_booking;

  select nullif(btrim(personal_meet_link), '') into v_meet_link
  from public.users where id = v_slot.tutor_id;

  update public.calendar_events
  set title = 'Trial: ' || v_booking.student_name,
      class_type = 'trial',
      booking_status = 'confirmed',
      session_status = 'scheduled',
      meet_link = coalesce(v_meet_link, meet_link),
      notes = v_booking.notes
  where id = v_slot.id;

  update public.leads
  set status = 'Trial Scheduled',
      class_date = (v_slot.start_time at time zone 'Africa/Nairobi')::date,
      class_time = (v_slot.start_time at time zone 'Africa/Nairobi')::time,
      assigned_tutor_id = v_slot.tutor_id
  where id = v_booking.lead_id
  returning student_user_id into v_student_user;

  if v_student_user is not null then
    insert into public.event_attendance (event_id, student_id)
    values (v_slot.id, v_student_user)
    on conflict (event_id, student_id) do nothing;
  end if;

  update public.whatsapp_messages
  set status = 'queued'
  where trial_booking_id = v_booking.id and status = 'cancelled';

  insert into public.notifications (user_id, message, read, created_at)
  values (
    v_booking.mentor_id,
    'Trial back on your calendar: ' || v_booking.student_name || ' on '
      || to_char(v_slot.start_time at time zone 'Africa/Nairobi', 'Dy DD Mon, HH24:MI')
      || ' (EAT).',
    false,
    now()
  );

  return v_booking;
end;
$$;

-- What happened at a trial. 'cancelled' (the parent called it off) frees the
-- slot but still counts in the numbers; 'converted' comes from record_sale().
create or replace function public.set_trial_status(p_booking_id uuid, p_status text)
returns public.trial_bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.trial_bookings;
begin
  select * into v_booking from public.trial_bookings where id = p_booking_id for update;
  if not found or v_booking.removed_at is not null then
    raise exception 'That booking was not found.';
  end if;
  if not public.sales_can_work(v_booking.marketer_id) then
    raise exception 'Another sales rep is working with this parent.' using errcode = '42501';
  end if;
  if p_status not in ('attended', 'no_show', 'lost', 'cancelled') then
    raise exception 'Unknown trial outcome: %', p_status;
  end if;
  if v_booking.status = 'converted' then
    raise exception 'This family already enrolled.';
  end if;
  if v_booking.status = 'cancelled' then
    raise exception 'This trial was cancelled. Book a new one instead.';
  end if;
  if p_status = 'cancelled' and v_booking.status <> 'scheduled' then
    raise exception 'Only an upcoming trial can be cancelled.';
  end if;

  update public.trial_bookings
  set status = p_status,
      marketer_id = coalesce(
        marketer_id,
        case when public.is_marketer() then auth.uid() end
      ),
      updated_at = now()
  where id = v_booking.id
  returning * into v_booking;

  if p_status = 'cancelled' then
    perform public.sales_release_slot(v_booking);
  else
    update public.leads
    set status = case p_status
          when 'attended' then 'Trial Completed'
          when 'lost' then 'Lost'
          else 'Contacted'  -- no-show: rebook
        end,
        marketer_id = coalesce(marketer_id, v_booking.marketer_id)
    where id = v_booking.lead_id;

    -- The reminder is pointless once the trial has an outcome.
    update public.whatsapp_messages
    set status = 'cancelled'
    where trial_booking_id = v_booking.id
      and template = 'trial_reminder'
      and status = 'queued';
  end if;

  return v_booking;
end;
$$;

-- Records that a family enrolled after a trial. Reps are credited with their
-- own (or the unassigned) booking; an admin can credit any rep, or nobody.
create or replace function public.record_sale(
  p_booking_id uuid,
  p_plan text,
  p_amount_kes integer,
  p_marketer_id uuid default null
)
returns public.sales
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.trial_bookings;
  v_credit uuid;
  v_sale public.sales;
begin
  select * into v_booking from public.trial_bookings where id = p_booking_id for update;
  if not found or v_booking.removed_at is not null then
    raise exception 'That booking was not found.';
  end if;
  if not public.sales_can_work(v_booking.marketer_id) then
    raise exception 'Another sales rep is working with this parent.' using errcode = '42501';
  end if;
  if v_booking.status in ('converted', 'cancelled') then
    raise exception 'This trial can''t be marked enrolled.';
  end if;
  if nullif(btrim(p_plan), '') is null then
    raise exception 'Choose the plan they paid for.';
  end if;
  if p_amount_kes is null or p_amount_kes < 0 then
    raise exception 'Enter the amount they paid.';
  end if;

  if public.classroom_is_admin() then
    v_credit := coalesce(p_marketer_id, v_booking.marketer_id);
    if v_credit is not null and not exists (
      select 1 from public.users where id = v_credit and role = 'marketer'
    ) then
      raise exception 'Credit the sale to someone on the sales team.';
    end if;
  else
    v_credit := coalesce(v_booking.marketer_id, auth.uid());
  end if;

  insert into public.sales (trial_booking_id, marketer_id, recorded_by, student_name, plan, amount_kes)
  values (v_booking.id, v_credit, auth.uid(), v_booking.student_name, btrim(p_plan), p_amount_kes)
  returning * into v_sale;

  update public.trial_bookings
  set status = 'converted',
      marketer_id = coalesce(marketer_id, v_credit),
      updated_at = now()
  where id = v_booking.id;

  update public.leads
  set status = 'Converted',
      marketer_id = coalesce(marketer_id, v_credit)
  where id = v_booking.lead_id;

  update public.whatsapp_messages
  set status = 'cancelled'
  where trial_booking_id = v_booking.id
    and template = 'trial_reminder'
    and status = 'queued';

  return v_sale;
end;
$$;

-- A queued message the rep has just sent from their own WhatsApp.
create or replace function public.mark_whatsapp_sent(p_message_id uuid)
returns public.whatsapp_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_message public.whatsapp_messages;
begin
  if not (public.classroom_is_admin() or public.is_marketer()) then
    raise exception 'Only the sales team and admins can send messages.'
      using errcode = '42501';
  end if;

  update public.whatsapp_messages
  set status = 'sent',
      sent_at = now(),
      error = null
  where id = p_message_id
    and direction = 'outbound'
    and status in ('queued', 'failed')
  returning * into v_message;

  if not found then
    raise exception 'That message was already sent or stopped.';
  end if;
  return v_message;
end;
$$;

revoke all on function public.sales_add_lead(text, text, text, text, text) from public, anon;
revoke all on function public.sales_set_lead_status(uuid, text) from public, anon;
revoke all on function public.book_trial(uuid, uuid, text, text, text, text) from public, anon;
revoke all on function public.remove_trial_booking(uuid, text, text) from public, anon;
revoke all on function public.restore_trial_booking(uuid) from public, anon;
revoke all on function public.set_trial_status(uuid, text) from public, anon;
revoke all on function public.record_sale(uuid, text, integer, uuid) from public, anon;
revoke all on function public.mark_whatsapp_sent(uuid) from public, anon;

grant execute on function public.sales_add_lead(text, text, text, text, text) to authenticated;
grant execute on function public.sales_set_lead_status(uuid, text) to authenticated;
grant execute on function public.book_trial(uuid, uuid, text, text, text, text) to authenticated;
grant execute on function public.remove_trial_booking(uuid, text, text) to authenticated;
grant execute on function public.restore_trial_booking(uuid) to authenticated;
grant execute on function public.set_trial_status(uuid, text) to authenticated;
grant execute on function public.record_sale(uuid, text, integer, uuid) to authenticated;
grant execute on function public.mark_whatsapp_sent(uuid) to authenticated;


-- PART 5 ── trials booked outside the sales dashboard -------------------------

-- The public booking page's auto-assign trigger and admins assigning a trial
-- on the schedule both give a lead a tutor and a time. This adds the matching
-- trial_bookings row, so the trial shows in Sales & Trials. It never blocks
-- the lead being saved.
create or replace function public.sync_lead_trial_booking()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.calendar_events;
  v_category text;
begin
  if new.assigned_tutor_id is null
     or new.class_date is null
     or new.class_time is null then
    return new;
  end if;
  if exists (
    select 1 from public.trial_bookings
    where lead_id = new.id and removed_at is null and status = 'scheduled'
  ) then
    return new;
  end if;

  begin
    -- The tutor's trial at that time. Callers have written the time both as
    -- Nairobi local time (the booking page) and as UTC (the schedule).
    select e.* into v_event
    from public.calendar_events e
    where e.tutor_id = new.assigned_tutor_id
      and e.title like 'Trial:%'
      and e.booking_status <> 'cancelled'
      and (
        ((e.start_time at time zone 'Africa/Nairobi')::date = new.class_date
          and (e.start_time at time zone 'Africa/Nairobi')::time = new.class_time)
        or ((e.start_time at time zone 'UTC')::date = new.class_date
          and (e.start_time at time zone 'UTC')::time = new.class_time)
      )
      and not exists (
        select 1 from public.trial_bookings b
        where b.calendar_event_id = e.id
          and b.removed_at is null
          and b.status <> 'cancelled'
      )
    order by e.start_time
    limit 1;

    if not found then
      return new;
    end if;

    select id into v_category from public.grade_categories
    where new.grade = any (grades)
    order by sort_order
    limit 1;
    if v_category is null then
      select category_id into v_category from public.mentor_grade_categories
      where mentor_id = new.assigned_tutor_id
      order by category_id
      limit 1;
    end if;

    insert into public.trial_bookings (
      calendar_event_id, lead_id, mentor_id, marketer_id, category_id,
      parent_name, parent_phone, parent_email, student_name, student_grade,
      source
    ) values (
      v_event.id, new.id, new.assigned_tutor_id, new.marketer_id,
      coalesce(v_category, 'junior-coders'),
      coalesce(nullif(btrim(new.parent_name), ''), 'Parent'),
      coalesce(new.phone, ''),
      nullif(btrim(new.email), ''),
      coalesce(
        nullif(btrim(new.student_name), ''),
        nullif(btrim(regexp_replace(v_event.title, '^Trial:\s*', '')), ''),
        'Trial student'
      ),
      coalesce(nullif(btrim(new.grade), ''), ''),
      case
        when new.lead_source in ('website', 'sales_call', 'whatsapp', 'privyr')
          then new.lead_source
        else 'website'
      end
    );
  exception when others then
    raise warning 'sync_lead_trial_booking(%): %', new.id, sqlerrm;
  end;

  return new;
end;
$$;

drop trigger if exists leads_sync_trial_booking on public.leads;
create trigger leads_sync_trial_booking
  after insert or update of assigned_tutor_id, class_date, class_time
  on public.leads
  for each row execute function public.sync_lead_trial_booking();

-- Trials already assigned before this migration. Touching assigned_tutor_id
-- fires the trigger above (not the auto-assign one, which watches the date
-- and time); the bookings then take the lead's own date.
update public.leads
set assigned_tutor_id = assigned_tutor_id
where assigned_tutor_id is not null
  and class_date is not null
  and class_time is not null;

update public.trial_bookings b
set created_at = coalesce(l.created_at, b.created_at),
    updated_at = coalesce(l.created_at, b.updated_at)
from public.leads l
where b.lead_id = l.id
  and b.created_at = now();


-- PART 6 ── live updates ------------------------------------------------------

-- Two reps looking at the same shift see a slot go as soon as it's booked.
do $$
declare
  v_table text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    return;
  end if;
  foreach v_table in array array[
    'leads', 'trial_bookings', 'sales', 'sales_targets', 'whatsapp_messages',
    'calendar_events', 'mentor_grade_categories'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = v_table
    ) then
      execute format('alter publication supabase_realtime add table public.%I', v_table);
    end if;
  end loop;
end;
$$;

notify pgrst, 'reload schema';
