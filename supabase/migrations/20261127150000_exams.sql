-- Exams (brief item 4.1). Admins set exams; tutors set homework, which stays
-- in student_assignments and is not touched here.
--
-- Tables keep the old database's names and columns (exams, questions,
-- attempts, answers; question types 'mcq', 'short', 'debug') and add what the
-- admin side needs: who an exam is for, when it opens, marking and results.
--
-- Who sees what:
-- * Admins (owner, operations_admin, tech_admin) read and change everything.
-- * Students never read these tables directly. They go through the functions
--   at the bottom (my_exams, start_exam, save_exam_answer, submit_exam), so
--   the answer key and unpublished scores never reach the browser, and the
--   timer and marking of multiple-choice answers happen in the database.
-- * An exam is for a student when they're picked by name (exam_students), or
--   the exam has a course and the student takes it (assigned course or
--   enrolment). Students see it once it's published.

-- ── Tables ────────────────────────────────────────────────────────────────

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  duration_minutes integer not null,
  created_at timestamptz default now()
);

alter table public.exams
  add column if not exists description text,
  add column if not exists course_id uuid references public.courses (id) on delete set null,
  add column if not exists opens_at timestamptz,
  add column if not exists closes_at timestamptz,
  add column if not exists status text not null default 'draft',
  add column if not exists results_published boolean not null default false,
  add column if not exists created_by uuid references public.users (id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

alter table public.exams drop constraint if exists exams_status_check;
alter table public.exams add constraint exams_status_check
  check (status in ('draft', 'published', 'closed'));
alter table public.exams drop constraint if exists exams_duration_check;
alter table public.exams add constraint exams_duration_check
  check (duration_minutes between 1 and 600);
alter table public.exams drop constraint if exists exams_title_check;
alter table public.exams add constraint exams_title_check
  check (char_length(btrim(title)) between 1 and 200);
alter table public.exams drop constraint if exists exams_window_check;
alter table public.exams add constraint exams_window_check
  check (opens_at is null or closes_at is null or closes_at > opens_at);

create table if not exists public.exam_students (
  exam_id uuid not null references public.exams (id) on delete cascade,
  student_id uuid not null references public.users (id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (exam_id, student_id)
);
create index if not exists exam_students_student_idx
  on public.exam_students (student_id);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams (id) on delete cascade,
  question_text text not null,
  type text default 'mcq',
  options jsonb,
  correct_answer text,
  marks integer default 1,
  created_at timestamptz default now()
);

alter table public.questions
  add column if not exists position integer not null default 0;

-- 'debug' is a code question (the old name); 'file' is an uploaded answer.
alter table public.questions drop constraint if exists questions_type_check;
alter table public.questions add constraint questions_type_check
  check (type in ('mcq', 'short', 'debug', 'file'));
alter table public.questions drop constraint if exists questions_marks_check;
alter table public.questions add constraint questions_marks_check
  check (marks is null or marks between 0 and 100);
create index if not exists questions_exam_idx
  on public.questions (exam_id, position);

create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams (id) on delete cascade,
  student_id uuid not null references public.users (id) on delete cascade,
  start_time timestamptz not null default now(),
  end_time timestamptz,
  score numeric
);

alter table public.attempts
  add column if not exists auto_score numeric,
  add column if not exists marked_at timestamptz,
  add column if not exists marked_by uuid references public.users (id) on delete set null,
  add column if not exists feedback text;

-- One sitting per student per exam.
create unique index if not exists attempts_one_per_student
  on public.attempts (exam_id, student_id);

create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  answer text not null default ''
);

alter table public.answers
  add column if not exists file_path text,
  add column if not exists marks_awarded numeric,
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists answers_attempt_question_key
  on public.answers (attempt_id, question_id);

-- ── Row-level security: admins only ───────────────────────────────────────

alter table public.exams enable row level security;
alter table public.exam_students enable row level security;
alter table public.questions enable row level security;
alter table public.attempts enable row level security;
alter table public.answers enable row level security;

drop policy if exists "exams: admins manage" on public.exams;
create policy "exams: admins manage" on public.exams
  for all to authenticated
  using (public.classroom_is_admin()) with check (public.classroom_is_admin());

drop policy if exists "exam students: admins manage" on public.exam_students;
create policy "exam students: admins manage" on public.exam_students
  for all to authenticated
  using (public.classroom_is_admin()) with check (public.classroom_is_admin());

drop policy if exists "questions: admins manage" on public.questions;
create policy "questions: admins manage" on public.questions
  for all to authenticated
  using (public.classroom_is_admin()) with check (public.classroom_is_admin());

