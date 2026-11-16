-- ============================================================================
-- DRAFT · NOT APPLIED. Marketer role, trial booking, WhatsApp log, tutor training.
--
-- This folder is outside supabase/migrations on purpose, so `supabase db push`
-- ignores it. When the sales dashboard preview (/preview/sales) is signed off:
--   1. PART 1 (the role) is already its own migration:
--      supabase/migrations/20261116120000_marketer_role.sql. Move PARTS 2+
--      into the next one.
--   2. Apply, then `npm run gen:types`.
--   3. Add a Supabase-backed provider next to
--      src/features/sales/DemoSalesDataProvider.tsx and use it instead.
-- ============================================================================


-- PART 1 ── the role ---------------------------------------------------------
-- `marketer` is the sales and marketing team (front end: src/types/roles.ts).
-- Shipped as migrations/20261116120000_marketer_role.sql; kept here (it's a
-- no-op once applied) so this file still reads top to bottom.
alter type public.user_role add value if not exists 'marketer';


-- PART 2 ── tables -----------------------------------------------------------

-- Parents to reach out to are rows in the existing `leads` table: a marketer
-- adds one with the parent's name, phone and email (status 'New'), contacts
-- them ('Contacted'), and book_trial() fills in the child's name and grade
-- ('Trial Scheduled'). This column records which marketer is working the lead;
-- null means nobody has picked it up yet (e.g. a website form lead).
alter table public.leads
  add column if not exists marketer_id uuid references public.users(id) on delete set null;
create index if not exists leads_marketer_idx on public.leads (marketer_id, created_at desc);

-- Trials are booked by program; each mentor takes some programs.
create table public.grade_categories (
  id text primary key,
  label text not null,
  grades text[] not null,
  sort_order integer not null default 0
);

insert into public.grade_categories (id, label, grades, sort_order) values
  ('junior-coders', 'Junior Coders', array['K','1','2','3'], 1),
  ('future-developers', 'Future Developers', array['4','5','6','7'], 2),
  ('tech-professionals', 'Tech Professionals', array['8','9','10','11','12'], 3);

create table public.mentor_grade_categories (
  mentor_id uuid not null references public.users(id) on delete cascade,
  category_id text not null references public.grade_categories(id),
  primary key (mentor_id, category_id)
);

