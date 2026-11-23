create function public.dashboard_actor_active()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.users where id = auth.uid() and is_active is distinct from false)
$$;
create or replace function public.classroom_is_admin()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.users where id = auth.uid()
    and role in ('owner', 'operations_admin', 'tech_admin') and is_active is distinct from false)
$$;
create or replace function public.classroom_is_staff()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.users where id = auth.uid()
    and role in ('owner', 'operations_admin', 'tech_admin', 'tutor') and is_active is distinct from false)
$$;
create or replace function public.is_marketer()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.users where id = auth.uid()
    and role = 'marketer' and is_active is distinct from false)
$$;
revoke all on function public.dashboard_actor_active() from public, anon;
grant execute on function public.dashboard_actor_active() to authenticated;
-- Restrictive policies also apply when a legacy permissive policy matches.
do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'users', 'calendar_events', 'event_attendance', 'class_booking_requests', 'class_resources',
    'classroom_sessions', 'classroom_session_students', 'class_recordings', 'leads',
    'trial_bookings', 'sales', 'sales_targets', 'whatsapp_messages', 'student_results',
    'student_assignments', 'student_enrollments', 'student_lesson_progress', 'student_quiz_attempts'
  ] loop
    if to_regclass(format('public.%I', v_table)) is not null then
      execute format('create policy dashboard_active_actor on public.%I as restrictive for all to authenticated using (public.dashboard_actor_active()) with check (public.dashboard_actor_active())', v_table);
    end if;
  end loop;
end;
$$;
create function public.guard_dashboard_account_status()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.role() = 'authenticated' and
     (new.role is distinct from old.role or new.is_active is distinct from old.is_active) and
     (not public.classroom_is_admin() or
       ((new.role = 'owner' or old.role = 'owner') and not exists
         (select 1 from public.users where id = auth.uid() and role = 'owner'))) then
    raise exception 'You cannot change this account’s access.' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_dashboard_account_status() from public, anon, authenticated;
create trigger guard_dashboard_account_status before update on public.users
  for each row execute function public.guard_dashboard_account_status();
-- Staff keep the existing quiz editor and tutor review reads. Students get
-- only the question projection through the RPC below.
alter table public.quiz_questions enable row level security;
revoke all on public.quiz_questions from public, anon;
create policy dashboard_staff_quiz_questions_read on public.quiz_questions
  for select to authenticated using (public.classroom_is_staff());
create policy dashboard_only_staff_quiz_questions_read on public.quiz_questions as restrictive
  for select to authenticated using (public.classroom_is_staff());
create policy dashboard_admin_quiz_questions_insert on public.quiz_questions
  for insert to authenticated with check (public.classroom_is_admin());
create policy dashboard_only_admin_quiz_questions_insert on public.quiz_questions as restrictive
  for insert to authenticated with check (public.classroom_is_admin());
create policy dashboard_admin_quiz_questions_delete on public.quiz_questions
  for delete to authenticated using (public.classroom_is_admin());
create policy dashboard_only_admin_quiz_questions_delete on public.quiz_questions as restrictive
  for delete to authenticated using (public.classroom_is_admin());
create policy dashboard_only_admin_quiz_questions_update on public.quiz_questions as restrictive
  for update to authenticated using (public.classroom_is_admin()) with check (public.classroom_is_admin());
revoke insert, update, delete, truncate on public.student_quiz_attempts from public, anon, authenticated;
revoke select on public.student_quiz_attempts from public, anon;
alter table public.student_quiz_attempts enable row level security;
create function public.dashboard_student_has_course(p_course uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.role = 'student' and u.is_active is distinct from false
      and (exists (select 1 from public.student_enrollments e where e.student_id = u.id and e.course_id = p_course)
        or (u.assigned_course_id = p_course and not exists
          (select 1 from public.student_enrollments e where e.student_id = u.id and e.course_id is not null)))
  )
$$;
-- Find the next Saturday noon in the school timezone from the attempt time.
create function public.dashboard_quiz_retake_at(p_completed timestamptz)
returns timestamptz language sql immutable set search_path = public, pg_temp as $$
  with local_attempt as (select p_completed at time zone 'Africa/Nairobi' as stamp),
  candidate as (
    select stamp, date_trunc('day', stamp)
      + (((6 - extract(dow from stamp)::integer + 7) % 7) * interval '1 day') + interval '12 hours' as cutoff
    from local_attempt
  )
  select (case when stamp >= cutoff then cutoff + interval '7 days' else cutoff end)
    at time zone 'Africa/Nairobi' from candidate
$$;
create function public.dashboard_quiz_result(p_quiz uuid)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'score', a.score, 'passed', a.passed,
    'attemptsCount', (select count(*) from public.student_quiz_attempts
      where student_id = auth.uid() and quiz_id = p_quiz),
    'nextRetakeAt', case when a.passed then null
      else public.dashboard_quiz_retake_at(a.completed_at) end
  )
  from public.student_quiz_attempts a
  where a.quiz_id = p_quiz and a.student_id = auth.uid()
  order by a.completed_at desc nulls last, a.id desc limit 1