drop policy if exists "attempts: admins manage" on public.attempts;
create policy "attempts: admins manage" on public.attempts
  for all to authenticated
  using (public.classroom_is_admin()) with check (public.classroom_is_admin());

drop policy if exists "answers: admins manage" on public.answers;
create policy "answers: admins manage" on public.answers
  for all to authenticated
  using (public.classroom_is_admin()) with check (public.classroom_is_admin());

-- ── Helpers ───────────────────────────────────────────────────────────────

-- When an attempt must be handed in: its time runs out, or the exam closes.
create or replace function public.exam_attempt_deadline(
  p_start timestamptz,
  p_duration integer,
  p_closes timestamptz
)
returns timestamptz
language sql
immutable
as $$
  select least(
    p_start + make_interval(mins => p_duration),
    coalesce(p_closes, 'infinity'::timestamptz)
  );
$$;

-- Whether a published exam is for the signed-in student.
create or replace function public.exam_is_for_me(p_exam_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.exams e
    where e.id = p_exam_id
      and e.status in ('published', 'closed')
      and (
        exists (
          select 1 from public.exam_students s
          where s.exam_id = e.id and s.student_id = auth.uid()
        )
        or (
          e.course_id is not null
          and (
            exists (
              select 1 from public.users u
              where u.id = auth.uid() and u.assigned_course_id = e.course_id
            )
            or exists (
              select 1 from public.student_enrollments en
              where en.student_id = auth.uid() and en.course_id = e.course_id
            )
          )
        )
      )
  );
$$;

-- Marks multiple-choice answers and hands the attempt in. If the exam has
-- written, code or file questions, an admin marks those and sets the score.
create or replace function public.exam_finish_attempt(p_attempt_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auto numeric;
  v_needs_marking boolean;
begin
  update public.answers a
  set marks_awarded = case
    when a.answer = q.correct_answer then coalesce(q.marks, 1)
    else 0
  end
  from public.questions q
  where a.attempt_id = p_attempt_id
    and q.id = a.question_id
    and q.type = 'mcq';

  select coalesce(sum(a.marks_awarded), 0)
  into v_auto
  from public.answers a
  join public.questions q on q.id = a.question_id
  where a.attempt_id = p_attempt_id and q.type = 'mcq';

  select exists (
    select 1
    from public.attempts t
    join public.questions q on q.exam_id = t.exam_id
    where t.id = p_attempt_id and q.type is distinct from 'mcq'
  )
  into v_needs_marking;

  update public.attempts
  set end_time = coalesce(end_time, now()),
      auto_score = v_auto,
      score = case when v_needs_marking then score else v_auto end,
      marked_at = case when v_needs_marking then marked_at else now() end
  where id = p_attempt_id;
end;
$$;

-- ── Student functions ─────────────────────────────────────────────────────

-- The signed-in student's exams, with their attempt. Scores and feedback
-- only once the admin publishes results. Hands in attempts whose time ran out.
create or replace function public.my_exams()
returns table (
  exam_id uuid,
  title text,
  description text,
  duration_minutes integer,
  opens_at timestamptz,
  closes_at timestamptz,
  exam_status text,
  question_count integer,
  total_marks integer,
  course_title text,
  attempt_id uuid,
  started_at timestamptz,
  submitted_at timestamptz,
  deadline timestamptz,
  results_published boolean,
  score numeric,
  feedback text,
  marked boolean
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  if auth.uid() is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;

  perform public.exam_finish_attempt(t.id)
  from public.attempts t
  join public.exams e on e.id = t.exam_id
  where t.student_id = auth.uid()
    and t.end_time is null
    and public.exam_attempt_deadline(t.start_time, e.duration_minutes, e.closes_at)
      < now() - interval '1 minute';

  return query
  select
    e.id,
    e.title,
    e.description,
    e.duration_minutes,
    e.opens_at,
    e.closes_at,
    e.status,
    (select count(*)::integer from public.questions q where q.exam_id = e.id),
    (select coalesce(sum(coalesce(q.marks, 1)), 0)::integer
       from public.questions q where q.exam_id = e.id),
    c.title,
    t.id,
    t.start_time,
    t.end_time,
    case when t.id is null then null
      else public.exam_attempt_deadline(t.start_time, e.duration_minutes, e.closes_at)
    end,
    e.results_published,
    case when e.results_published then t.score end,
    case when e.results_published then t.feedback end,
    t.marked_at is not null
  from public.exams e
  left join public.courses c on c.id = e.course_id
  left join public.attempts t on t.exam_id = e.id and t.student_id = auth.uid()
  where public.exam_is_for_me(e.id)
  order by coalesce(e.opens_at, e.created_at) desc;
end;
$$;

-- Starts the exam (or resumes it) and returns its questions without the
-- answer key, the saved answers, the deadline and the server's clock.
create or replace function public.start_exam(p_exam_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exam public.exams;
  v_attempt public.attempts;
  v_deadline timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;

  select * into v_exam from public.exams where id = p_exam_id;
  if not found or not public.exam_is_for_me(p_exam_id) then
    raise exception 'This exam isn''t available to you.' using errcode = '42501';
  end if;

  select * into v_attempt
  from public.attempts
  where exam_id = p_exam_id and student_id = auth.uid();

  if not found then
    if v_exam.status <> 'published' then
      raise exception 'This exam is closed.' using errcode = 'P0001';
    end if;
    if v_exam.opens_at is not null and now() < v_exam.opens_at then
      raise exception 'This exam hasn''t opened yet.' using errcode = 'P0001';
    end if;
    if v_exam.closes_at is not null and now() >= v_exam.closes_at then
      raise exception 'This exam has closed.' using errcode = 'P0001';
    end if;
    if not exists (select 1 from public.questions where exam_id = p_exam_id) then
      raise exception 'This exam has no questions yet.' using errcode = 'P0001';
    end if;

    insert into public.attempts (exam_id, student_id)
    values (p_exam_id, auth.uid())
    on conflict (exam_id, student_id) do nothing;

    select * into v_attempt
    from public.attempts
    where exam_id = p_exam_id and student_id = auth.uid();
  end if;

  v_deadline := public.exam_attempt_deadline(
    v_attempt.start_time, v_exam.duration_minutes, v_exam.closes_at
  );
  if v_attempt.end_time is null and v_deadline < now() then
    perform public.exam_finish_attempt(v_attempt.id);
    select * into v_attempt from public.attempts where id = v_attempt.id;
  end if;

  return jsonb_build_object(
    'exam', jsonb_build_object(
      'id', v_exam.id,
      'title', v_exam.title,
      'description', v_exam.description,
      'duration_minutes', v_exam.duration_minutes
    ),
    'attempt', jsonb_build_object(
      'id', v_attempt.id,
      'start_time', v_attempt.start_time,
      'end_time', v_attempt.end_time,
      'deadline', v_deadline
    ),
    'server_time', now(),
    'questions', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', q.id,
          'question_text', q.question_text,
          'type', coalesce(q.type, 'mcq'),
          'options', q.options,
          'marks', coalesce(q.marks, 1)
        )
        order by q.position, q.created_at
      )
      from public.questions q
      where q.exam_id = v_exam.id
    ), '[]'::jsonb),
    'answers', coalesce((
      select jsonb_object_agg(
        a.question_id,
        jsonb_build_object('answer', a.answer, 'file_path', a.file_path)
      )
      from public.answers a
      where a.attempt_id = v_attempt.id
    ), '{}'::jsonb)
  );
