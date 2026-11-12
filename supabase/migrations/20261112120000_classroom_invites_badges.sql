-- =============================================================================
-- Class invites and student badges.
--
-- 1. Tutors invite students to the classes they teach. An invite is a roster
--    row (classroom_session_students) with student_id set. Until now only
--    admins could add roster rows, so a tutor's own calls had nobody to give
--    badges or projects to.
-- 2. Students list their invites with classroom_my_invites(), which includes
--    the tutor's name (students can't read other users' rows).
-- 3. users.badges: every badge a student is given in class, oldest first.
--    A trigger on classroom_badge_awards keeps it in step (Undo in class
--    removes the badge again). Students can't edit it themselves.
--
-- Apply with `npx supabase db push` (or paste into the SQL Editor), then
-- `npm run gen:types`. Safe to re-run.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tutors invite students
-- -----------------------------------------------------------------------------
drop policy if exists "classroom roster: tutor invite" on public.classroom_session_students;
create policy "classroom roster: tutor invite" on public.classroom_session_students
  for insert to authenticated
  with check (public.classroom_can_teach(session_id));

-- Withdrawing an invite deletes the roster row and, with it, any badges and
-- projects from that class, so tutors may only do it before the class starts.
drop policy if exists "classroom roster: tutor uninvite" on public.classroom_session_students;
create policy "classroom roster: tutor uninvite" on public.classroom_session_students
  for delete to authenticated
  using (
    public.classroom_can_teach(session_id)
    and exists (
      select 1 from public.classroom_sessions s
      where s.id = session_id and s.status = 'scheduled'
    )
  );

-- -----------------------------------------------------------------------------
-- 2. A student's invites
-- -----------------------------------------------------------------------------
drop function if exists public.classroom_my_invites();
create function public.classroom_my_invites()
returns table (
  session_id uuid,
  room_code text,
  title text,
  status text,
  scheduled_at timestamptz,
  duration_minutes integer,
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

-- -----------------------------------------------------------------------------
-- 3. users.badges
--    [{ "award_id", "badge_id", "slug", "name", "icon", "ornament",
--       "session_id", "class_title", "awarded_at" }, ...]
-- -----------------------------------------------------------------------------
alter table public.users
  add column if not exists badges jsonb default '[]'::jsonb;

do $$
begin
  alter table public.users
    add constraint users_badges_is_array
    check (badges is null or jsonb_typeof(badges) = 'array');
exception
  when duplicate_object then null;
end;
$$;

-- One award as it's stored on the student's profile. Names are a snapshot, so
-- the badge reads as it was given even if the catalogue changes later.
create or replace function public.classroom_badge_entry(p_award_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'award_id', a.id,
    'badge_id', b.id,
    'slug', b.slug,
    'name', b.name,
    'icon', b.icon,
    'ornament', b.ornament,
    'session_id', a.session_id,
    'class_title', s.title,
    'awarded_at', a.created_at
  )
  from public.classroom_badge_awards a
  join public.classroom_badges b on b.id = a.badge_id
  left join public.classroom_sessions s on s.id = a.session_id
  where a.id = p_award_id;
$$;

-- Only the triggers below call it.
revoke execute on function public.classroom_badge_entry(uuid) from public, anon, authenticated;

create or replace function public.classroom_sync_user_badges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('DELETE', 'UPDATE') and old.student_id is not null then
    update public.users
    set badges = coalesce(
      (
        select jsonb_agg(item)
        from jsonb_array_elements(coalesce(badges, '[]'::jsonb)) as item
        where item ->> 'award_id' is distinct from old.id::text
      ),
      '[]'::jsonb
    )
    where id = old.student_id;
  end if;

  if tg_op in ('INSERT', 'UPDATE') and new.student_id is not null then
    update public.users
    set badges = coalesce(badges, '[]'::jsonb)
      || jsonb_build_array(public.classroom_badge_entry(new.id))
    where id = new.student_id;
  end if;

  return null;
end;
$$;

drop trigger if exists classroom_badge_awards_sync_user on public.classroom_badge_awards;
create trigger classroom_badge_awards_sync_user
  after insert or delete or update of badge_id, student_id
  on public.classroom_badge_awards
  for each row execute function public.classroom_sync_user_badges();

-- Signed-in users can't write badges directly (students can update their own
-- row, e.g. their name). Admins can; the sync trigger runs as the table owner,
-- so it isn't affected.
create or replace function public.users_guard_badges()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon')
    and not public.classroom_is_admin()
  then
    if tg_op = 'INSERT' then
      new.badges := '[]'::jsonb;
    elsif new.badges is distinct from old.badges then
      raise exception 'Badges are given in class and can''t be edited here.'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists users_guard_badges on public.users;
create trigger users_guard_badges
  before insert or update of badges on public.users
  for each row execute function public.users_guard_badges();

-- Backfill from the awards already given. Recomputed from scratch, so
-- re-running the migration gives the same result.
update public.users u
set badges = given.items
from (
  select
    a.student_id,
    jsonb_agg(public.classroom_badge_entry(a.id) order by a.created_at) as items
  from public.classroom_badge_awards a
  where a.student_id is not null
  group by a.student_id
) as given
where given.student_id = u.id;
