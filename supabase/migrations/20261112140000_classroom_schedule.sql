-- =============================================================================
-- Class times: join window and expiry.
--
-- A class with a start time (scheduled_at) opens 15 minutes before it. If
-- nobody has joined by the end (scheduled_at + duration_minutes), the link is
-- revoked. If someone did join, the call isn't cut off at the end; it stays
-- open until people leave. The API server enforces this before issuing video
-- tokens (server/services/classroomAccess.ts) and records the first join in
-- classroom_sessions.started_at.
--
-- This migration only lets the join screen and the student's invite list see
-- the times, so they can say "opens at 3:45 PM" or "expired" instead of
-- failing to connect. Both functions gain scheduled_at, duration_minutes and
-- started_at.
--
-- Apply with `npx supabase db push` (or paste into the SQL Editor), then
-- `npm run gen:types`. Safe to re-run.
-- =============================================================================

drop function if exists public.classroom_public_info(text);
create function public.classroom_public_info(p_room_code text)
returns table (
  title text,
  status text,
  scheduled_at timestamptz,
  duration_minutes integer,
  started_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select s.title, s.status, s.scheduled_at, s.duration_minutes, s.started_at
  from public.classroom_sessions s
  where s.room_code = p_room_code;
$$;

grant execute on function public.classroom_public_info(text) to anon, authenticated;

drop function if exists public.classroom_my_invites();
create function public.classroom_my_invites()
returns table (
  session_id uuid,
  room_code text,
  title text,
  status text,
  scheduled_at timestamptz,
  duration_minutes integer,
  started_at timestamptz,
  tutor_name text,
  invited_at timestamptz,
  attended boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.id,
    s.room_code,
    s.title,
    s.status,
    s.scheduled_at,
    s.duration_minutes,
    s.started_at,
    t.full_name,
    r.created_at,
    r.attended
  from public.classroom_session_students r
  join public.classroom_sessions s on s.id = r.session_id
  left join public.users t on t.id = s.tutor_id
  where r.student_id = auth.uid()
  order by coalesce(s.scheduled_at, r.created_at) desc
  limit 100;
$$;

revoke execute on function public.classroom_my_invites() from public, anon;
grant execute on function public.classroom_my_invites() to authenticated;