-- One row per booked trial. The slot itself stays in calendar_events (a tutor's
-- "Free Slot" becomes a class_type = 'trial' event), so the mentor's schedule,
-- the classroom and reminders keep working unchanged.
create table public.trial_bookings (
  id uuid primary key default gen_random_uuid(),
  -- One live booking per slot (see trial_bookings_live_slot below); removed and
  -- cancelled bookings keep their slot id for the record.
  calendar_event_id uuid not null
    references public.calendar_events(id) on delete restrict,
  lead_id uuid references public.leads(id) on delete set null,
  mentor_id uuid not null references public.users(id),
  -- Null when the parent booked on the website and no marketer has picked it up.
  marketer_id uuid references public.users(id),
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
  -- Soft delete. A booking made in error (wrong time, mentor or parent, or a
  -- duplicate) is removed rather than deleted, so it can be restored and
  -- admins can see who removed what and why. See remove_trial_booking().
  removed_at timestamptz,
  removed_by uuid references public.users(id),
  removal_reason text
    check (removal_reason in ('mistake', 'duplicate', 'wrong_details', 'other')),
  removal_note text,
  -- Set when the booking is copied to Privyr, so it's never copied twice.
  privyr_lead_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index trial_bookings_live_slot
  on public.trial_bookings (calendar_event_id)
  where removed_at is null and status <> 'cancelled';
create index trial_bookings_marketer_idx on public.trial_bookings (marketer_id, created_at desc);
create index trial_bookings_mentor_idx on public.trial_bookings (mentor_id);

-- A successful sale: the family paid for a plan after a trial.
create table public.sales (
  id uuid primary key default gen_random_uuid(),
  trial_booking_id uuid unique references public.trial_bookings(id) on delete set null,
  marketer_id uuid not null references public.users(id),
  student_user_id uuid references public.users(id) on delete set null,
  plan text not null,
  amount_kes integer not null check (amount_kes >= 0),
  closed_at timestamptz not null default now()
);

create index sales_marketer_closed_idx on public.sales (marketer_id, closed_at desc);

create table public.sales_targets (
  marketer_id uuid not null references public.users(id) on delete cascade,
  -- First day of the month.
  month date not null check (extract(day from month) = 1),
  target_sales integer not null check (target_sales > 0),
  primary key (marketer_id, month)
);

-- Every WhatsApp message to or from a parent. The server sends rows with
-- status 'queued' whose scheduled_for has passed, then records the provider's
-- delivery updates (webhook) against provider_message_id.
create table public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  trial_booking_id uuid references public.trial_bookings(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  direction text not null check (direction in ('outbound', 'inbound')),
  phone text not null,
  template text check (template in ('trial_confirmation', 'trial_reminder', 'trial_follow_up')),
  body text not null,
  status text not null default 'queued'
    -- 'cancelled': was queued, but its booking was removed before it went out.
    check (status in ('queued', 'sent', 'delivered', 'read', 'failed', 'received', 'cancelled')),
  provider_message_id text unique,
  error text,
  scheduled_for timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index whatsapp_messages_queue_idx
  on public.whatsapp_messages (scheduled_for) where status = 'queued';

-- Tutor training: one row per finished lesson (ids from src/data/tutorTraining.ts).
create table public.tutor_training_progress (
  tutor_id uuid not null references public.users(id) on delete cascade,
  lesson_id text not null,
  completed_at timestamptz not null default now(),
  primary key (tutor_id, lesson_id)
);


-- PART 3 ── access -----------------------------------------------------------

create or replace function public.is_marketer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role::text = 'marketer'
  );
$$;

grant execute on function public.is_marketer() to authenticated;

alter table public.grade_categories enable row level security;
alter table public.mentor_grade_categories enable row level security;
alter table public.trial_bookings enable row level security;
alter table public.sales enable row level security;
alter table public.sales_targets enable row level security;
alter table public.whatsapp_messages enable row level security;
alter table public.tutor_training_progress enable row level security;

create policy "grade categories are readable by staff"
  on public.grade_categories for select to authenticated using (true);

create policy "mentor categories are readable by staff"
  on public.mentor_grade_categories for select to authenticated using (true);
create policy "admins manage mentor categories"
  on public.mentor_grade_categories for all to authenticated
  using (public.classroom_is_admin()) with check (public.classroom_is_admin());

-- Marketers see the whole team's bookings (to avoid double-booking a family)
-- but only change their own; mentors see trials assigned to them.
create policy "trial bookings: admins and sales read all, mentors their own"
  on public.trial_bookings for select to authenticated
  using (
    public.classroom_is_admin()
    or public.is_marketer()
    or mentor_id = auth.uid()
  );
create policy "trial bookings: admins update any, marketers their own"
  on public.trial_bookings for update to authenticated
  using (public.classroom_is_admin() or marketer_id = auth.uid())
  with check (public.classroom_is_admin() or marketer_id = auth.uid());
-- Inserts go through book_trial() below.

create policy "sales: admins read all, marketers their own"
  on public.sales for select to authenticated
  using (public.classroom_is_admin() or marketer_id = auth.uid());
create policy "sales: marketers record their own"
  on public.sales for insert to authenticated
  with check (public.classroom_is_admin() or marketer_id = auth.uid());

create policy "targets: admins manage, marketers read their own"
  on public.sales_targets for select to authenticated
  using (public.classroom_is_admin() or marketer_id = auth.uid());
create policy "targets: admins write"
  on public.sales_targets for all to authenticated
  using (public.classroom_is_admin()) with check (public.classroom_is_admin());

create policy "whatsapp: admins and sales read"
  on public.whatsapp_messages for select to authenticated
  using (public.classroom_is_admin() or public.is_marketer());
-- Writes come from the server (service role) and book_trial().

-- Marketers work their own leads and the unassigned ones. Check the existing
-- policies on `leads` first (they aren't in supabase/migrations): if RLS is off
-- there, enable it only together with an admin policy, or the admin Leads page
-- loses access.
create policy "leads: marketers read theirs and unassigned"
  on public.leads for select to authenticated
  using (public.is_marketer() and (marketer_id = auth.uid() or marketer_id is null));
create policy "leads: marketers add their own"
  on public.leads for insert to authenticated
  with check (public.is_marketer() and marketer_id = auth.uid());
create policy "leads: marketers update theirs and pick up unassigned"
  on public.leads for update to authenticated
  using (public.is_marketer() and (marketer_id = auth.uid() or marketer_id is null))
  with check (public.is_marketer() and marketer_id = auth.uid());

create policy "training: tutors manage their own, admins read all"
  on public.tutor_training_progress for all to authenticated
  using (tutor_id = auth.uid() or public.classroom_is_admin())
  with check (tutor_id = auth.uid());


-- PART 4 ── booking ----------------------------------------------------------

-- Open trial slots for a program in the next few weeks.
create or replace function public.list_open_trial_slots(p_category text)
returns table (slot_id uuid, mentor_id uuid, mentor_name text, start_time timestamptz, end_time timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select e.id, e.tutor_id, u.full_name, e.start_time, e.end_time
  from public.calendar_events e
  join public.users u on u.id = e.tutor_id
  join public.mentor_grade_categories m
    on m.mentor_id = e.tutor_id and m.category_id = p_category
  where (public.classroom_is_admin() or public.is_marketer())
    and e.title = 'Free Slot'
    and e.class_id is null
    and e.booking_status <> 'cancelled'
    and e.start_time > now()
    and e.start_time < now() + interval '28 days'
  order by e.start_time;
$$;

grant execute on function public.list_open_trial_slots(text) to authenticated;

-- Books a slot for a parent (lead) in one transaction: the child's details go
-- on the lead, the slot becomes the mentor's trial event (with their meeting
-- link), the booking is saved, and the WhatsApp confirmation and 2-hour
-- reminder are queued.
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
  v_lead public.leads;
  v_slot public.calendar_events;
  v_meet_link text;
  v_booking public.trial_bookings;
begin
  if not (public.classroom_is_admin() or public.is_marketer()) then
    raise exception 'Only marketers and admins can book trials.';
  end if;

  select * into v_lead from public.leads where id = p_lead_id for update;
  if v_lead.id is null then
    raise exception 'That parent was not found.';
  end if;
  if public.is_marketer()
     and v_lead.marketer_id is not null and v_lead.marketer_id <> auth.uid() then
    raise exception 'Another marketer is working with this parent.';
  end if;
  if exists (
    select 1 from public.trial_bookings
    where lead_id = p_lead_id and status = 'scheduled' and removed_at is null
  ) then
    raise exception 'This parent already has a trial booked.';
  end if;

  select * into v_slot from public.calendar_events
  where id = p_slot_id
  for update;

  if v_slot.id is null or v_slot.title <> 'Free Slot' or v_slot.class_id is not null then
    raise exception 'That slot is no longer available.';
  end if;
  if v_slot.start_time <= now() then
    raise exception 'That slot has already started.';
  end if;
  if not exists (
    select 1 from public.mentor_grade_categories
    where mentor_id = v_slot.tutor_id and category_id = p_category
  ) then
    raise exception 'This mentor doesn''t take trials for that program.';
  end if;

  select personal_meet_link into v_meet_link
  from public.users where id = v_slot.tutor_id;

  update public.calendar_events
  set title = 'Trial: ' || p_student_name,
      class_type = 'trial',
      booking_status = 'confirmed',
      session_status = 'scheduled',
      meet_link = coalesce(v_meet_link, meet_link),
      notes = p_notes
  where id = v_slot.id;

  update public.leads
  set student_name = p_student_name,
      grade = p_student_grade,
      status = 'Trial Scheduled',
      class_date = (v_slot.start_time at time zone 'Africa/Nairobi')::date,
      class_time = (v_slot.start_time at time zone 'Africa/Nairobi')::time,
      assigned_tutor_id = v_slot.tutor_id,
      last_contacted_at = now(),
      marketer_id = coalesce(
        marketer_id,
        case when public.is_marketer() then auth.uid() end
      )
  where id = v_lead.id
  returning * into v_lead;

  insert into public.trial_bookings (
    calendar_event_id, lead_id, mentor_id, marketer_id, category_id,
    parent_name, parent_phone, parent_email, student_name, student_grade,
    source, notes
  ) values (
    v_slot.id, v_lead.id, v_slot.tutor_id, v_lead.marketer_id, p_category,
    coalesce(v_lead.parent_name, ''), coalesce(v_lead.phone, ''), v_lead.email,
    p_student_name, p_student_grade,
    case when v_lead.lead_source in ('website', 'sales_call', 'whatsapp', 'privyr')
      then v_lead.lead_source else 'sales_call' end,
    p_notes
  )
  returning * into v_booking;

  -- The server fills in the approved template text when it sends these.
  insert into public.whatsapp_messages
    (trial_booking_id, lead_id, direction, phone, template, body, scheduled_for)
  values
    (v_booking.id, v_lead.id, 'outbound', v_booking.parent_phone, 'trial_confirmation', '', now()),
    (v_booking.id, v_lead.id, 'outbound', v_booking.parent_phone, 'trial_reminder', '',
     greatest(now(), v_slot.start_time - interval '2 hours'));

  return v_booking;
end;
$$;

grant execute on function public.book_trial(uuid, uuid, text, text, text, text) to authenticated;


-- PART 5 ── removing a booking made in error (soft delete) ------------------

-- Takes the trial off the mentor's calendar (the event is a Free Slot again),
-- stops WhatsApp messages that haven't gone out, puts the lead back to
-- 'Contacted' and marks the booking removed. Nothing is deleted.
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
  select * into v_booking from public.trial_bookings
  where id = p_booking_id
  for update;

  if v_booking.id is null then
    raise exception 'That booking was not found.';
  end if;
  if not (
    public.classroom_is_admin()
    or (public.is_marketer()
        and (v_booking.marketer_id = auth.uid() or v_booking.marketer_id is null))
  ) then
    raise exception 'You can only remove your own bookings.';
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

  update public.calendar_events
  set title = 'Free Slot',
      class_type = null,
      booking_status = default,
      session_status = default,
      notes = null
  where id = v_booking.calendar_event_id;

  update public.whatsapp_messages
  set status = 'cancelled'
  where trial_booking_id = v_booking.id and status = 'queued';

  update public.leads
  set status = 'Contacted',
      class_date = null,
      class_time = null,
      assigned_tutor_id = null
  where id = v_booking.lead_id
    and not exists (
      select 1 from public.trial_bookings b
      where b.lead_id = v_booking.lead_id
        and b.id <> v_booking.id
        and b.removed_at is null
        and b.status = 'scheduled'
    );

  update public.trial_bookings
  set removed_at = now(),
      removed_by = auth.uid(),
      removal_reason = p_reason,
      removal_note = nullif(trim(p_note), ''),
      updated_at = now()
  where id = v_booking.id
  returning * into v_booking;

  return v_booking;
end;
$$;

grant execute on function public.remove_trial_booking(uuid, text, text) to authenticated;

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
begin
  select * into v_booking from public.trial_bookings
  where id = p_booking_id
  for update;

  if v_booking.id is null then
    raise exception 'That booking was not found.';
  end if;
  if not (
    public.classroom_is_admin()
    or (public.is_marketer()
        and (v_booking.marketer_id = auth.uid() or v_booking.marketer_id is null))
  ) then
    raise exception 'You can only restore your own bookings.';
  end if;
  if v_booking.removed_at is null then
    raise exception 'This booking isn''t removed.';
  end if;

  select * into v_slot from public.calendar_events
  where id = v_booking.calendar_event_id
  for update;

  if v_slot.id is null or v_slot.title <> 'Free Slot' or v_slot.class_id is not null then
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

  select personal_meet_link into v_meet_link
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
  where id = v_booking.lead_id;

  update public.whatsapp_messages
  set status = 'queued'
  where trial_booking_id = v_booking.id and status = 'cancelled';

  update public.trial_bookings
  set removed_at = null,
      removed_by = null,
      removal_reason = null,
      removal_note = null,
      updated_at = now()
  where id = v_booking.id
  returning * into v_booking;

  return v_booking;
end;
$$;

grant execute on function public.restore_trial_booking(uuid) to authenticated;
