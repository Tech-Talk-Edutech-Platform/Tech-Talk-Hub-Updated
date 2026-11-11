-- =============================================================================
-- Ended classes stay closed until an admin reopens them.
--
-- The API server refuses to let anyone join a class whose status is
-- completed, not_completed or cancelled (server/services/classroomAccess.ts).
-- Tutors may update their own sessions (to mark them live and to save the
-- end-of-class report), so without this guard a tutor could set an ended
-- class back to scheduled and reopen it. Only admins may do that.
--
-- Ending a class, and editing an ended class's report, stay allowed for its
-- tutor. Updates made without a signed-in user (SQL editor, service role) are
-- not restricted.
--
-- Apply with `npx supabase db push` (or paste into the SQL Editor). No type
-- changes. Safe to re-run.
-- =============================================================================

create or replace function public.classroom_sessions_guard_reopen()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status in ('completed', 'not_completed', 'cancelled')
    and new.status not in ('completed', 'not_completed', 'cancelled')
    and auth.uid() is not null
    and not public.classroom_is_admin()
  then
    raise exception 'Only an admin can reopen an ended class.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists classroom_sessions_guard_reopen on public.classroom_sessions;
create trigger classroom_sessions_guard_reopen
  before update of status on public.classroom_sessions
  for each row execute function public.classroom_sessions_guard_reopen();
