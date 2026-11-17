-- =============================================================================
-- Tutor training, run from the database so admins can edit it.
--
--   tutor_training_modules   the course's modules, in order
--   tutor_training_lessons   each module's lessons, in order
--   tutor_training_progress  which lessons each tutor has finished
--
-- Admins write the content (Dashboard -> Tutor Training); tutors and admins
-- read it. Tutors tick off their own lessons; admins see everyone's progress.
-- Unpublished modules are hidden from tutors while an admin works on them.
--
-- The seed is the syllabus that was in src/data/tutorTraining.ts, with the
-- same lesson ids, so progress tutors saved in their browser carries over
-- (the tutor's page copies it into tutor_training_progress on first visit).
-- This replaces supabase/drafts/tutor_training_progress.sql.
--
-- Safe to re-run.
-- =============================================================================

create table if not exists public.tutor_training_modules (
  id text primary key default gen_random_uuid()::text,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  description text not null default '',
  -- Every tutor finishes these before teaching on their own.
  required boolean not null default true,
  is_published boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tutor_training_lessons (
  id text primary key default gen_random_uuid()::text,
  module_id text not null
    references public.tutor_training_modules (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  minutes integer not null default 10 check (minutes between 1 and 600),
  summary text not null default '',
  -- The lesson's key points, one bullet each.
  points text[] not null default '{}',
  -- [{ "label": "Child safety policy", "href": "/child-safety" }, ...]
  links jsonb not null default '[]'::jsonb
    check (jsonb_typeof(links) = 'array'),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tutor_training_lessons_module_idx
  on public.tutor_training_lessons (module_id, position);

create table if not exists public.tutor_training_progress (
  tutor_id uuid not null references public.users (id) on delete cascade,
  lesson_id text not null
    references public.tutor_training_lessons (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (tutor_id, lesson_id)
);

drop trigger if exists tutor_training_modules_touch on public.tutor_training_modules;
create trigger tutor_training_modules_touch
  before update on public.tutor_training_modules
  for each row execute function public.classroom_touch_updated_at();
drop trigger if exists tutor_training_lessons_touch on public.tutor_training_lessons;
create trigger tutor_training_lessons_touch
  before update on public.tutor_training_lessons
  for each row execute function public.classroom_touch_updated_at();

alter table public.tutor_training_modules enable row level security;
alter table public.tutor_training_lessons enable row level security;
alter table public.tutor_training_progress enable row level security;

drop policy if exists "training modules: staff read" on public.tutor_training_modules;
create policy "training modules: staff read" on public.tutor_training_modules
  for select to authenticated
  using (public.classroom_is_admin() or (is_published and public.classroom_is_staff()));
drop policy if exists "training modules: admins write" on public.tutor_training_modules;
create policy "training modules: admins write" on public.tutor_training_modules
  for all to authenticated
  using (public.classroom_is_admin()) with check (public.classroom_is_admin());

drop policy if exists "training lessons: staff read" on public.tutor_training_lessons;
create policy "training lessons: staff read" on public.tutor_training_lessons
  for select to authenticated
  using (
    public.classroom_is_admin()
    or (
      public.classroom_is_staff()
      and exists (
        select 1 from public.tutor_training_modules m
        where m.id = module_id and m.is_published
      )
    )
  );
drop policy if exists "training lessons: admins write" on public.tutor_training_lessons;
create policy "training lessons: admins write" on public.tutor_training_lessons
  for all to authenticated
  using (public.classroom_is_admin()) with check (public.classroom_is_admin());

drop policy if exists "training progress: own, admins read" on public.tutor_training_progress;
create policy "training progress: own, admins read" on public.tutor_training_progress
  for select to authenticated
  using (tutor_id = auth.uid() or public.classroom_is_admin());
drop policy if exists "training progress: tutors tick their own" on public.tutor_training_progress;
create policy "training progress: tutors tick their own" on public.tutor_training_progress
  for insert to authenticated
  with check (tutor_id = auth.uid());
drop policy if exists "training progress: tutors untick their own" on public.tutor_training_progress;
create policy "training progress: tutors untick their own" on public.tutor_training_progress
  for delete to authenticated
  using (tutor_id = auth.uid());

-- Seed: the starter syllabus.
insert into public.tutor_training_modules (id, title, description, required, position) values
  ('welcome', 'Welcome to Tech Talk Hub', 'How we teach, who we teach and what parents expect.', true, 1),
  ('trial-classes', 'Running a great trial class', 'A trial is the family’s first impression. It decides whether they enrol.', true, 2),
  ('classroom', 'Using the online classroom', 'Camera, screen share, badges and recordings.', true, 3),
  ('safeguarding', 'Child safety', 'Non-negotiable rules for working with children online.', true, 4),
  ('operations', 'Schedule, homework and results', 'The admin side of teaching.', false, 5)
on conflict (id) do nothing;

insert into public.tutor_training_lessons (id, module_id, title, minutes, summary, points, links, position) values
  ('welcome-how-we-teach', 'welcome', 'How we teach', 10, 'Live, small classes where children build something real every session.',
   array['Every class ends with something the student made and can show.', 'Explain less, build more: demonstrate, then let them drive.', 'Praise effort and debugging, not only correct answers.']::text[],
   '[{"label": "Our curriculum", "href": "/curriculum"}]'::jsonb, 1),
  ('welcome-programs', 'welcome', 'The three programs', 10, 'Junior Coders (5–8), Future Developers (9–12) and Tech Professionals (13–18).',
   array['Junior Coders: block coding, stories and games; short activities.', 'Future Developers: Scratch projects into first Python programs.', 'Tech Professionals: Python, web development and AI projects.']::text[],
   '[]'::jsonb, 2),
  ('trial-before', 'trial-classes', 'Before the trial', 8, 'Check the booking and be in the room early.',
   array['Open “Trial bookings” and read the student’s grade and the notes from sales.', 'Join the meeting link 5 minutes early with camera and mic tested.', 'Have a project ready for that age group, plus a backup.']::text[],
   '[]'::jsonb, 1),
  ('trial-flow', 'trial-classes', 'The trial, minute by minute', 15, 'Introduce, warm up, build a mini project, then walk the parent through what’s next.',
   array['0–5 min: introductions; ask what they enjoy and what they’ve tried.', '5–40 min: build a small project together; let the student drive.', '40–50 min: the student shows what they made.', '50–60 min: tell the parent how full classes work and what the student would learn next.']::text[],
   '[]'::jsonb, 2),
  ('trial-after', 'trial-classes', 'After the trial', 5, 'Hand over to the sales team quickly while it’s fresh.',
   array['Mark the class completed and add a short note on level and interests.', 'Flag anything the sales team should know (schedule, siblings, concerns).', 'Never discuss fees yourself: the sales team follows up.']::text[],
   '[]'::jsonb, 3),
  ('classroom-setup', 'classroom', 'Your setup', 8, 'Look and sound clear from a quiet, well-lit space.',
   array['Use a laptop with a headset; avoid joining from a phone.', 'Turn on background blur in Settings if your space is busy.', 'Test camera and microphone in Settings before students join.']::text[],
   '[{"label": "Classroom tour", "href": "/classroom/tour"}]'::jsonb, 1),
  ('classroom-tools', 'classroom', 'Teaching tools', 10, 'Screen share, badges and alerts keep students engaged.',
   array['Share one window, not your whole screen.', 'Give badges for effort and good debugging.', 'Record classes only through the classroom’s record button.']::text[],
   '[]'::jsonb, 2),
  ('safeguarding-rules', 'safeguarding', 'Safeguarding rules', 12, 'Keep every interaction professional, visible and on-platform.',
   array['Contact students only through Tech Talk Hub channels, never privately.', 'Never share or ask for personal contact details or photos.', 'Report any concern to an admin the same day.']::text[],
   '[{"label": "Child safety policy", "href": "/child-safety"}]'::jsonb, 1),
  ('operations-schedule', 'operations', 'Keeping your schedule', 6, 'Open availability in one-hour slots; the system keeps 15-minute breaks.',
   array['Add availability in “My Schedule” at least a week ahead.', 'Accept or decline booking requests within 24 hours.', 'If you can’t make a class, tell an admin as early as possible.']::text[],
   '[]'::jsonb, 1),
  ('operations-homework', 'operations', 'Homework and results', 6, 'Short, regular feedback keeps parents confident.',
   array['Set homework that builds on the class project.', 'Review submissions within the week.', 'Upload results so parents can follow progress.']::text[],
   '[]'::jsonb, 2)
on conflict (id) do nothing;