$$;
create function public.dashboard_lesson_quiz(p_lesson uuid)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_quiz public.quizzes;
begin
  if not exists (
    select 1 from public.course_lessons l join public.course_phases p on p.id = l.phase_id
    where l.id = p_lesson and public.dashboard_student_has_course(p.course_id)
  ) then
    raise exception 'This lesson is unavailable.' using errcode = '42501';
  end if;
  select * into v_quiz from public.quizzes where lesson_id = p_lesson;
  if not found then return jsonb_build_object('quiz', null, 'result', null); end if;
  return jsonb_build_object(
    'quiz', jsonb_build_object('id', v_quiz.id, 'passing_score', v_quiz.passing_score,
      'quiz_questions', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', q.id, 'question_text', q.question_text, 'options', q.options
      ) order by q.position nulls last, q.id), '[]'::jsonb)
      from public.quiz_questions q where q.quiz_id = v_quiz.id)),
    'result', public.dashboard_quiz_result(v_quiz.id)
  );
end;
$$;
create function public.submit_dashboard_quiz(p_quiz uuid, p_answers jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_quiz public.quizzes;
  v_latest jsonb;
  v_total integer;
  v_correct integer;
  v_score integer;
begin
  if jsonb_typeof(p_answers) is distinct from 'object' or octet_length(p_answers::text) > 32768 then
    raise exception 'Invalid answer choices.' using errcode = '22023';
  end if;
  select q.* into v_quiz from public.quizzes q
    join public.course_lessons l on l.id = q.lesson_id
    join public.course_phases p on p.id = l.phase_id
    where q.id = p_quiz and public.dashboard_student_has_course(p.course_id)
    for share of q;
  if not found then raise exception 'This quiz is unavailable.' using errcode = '42501'; end if;

  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':' || p_quiz::text, 82134));
  v_latest := public.dashboard_quiz_result(p_quiz);
  if (v_latest->>'passed')::boolean is true then return v_latest; end if;
  if (v_latest->>'nextRetakeAt')::timestamptz > clock_timestamp() then
    raise exception 'The retake window has not opened yet.' using errcode = '22023';
  end if;

  if exists (
    select 1 from jsonb_each(p_answers) a
    left join public.quiz_questions q on q.id::text = a.key and q.quiz_id = p_quiz
    where q.id is null or jsonb_typeof(q.options) is distinct from 'array'
      or case when a.value::text ~ '^\d{1,5}$' and jsonb_typeof(q.options) = 'array'
        then a.value::text::integer >= jsonb_array_length(q.options)
        else true end
  ) then
    raise exception 'One or more answer choices are invalid.' using errcode = '22023';
  end if;
  select count(*), count(*) filter (where p_answers->(q.id::text) = to_jsonb(q.correct_option_index))
  into v_total, v_correct from public.quiz_questions q where q.quiz_id = p_quiz;
  if v_total = 0 then raise exception 'This quiz has no published questions.' using errcode = '22023'; end if;
  v_score := round(v_correct * 100.0 / v_total);
  insert into public.student_quiz_attempts (quiz_id, student_id, score, passed, completed_at)
    values (p_quiz, auth.uid(), v_score, v_score >= coalesce(v_quiz.passing_score, 70), clock_timestamp());
  return public.dashboard_quiz_result(p_quiz);
end;
$$;
revoke all on function public.dashboard_student_has_course(uuid), public.dashboard_quiz_retake_at(timestamptz),
  public.dashboard_quiz_result(uuid), public.dashboard_lesson_quiz(uuid), public.submit_dashboard_quiz(uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.dashboard_lesson_quiz(uuid), public.submit_dashboard_quiz(uuid, jsonb) to authenticated;
create function public.dashboard_student_can_complete_lesson(p_lesson uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.course_lessons l join public.course_phases p on p.id = l.phase_id
    where l.id = p_lesson and public.dashboard_student_has_course(p.course_id)
  ) and not exists (
    select 1 from public.quizzes q where q.lesson_id = p_lesson
      and exists (select 1 from public.quiz_questions where quiz_id = q.id)
      and not exists (select 1 from public.student_quiz_attempts where quiz_id = q.id
        and student_id = auth.uid() and passed)
  ) and not exists (
    select 1 from public.student_assignments a
    where a.lesson_id = p_lesson and a.student_id = auth.uid()
      and a.status is distinct from 'submitted' and a.status is distinct from 'completed'
  )
$$;
revoke all on function public.dashboard_student_can_complete_lesson(uuid) from public, anon;
grant execute on function public.dashboard_student_can_complete_lesson(uuid) to authenticated;
create policy dashboard_lesson_completion_insert on public.student_lesson_progress as restrictive
  for insert to authenticated with check (public.classroom_is_staff() or
    (student_id = auth.uid() and (status is distinct from 'completed' or public.dashboard_student_can_complete_lesson(lesson_id))));
create policy dashboard_lesson_completion_update on public.student_lesson_progress as restrictive
  for update to authenticated using (public.classroom_is_staff() or student_id = auth.uid())
  with check (public.classroom_is_staff() or
    (student_id = auth.uid() and (status is distinct from 'completed' or public.dashboard_student_can_complete_lesson(lesson_id))));