end;
$$;

-- Saves one answer (text, the chosen option, or an uploaded file's path)
-- while the attempt is open. Allows 30 seconds' grace for slow networks.
create or replace function public.save_exam_answer(
  p_attempt_id uuid,
  p_question_id uuid,
  p_answer text,
  p_file_path text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.attempts;
  v_exam public.exams;
begin
  select * into v_attempt
  from public.attempts
  where id = p_attempt_id and student_id = auth.uid();
  if not found then
    raise exception 'Exam attempt not found.' using errcode = '42501';
  end if;
  if v_attempt.end_time is not null then
    raise exception 'This exam has been handed in.' using errcode = 'P0001';
  end if;

  select * into v_exam from public.exams where id = v_attempt.exam_id;
  if now() > public.exam_attempt_deadline(
    v_attempt.start_time, v_exam.duration_minutes, v_exam.closes_at
  ) + interval '30 seconds' then
    raise exception 'Time is up for this exam.' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.questions
    where id = p_question_id and exam_id = v_attempt.exam_id
  ) then
    raise exception 'That question isn''t in this exam.' using errcode = '22023';
  end if;
  if char_length(coalesce(p_answer, '')) > 20000 then
    raise exception 'That answer is too long.' using errcode = '22023';
  end if;
  if p_file_path is not null
     and p_file_path not like auth.uid()::text || '/' || v_attempt.id::text || '/%' then
    raise exception 'That file isn''t part of this exam.' using errcode = '42501';
  end if;

  insert into public.answers (attempt_id, question_id, answer, file_path, updated_at)
  values (v_attempt.id, p_question_id, coalesce(p_answer, ''), p_file_path, now())
  on conflict (attempt_id, question_id) do update
    set answer = excluded.answer,
        file_path = coalesce(excluded.file_path, public.answers.file_path),
        updated_at = now();
end;
$$;

-- Hands the exam in and marks its multiple-choice answers.
create or replace function public.submit_exam(p_attempt_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.attempts
    where id = p_attempt_id and student_id = auth.uid()
  ) then
    raise exception 'Exam attempt not found.' using errcode = '42501';
  end if;
  perform public.exam_finish_attempt(p_attempt_id);
end;
$$;

-- ── Admin marking ─────────────────────────────────────────────────────────

-- Saves an admin's marks ({ "<question id>": marks, ... }, capped at each
-- question's marks) and feedback, and sets the attempt's total score.
create or replace function public.mark_exam_attempt(
  p_attempt_id uuid,
  p_marks jsonb,
  p_feedback text default null
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_score numeric;
begin
  if not public.classroom_is_admin() then
    raise exception 'Only admins can mark exams.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.attempts where id = p_attempt_id) then
    raise exception 'Exam attempt not found.' using errcode = 'P0002';
  end if;

  insert into public.answers (attempt_id, question_id, answer, marks_awarded)
  select
    p_attempt_id,
    q.id,
    '',
    greatest(0, least(m.value::numeric, coalesce(q.marks, 1)))
  from jsonb_each_text(coalesce(p_marks, '{}'::jsonb)) m
  join public.questions q on q.id::text = m.key
  join public.attempts t on t.id = p_attempt_id and t.exam_id = q.exam_id
  where m.value ~ '^\d+(\.\d+)?$'
  on conflict (attempt_id, question_id) do update
    set marks_awarded = excluded.marks_awarded;

  select coalesce(sum(marks_awarded), 0)
  into v_score
  from public.answers
  where attempt_id = p_attempt_id;

  update public.attempts
  set score = v_score,
      feedback = nullif(btrim(coalesce(p_feedback, '')), ''),
      marked_at = now(),
      marked_by = auth.uid(),
      end_time = coalesce(end_time, now())
  where id = p_attempt_id;

  return v_score;
end;
$$;

revoke all on function public.exam_attempt_deadline(timestamptz, integer, timestamptz) from public;
revoke all on function public.exam_is_for_me(uuid) from public, anon;
revoke all on function public.exam_finish_attempt(uuid) from public, anon, authenticated;
revoke all on function public.my_exams() from public, anon;
revoke all on function public.start_exam(uuid) from public, anon;
revoke all on function public.save_exam_answer(uuid, uuid, text, text) from public, anon;
revoke all on function public.submit_exam(uuid) from public, anon;
revoke all on function public.mark_exam_attempt(uuid, jsonb, text) from public, anon;

grant execute on function public.exam_attempt_deadline(timestamptz, integer, timestamptz) to authenticated;
grant execute on function public.exam_is_for_me(uuid) to authenticated;
grant execute on function public.my_exams() to authenticated;
grant execute on function public.start_exam(uuid) to authenticated;
grant execute on function public.save_exam_answer(uuid, uuid, text, text) to authenticated;
grant execute on function public.submit_exam(uuid) to authenticated;
grant execute on function public.mark_exam_attempt(uuid, jsonb, text) to authenticated;

-- ── Uploaded answers ──────────────────────────────────────────────────────
-- Private bucket. Files live at <student id>/<attempt id>/<file>; a student
-- uploads only into their own open attempt and reads only their own files.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'exam-uploads', 'exam-uploads', false, 20971520,
  array[
    'application/pdf',
    'image/png', 'image/jpeg', 'image/webp',
    'text/plain',
    'application/zip', 'application/x-zip-compressed',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Students can't read attempts directly, so the upload rule asks this.
create or replace function public.exam_attempt_open_for_me(p_attempt_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.attempts t
    where t.id::text = p_attempt_id
      and t.student_id = auth.uid()
      and t.end_time is null
  );
$$;

revoke all on function public.exam_attempt_open_for_me(text) from public, anon;
grant execute on function public.exam_attempt_open_for_me(text) to authenticated;

drop policy if exists "exam uploads: students add to open attempt" on storage.objects;
create policy "exam uploads: students add to open attempt" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'exam-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.exam_attempt_open_for_me((storage.foldername(name))[2])
  );

drop policy if exists "exam uploads: read own or admin" on storage.objects;
create policy "exam uploads: read own or admin" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'exam-uploads'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.classroom_is_admin()
    )
  );

drop policy if exists "exam uploads: admins delete" on storage.objects;
create policy "exam uploads: admins delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'exam-uploads' and public.classroom_is_admin());
