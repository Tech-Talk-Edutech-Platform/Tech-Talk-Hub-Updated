-- Classroom alerts reach the people who act on them.
--
-- In the classroom, the tutor can send:
--   'ac'       "Send AC alert": an academic counsellor should follow up
--              (usually the family). Goes to the sales team and the admins.
--   'support'  "Send support alert": something technical is wrong. Goes to
--              the tech admins and the admins.
--   'help'     the "Need help?" chat: a topic plus the tutor's message.
--              Goes to the admins.
-- Admins (owner, operations_admin) see everything.
--
-- Each dashboard reads its inbox through classroom_alert_inbox(), which joins
-- the class, the tutor and (for trials) the family's contact details; staff
-- who can't read those tables directly still see who to call. An alert is
-- closed with resolve_classroom_alert().
--
-- Needs 20261110120000_classroom.sql and 20261117150000_trial_classrooms.sql
-- (classroom_sessions.trial_booking_id).

-- PART 1 ── help requests ------------------------------------------------------

alter table public.classroom_alerts
  drop constraint if exists classroom_alerts_alert_type_check;
alter table public.classroom_alerts
  add constraint classroom_alerts_alert_type_check
  check (alert_type in ('ac', 'support', 'help'));

alter table public.classroom_alerts
  add column if not exists topic text,
  add column if not exists message text;

alter table public.classroom_alerts
  drop constraint if exists classroom_alerts_topic_length;
alter table public.classroom_alerts
  add constraint classroom_alerts_topic_length
  check (topic is null or char_length(topic) between 1 and 120);
alter table public.classroom_alerts
  drop constraint if exists classroom_alerts_message_length;
alter table public.classroom_alerts
  add constraint classroom_alerts_message_length
  check (message is null or char_length(message) between 1 and 2000);
-- A help request without words is no help.
alter table public.classroom_alerts
  drop constraint if exists classroom_alerts_help_message;
alter table public.classroom_alerts
  add constraint classroom_alerts_help_message
  check (alert_type <> 'help' or (message is not null and btrim(message) <> ''));

-- The sender is whoever is signed in; nobody files an alert in someone
-- else's name.
drop policy if exists "classroom alerts: teach insert" on public.classroom_alerts;
create policy "classroom alerts: teach insert" on public.classroom_alerts
  for insert to authenticated
  with check (
    public.classroom_can_teach(session_id)
    and (sent_by is null or sent_by = auth.uid())
  );


-- PART 2 ── who sees what ------------------------------------------------------

-- The alert types the signed-in user is responsible for.
create or replace function public.classroom_alert_audience()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select case (select role::text from public.users where id = auth.uid())
    when 'owner' then array['ac', 'support', 'help']
    when 'operations_admin' then array['ac', 'support', 'help']
    when 'tech_admin' then array['support']
    when 'marketer' then array['ac']
    else array[]::text[]
  end;
$$;

revoke all on function public.classroom_alert_audience() from public, anon;
grant execute on function public.classroom_alert_audience() to authenticated;

-- The sales team reads the AC alerts (the table's own policy only lets the
-- class's tutor and admins read).
drop policy if exists "classroom alerts: sales read" on public.classroom_alerts;
create policy "classroom alerts: sales read" on public.classroom_alerts
  for select to authenticated
  using (alert_type = 'ac' and public.is_marketer());


-- PART 3 ── the inbox ----------------------------------------------------------

create or replace function public.classroom_alert_inbox(
  p_include_resolved boolean default false,
  p_limit integer default 100
)
returns table (
  id uuid,
  alert_type text,
  topic text,
  message text,
  created_at timestamptz,
  resolved_at timestamptz,
  resolved_by_name text,
  sender_name text,
  sender_email text,
  session_id uuid,
  room_code text,
  session_title text,
  class_type text,
  session_status text,
  scheduled_at timestamptz,
  tutor_name text,
  tutor_email text,
  students text,
  parent_name text,
  parent_phone text,
  parent_email text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.id,
    a.alert_type,
    a.topic,
    a.message,
    a.created_at,
    a.resolved_at,
    resolver.full_name,
    sender.full_name,
    sender.email,
    s.id,
    s.room_code,
    s.title,
    s.class_type::text,
    s.status,
    s.scheduled_at,
    tutor.full_name,
    tutor.email,
    (
      select string_agg(st.display_name, ', ' order by st.display_name)
      from public.classroom_session_students st
      where st.session_id = s.id
    ),
    booking.parent_name,
    booking.parent_phone,
    booking.parent_email
  from public.classroom_alerts a
  join public.classroom_sessions s on s.id = a.session_id
  left join public.users sender on sender.id = a.sent_by
  left join public.users resolver on resolver.id = a.resolved_by
  left join public.users tutor on tutor.id = s.tutor_id
  left join public.trial_bookings booking on booking.id = s.trial_booking_id
  where a.alert_type = any (public.classroom_alert_audience())
    and (p_include_resolved or a.resolved_at is null)
  order by (a.resolved_at is not null), a.created_at desc
  limit least(greatest(coalesce(p_limit, 100), 1), 500);
$$;

revoke all on function public.classroom_alert_inbox(boolean, integer) from public, anon;
grant execute on function public.classroom_alert_inbox(boolean, integer) to authenticated;

-- Marks an alert handled (or reopens it). Only someone the alert is routed to.
create or replace function public.resolve_classroom_alert(
  p_alert_id uuid,
  p_resolved boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type text;
begin
  select alert_type into v_type
  from public.classroom_alerts
  where id = p_alert_id;

  if v_type is null then
    raise exception 'That alert was not found.' using errcode = 'P0002';
  end if;
  if not (v_type = any (public.classroom_alert_audience())) then
    raise exception 'This alert goes to another team.' using errcode = '42501';
  end if;

  update public.classroom_alerts
  set resolved_at = case when p_resolved then now() end,
      resolved_by = case when p_resolved then auth.uid() end
  where id = p_alert_id;
end;
$$;

revoke all on function public.resolve_classroom_alert(uuid, boolean) from public, anon;
grant execute on function public.resolve_classroom_alert(uuid, boolean) to authenticated;
