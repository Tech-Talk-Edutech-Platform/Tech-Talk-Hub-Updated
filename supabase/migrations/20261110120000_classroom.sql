-- =============================================================================
-- Virtual classroom (/classroom/:roomCode) and its dashboard manager.
--
-- Apply once, either:
--   * Supabase dashboard -> SQL Editor -> paste this file -> Run, or
--   * `npx supabase link --project-ref iinwzibplknjqmofevpw` then
--     `npx supabase db push`.
-- Then regenerate types with `npm run gen:types`.
--
-- Relations (-> is a foreign key):
--   classroom_materials.course_id            -> courses.id            (optional)
--   classroom_activities.material_id         -> classroom_materials.id
--   classroom_sessions.tutor_id              -> users.id
--   classroom_sessions.material_id           -> classroom_materials.id
--   classroom_sessions.calendar_event_id     -> calendar_events.id    (optional)
--   classroom_session_students.session_id    -> classroom_sessions.id
--   classroom_session_students.student_id    -> users.id              (optional)
--   classroom_session_students.lead_id       -> leads.id              (optional)
--   classroom_badge_awards.session_id        -> classroom_sessions.id
--   classroom_badge_awards.session_student_id-> classroom_session_students.id
--   classroom_badge_awards.badge_id          -> classroom_badges.id
--   classroom_project_submissions.*          -> sessions, roster, activities
--   classroom_alerts.session_id              -> classroom_sessions.id
--   class_recordings.classroom_session_id    -> classroom_sessions.id (new column)
--
-- Safe to re-run: every statement is idempotent.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Role helpers. SECURITY DEFINER so policies can read public.users without
-- tripping that table's own RLS (and without recursion).
-- -----------------------------------------------------------------------------
create or replace function public.classroom_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid()
      and role in ('owner', 'operations_admin', 'tech_admin')
  );
$$;

create or replace function public.classroom_is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid()
      and role in ('owner', 'operations_admin', 'tech_admin', 'tutor')
  );
$$;

-- -----------------------------------------------------------------------------
-- Lesson content
-- -----------------------------------------------------------------------------
create table if not exists public.classroom_materials (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  course_id uuid references public.courses (id) on delete set null,
  outline text not null default '',
  outcomes text[] not null default '{}',
  -- [{ "minutes": 5, "step": "Welcome and introductions" }, ...]
  agenda jsonb not null default '[]'::jsonb
    check (jsonb_typeof(agenda) = 'array'),
  agenda_warning_title text not null
    default 'This agenda is for the teacher only.',
  agenda_warning_body text not null
    default 'Please do not share your screen while viewing this. Only open it in a separate window.',
  -- [{ "label": "...", "isNew": true, "note": "...",
  --    "items": [{ "text": "Launch", "href": "https://...", "underline": false }] }]
  links jsonb not null default '[]'::jsonb
    check (jsonb_typeof(links) = 'array'),
  is_active boolean not null default true,
  created_by uuid default auth.uid() references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.classroom_activities (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null
    references public.classroom_materials (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  outline text not null default '',
  project_url text check (project_url is null or project_url ~* '^https?://'),
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists classroom_activities_material_idx
  on public.classroom_activities (material_id, position);

create table if not exists public.classroom_badges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{1,64}$'),
  name text not null check (char_length(name) between 1 and 80),
  icon text not null
    check (icon in ('code', 'crown', 'bulb', 'pen', 'medal', 'rocket', 'stars', 'star')),
  ornament text not null default 'none'
    check (ornament in ('wreath', 'wings', 'none')),
  position integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Sessions and their roster
-- -----------------------------------------------------------------------------
create table if not exists public.classroom_sessions (
  id uuid primary key default gen_random_uuid(),
  -- The id in the URL (/classroom/<room_code>) and the LiveKit room name.
  room_code text not null unique check (room_code ~ '^[A-Za-z0-9_-]{4,64}$'),
  title text not null check (char_length(title) between 1 and 200),
  -- Browser tab title while the room is open.
  page_title text not null default 'Live class',
  class_type public.class_type not null default 'trial',
  tutor_id uuid references public.users (id) on delete set null,
  material_id uuid references public.classroom_materials (id) on delete set null,
  calendar_event_id uuid references public.calendar_events (id) on delete set null,
  scheduled_at timestamptz,
  duration_minutes integer check (duration_minutes between 5 and 600),
  status text not null default 'scheduled'
    check (status in ('scheduled', 'live', 'completed', 'not_completed', 'cancelled')),
  started_at timestamptz,
  ended_at timestamptz,
  -- End class report: an END_* reason id from src/data/classroom.ts (or null
  -- for "completed in this room"), the teacher's note and the class length.
  end_reason text,
  end_details text,
  elapsed_seconds integer check (elapsed_seconds >= 0),
  created_by uuid default auth.uid() references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists classroom_sessions_tutor_idx
  on public.classroom_sessions (tutor_id, scheduled_at desc);
create index if not exists classroom_sessions_scheduled_idx
  on public.classroom_sessions (scheduled_at desc);

-- A student booked into a session. Either a registered student (student_id),
-- a trial lead (lead_id) or typed in by hand; the profile fields are a
-- snapshot so the classroom panel works for all three.
create table if not exists public.classroom_session_students (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null
    references public.classroom_sessions (id) on delete cascade,
  student_id uuid references public.users (id) on delete set null,
  lead_id uuid references public.leads (id) on delete set null,
  display_name text not null check (char_length(display_name) between 1 and 120),
  grade text,
  -- The "Student ID" shown in the panel (e.g. s2048117).
  student_code text,
  phone text,
  email text,
  country text,
  city text,
  time_zone text not null default 'UTC',
  language text,
  -- Where the booking came from (landing page path, referral, ...).
  source text,
  interests text[] not null default '{}',
  special_requirement text,
  -- Set by End class: true attended, false absent, null not reported yet.
  attended boolean,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists classroom_session_students_session_idx
  on public.classroom_session_students (session_id, position);
create index if not exists classroom_session_students_student_idx
  on public.classroom_session_students (student_id);
create unique index if not exists classroom_session_students_unique_user
  on public.classroom_session_students (session_id, student_id)
  where student_id is not null;

-- -----------------------------------------------------------------------------
-- What happens in class
-- -----------------------------------------------------------------------------
create table if not exists public.classroom_badge_awards (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null
    references public.classroom_sessions (id) on delete cascade,
  session_student_id uuid not null
    references public.classroom_session_students (id) on delete cascade,
  -- Copied from the roster row by a trigger, for student dashboards.
  student_id uuid references public.users (id) on delete set null,
  badge_id uuid not null references public.classroom_badges (id) on delete restrict,
  awarded_by uuid default auth.uid() references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists classroom_badge_awards_session_idx
  on public.classroom_badge_awards (session_id, created_at desc);
create index if not exists classroom_badge_awards_student_idx
  on public.classroom_badge_awards (student_id);

create table if not exists public.classroom_project_submissions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null
    references public.classroom_sessions (id) on delete cascade,
  session_student_id uuid not null
    references public.classroom_session_students (id) on delete cascade,
  student_id uuid references public.users (id) on delete set null,
  activity_id uuid references public.classroom_activities (id) on delete set null,
  -- Snapshot, so the submission still reads right if the activity is edited.
  activity_title text not null,
  project_url text not null check (project_url ~* '^https?://'),
  note text,
  submitted_by uuid default auth.uid() references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists classroom_projects_session_idx
  on public.classroom_project_submissions (session_id, created_at desc);
create index if not exists classroom_projects_student_idx
  on public.classroom_project_submissions (student_id);

create table if not exists public.classroom_alerts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null
    references public.classroom_sessions (id) on delete cascade,
  -- 'ac' = academic counsellor, 'support' = support team (ALERTS in the app).
  alert_type text not null check (alert_type in ('ac', 'support')),
  sent_by uuid default auth.uid() references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.users (id) on delete set null
);
create index if not exists classroom_alerts_open_idx
  on public.classroom_alerts (created_at desc) where resolved_at is null;

-- Recordings made in the classroom link back to their session.
alter table public.class_recordings
  add column if not exists classroom_session_id uuid
    references public.classroom_sessions (id) on delete set null;

-- -----------------------------------------------------------------------------
-- Triggers
-- -----------------------------------------------------------------------------
create or replace function public.classroom_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists classroom_materials_touch on public.classroom_materials;
create trigger classroom_materials_touch
  before update on public.classroom_materials
  for each row execute function public.classroom_touch_updated_at();

drop trigger if exists classroom_sessions_touch on public.classroom_sessions;
create trigger classroom_sessions_touch
  before update on public.classroom_sessions
  for each row execute function public.classroom_touch_updated_at();

-- Awards and projects: the roster row must belong to the session, and the
-- registered student's id is copied across.
create or replace function public.classroom_fill_student()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  roster record;
begin
  select session_id, student_id into roster
  from public.classroom_session_students
  where id = new.session_student_id;

  if not found or roster.session_id <> new.session_id then
    raise exception 'Student % is not on session %', new.session_student_id, new.session_id;
  end if;

  new.student_id := roster.student_id;
  return new;
end;
$$;

drop trigger if exists classroom_badge_awards_fill on public.classroom_badge_awards;
create trigger classroom_badge_awards_fill
  before insert or update on public.classroom_badge_awards
  for each row execute function public.classroom_fill_student();

drop trigger if exists classroom_projects_fill on public.classroom_project_submissions;
create trigger classroom_projects_fill
  before insert or update on public.classroom_project_submissions
  for each row execute function public.classroom_fill_student();

-- -----------------------------------------------------------------------------
-- Session access helpers (used by the policies below)
-- -----------------------------------------------------------------------------
create or replace function public.classroom_can_teach(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.classroom_is_admin() or exists (
    select 1 from public.classroom_sessions
    where id = p_session_id and tutor_id = auth.uid()
  );
$$;

create or replace function public.classroom_is_enrolled(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.classroom_session_students
    where session_id = p_session_id and student_id = auth.uid()
  );
$$;

-- Guests joining from an invite link aren't signed in; they only need the
-- class title for the join screen. Nothing else about the session is exposed.
create or replace function public.classroom_public_info(p_room_code text)
returns table (title text, status text)
language sql
stable
security definer
set search_path = public
as $$
  select s.title, s.status
  from public.classroom_sessions s
  where s.room_code = p_room_code;
$$;

grant execute on function public.classroom_public_info(text) to anon, authenticated;
grant execute on function public.classroom_is_admin() to authenticated;
grant execute on function public.classroom_is_staff() to authenticated;
grant execute on function public.classroom_can_teach(uuid) to authenticated;
grant execute on function public.classroom_is_enrolled(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Row level security
--   admins (owner, operations_admin, tech_admin): everything
--   tutors: read lesson content; read and run the sessions they teach
--   students: read their own sessions, badges and projects
--   anon: the badge catalogue and classroom_public_info() only
-- -----------------------------------------------------------------------------
alter table public.classroom_materials enable row level security;
alter table public.classroom_activities enable row level security;
alter table public.classroom_badges enable row level security;
alter table public.classroom_sessions enable row level security;
alter table public.classroom_session_students enable row level security;
alter table public.classroom_badge_awards enable row level security;
alter table public.classroom_project_submissions enable row level security;
alter table public.classroom_alerts enable row level security;

-- Materials and activities
drop policy if exists "classroom materials: staff read" on public.classroom_materials;
create policy "classroom materials: staff read" on public.classroom_materials
  for select to authenticated using (public.classroom_is_staff());
drop policy if exists "classroom materials: admin write" on public.classroom_materials;
create policy "classroom materials: admin write" on public.classroom_materials
  for all to authenticated
  using (public.classroom_is_admin()) with check (public.classroom_is_admin());

drop policy if exists "classroom activities: staff read" on public.classroom_activities;
create policy "classroom activities: staff read" on public.classroom_activities
  for select to authenticated using (public.classroom_is_staff());
drop policy if exists "classroom activities: admin write" on public.classroom_activities;
create policy "classroom activities: admin write" on public.classroom_activities
  for all to authenticated
  using (public.classroom_is_admin()) with check (public.classroom_is_admin());

-- Badges
drop policy if exists "classroom badges: read" on public.classroom_badges;
create policy "classroom badges: read" on public.classroom_badges
  for select to anon, authenticated
  using (is_active or public.classroom_is_admin());
drop policy if exists "classroom badges: admin write" on public.classroom_badges;
create policy "classroom badges: admin write" on public.classroom_badges
  for all to authenticated
  using (public.classroom_is_admin()) with check (public.classroom_is_admin());

-- Sessions
drop policy if exists "classroom sessions: read" on public.classroom_sessions;
create policy "classroom sessions: read" on public.classroom_sessions
  for select to authenticated
  using (
    public.classroom_is_admin()
    or tutor_id = auth.uid()
    or public.classroom_is_enrolled(id)
  );
drop policy if exists "classroom sessions: admin insert" on public.classroom_sessions;
create policy "classroom sessions: admin insert" on public.classroom_sessions
  for insert to authenticated with check (public.classroom_is_admin());
drop policy if exists "classroom sessions: teach update" on public.classroom_sessions;
create policy "classroom sessions: teach update" on public.classroom_sessions
  for update to authenticated
  using (public.classroom_is_admin() or tutor_id = auth.uid())
  with check (public.classroom_is_admin() or tutor_id = auth.uid());
drop policy if exists "classroom sessions: admin delete" on public.classroom_sessions;
create policy "classroom sessions: admin delete" on public.classroom_sessions
  for delete to authenticated using (public.classroom_is_admin());

-- Roster
drop policy if exists "classroom roster: read" on public.classroom_session_students;
create policy "classroom roster: read" on public.classroom_session_students
  for select to authenticated
  using (public.classroom_can_teach(session_id) or student_id = auth.uid());
drop policy if exists "classroom roster: admin write" on public.classroom_session_students;
create policy "classroom roster: admin write" on public.classroom_session_students
  for all to authenticated
  using (public.classroom_is_admin()) with check (public.classroom_is_admin());
-- Tutors record attendance through End class.
drop policy if exists "classroom roster: tutor attendance" on public.classroom_session_students;
create policy "classroom roster: tutor attendance" on public.classroom_session_students
  for update to authenticated
  using (public.classroom_can_teach(session_id))
  with check (public.classroom_can_teach(session_id));

-- Badge awards
drop policy if exists "classroom awards: read" on public.classroom_badge_awards;
create policy "classroom awards: read" on public.classroom_badge_awards
  for select to authenticated
  using (public.classroom_can_teach(session_id) or student_id = auth.uid());
drop policy if exists "classroom awards: teach insert" on public.classroom_badge_awards;
create policy "classroom awards: teach insert" on public.classroom_badge_awards
  for insert to authenticated with check (public.classroom_can_teach(session_id));
drop policy if exists "classroom awards: teach delete" on public.classroom_badge_awards;
create policy "classroom awards: teach delete" on public.classroom_badge_awards
  for delete to authenticated using (public.classroom_can_teach(session_id));

-- Project submissions
drop policy if exists "classroom projects: read" on public.classroom_project_submissions;
create policy "classroom projects: read" on public.classroom_project_submissions
  for select to authenticated
  using (public.classroom_can_teach(session_id) or student_id = auth.uid());
drop policy if exists "classroom projects: teach insert" on public.classroom_project_submissions;
create policy "classroom projects: teach insert" on public.classroom_project_submissions
  for insert to authenticated with check (public.classroom_can_teach(session_id));
drop policy if exists "classroom projects: teach delete" on public.classroom_project_submissions;
create policy "classroom projects: teach delete" on public.classroom_project_submissions
  for delete to authenticated using (public.classroom_can_teach(session_id));

-- Alerts
drop policy if exists "classroom alerts: read" on public.classroom_alerts;
create policy "classroom alerts: read" on public.classroom_alerts
  for select to authenticated using (public.classroom_can_teach(session_id));
drop policy if exists "classroom alerts: teach insert" on public.classroom_alerts;
create policy "classroom alerts: teach insert" on public.classroom_alerts
  for insert to authenticated with check (public.classroom_can_teach(session_id));
drop policy if exists "classroom alerts: admin resolve" on public.classroom_alerts;
create policy "classroom alerts: admin resolve" on public.classroom_alerts
  for update to authenticated
  using (public.classroom_is_admin()) with check (public.classroom_is_admin());

-- class_recordings: let the teacher of a session file its recording. (Existing
-- policies on this table are left as they are.)
drop policy if exists "class recordings: classroom insert" on public.class_recordings;
create policy "class recordings: classroom insert" on public.class_recordings
  for insert to authenticated
  with check (
    classroom_session_id is not null
    and public.classroom_can_teach(classroom_session_id)
  );

-- -----------------------------------------------------------------------------
-- Storage: classroom recordings, private. The app stores the object path in
-- class_recordings.recording_url and opens it with a short-lived signed URL.
-- The bucket inherits the project's upload size limit (50 MB on the free
-- plan; raise it under Storage -> Settings on a paid plan for long classes).
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, allowed_mime_types)
values ('class-recordings', 'class-recordings', false, array['video/webm', 'video/mp4'])
on conflict (id) do nothing;

create or replace function public.classroom_can_read_recording(p_path text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.classroom_is_staff() or exists (
    select 1 from public.class_recordings
    where recording_url = p_path and student_id = auth.uid()
  );
$$;
grant execute on function public.classroom_can_read_recording(text) to authenticated;

drop policy if exists "class-recordings: staff upload" on storage.objects;
create policy "class-recordings: staff upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'class-recordings' and public.classroom_is_staff());
drop policy if exists "class-recordings: read" on storage.objects;
create policy "class-recordings: read" on storage.objects
  for select to authenticated
  using (bucket_id = 'class-recordings' and public.classroom_can_read_recording(name));
drop policy if exists "class-recordings: admin delete" on storage.objects;
create policy "class-recordings: admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'class-recordings' and public.classroom_is_admin());

-- -----------------------------------------------------------------------------
-- Seed: the classroom's former sample data, so /classroom/50813276 keeps
-- working and you have something to edit in Dashboard -> Classroom.
-- The student is fictional; delete the session once you have real ones.
-- -----------------------------------------------------------------------------
insert into public.classroom_badges (slug, name, icon, ornament, position) values
  ('charming-coder', 'Charming Coder', 'code', 'wreath', 1),
  ('coding-grandmaster', 'Coding Grandmaster', 'crown', 'wings', 2),
  ('creative-coder', 'Creative coder', 'bulb', 'wings', 3),
  ('design-master', 'Design Master', 'pen', 'none', 4),
  ('enthusiastic-coder', 'Enthusiastic coder', 'medal', 'wings', 5),
  ('outstanding-performance', 'Outstanding performance', 'rocket', 'wreath', 6),
  ('rising-coding-star', 'Rising Coding Star', 'stars', 'none', 7),
  ('star-performer', 'Star performer', 'star', 'wreath', 8)
on conflict (slug) do nothing;

do $$
declare
  v_material uuid;
  v_session uuid;
begin
  if exists (select 1 from public.classroom_sessions where room_code = '50813276') then
    return;
  end if;

  insert into public.classroom_materials (title, outline, outcomes, agenda, links)
  values (
    'AI & Coding Trial [Grade 6-8]',
    'This session aims to help students to try their hand at simple yet exciting game development as a demonstration. This session highlights our teaching methodology, the technology used, and a sample outcome. Additionally, counseling will help students and their families find the best course suited to them.',
    array[
      'Making an App using sensors',
      'Creating an image recognition application',
      'Learning text to Speech',
      'Functions',
      'Parents to find their best fit in Tech Talk Hub'
    ],
    '[
      {"minutes": 5, "step": "Welcome, introductions and confirm the student’s interests"},
      {"minutes": 10, "step": "Icebreaker and a quick look at what they have built before"},
      {"minutes": 25, "step": "Guided build: pick one classroom activity and code it together"},
      {"minutes": 10, "step": "Student presents their project; give a badge"},
      {"minutes": 10, "step": "Parent conversation: progress, course fit and next steps"}
    ]'::jsonb,
    '[
      {"label": "Scratch App", "isNew": true,
       "note": "Online Scratch editor - use for Save the Robot & block-based demos",
       "items": [{"text": "Launch", "href": "https://scratch.mit.edu/projects/editor/"}]},
      {"label": "Platform — Web Dev (Code.org)",
       "items": [{"text": "Web Lab", "href": "https://studio.code.org/projects/weblab/new"},
                 {"text": "Watch Platform tutorial", "href": "https://support.code.org/", "underline": true}]},
      {"label": "Platform — Python (Code.org)",
       "items": [{"text": "Python Lab", "href": "https://studio.code.org/projects/pythonlab/new"},
                 {"text": "Watch Platform tutorial", "href": "https://support.code.org/"}]},
      {"label": "Platform — Data Science / AI",
       "items": [{"text": "Google Colab", "href": "https://colab.research.google.com/"},
                 {"text": "Watch Platform tutorial", "href": "https://colab.research.google.com/notebooks/intro.ipynb"}]},
      {"label": "Platform — Apps (MIT App Inventor)",
       "items": [{"text": "App Inventor", "href": "https://ai2.appinventor.mit.edu/"},
                 {"text": "Watch Platform tutorial", "href": "https://appinventor.mit.edu/explore/ai2/tutorials"}]}
    ]'::jsonb
  )
  returning id into v_material;

  insert into public.classroom_activities (material_id, title, outline, project_url, position) values
    (v_material, 'Python quiz',
     'Create a quiz using the most popular programming language - Python.',
     'https://studio.code.org/projects/pythonlab/new', 1),
    (v_material, 'Space shooter',
     'Build a multilevel space game with sprites, scoring and a boss level the student designs.',
     'https://studio.code.org/projects/gamelab/new', 2),
    (v_material, 'Save the Robot',
     'Use video motion sensing in Scratch to save a robot character from falling by detecting player movement. This teaches students about interactive coding using video sensing and sprite control.',
     'https://scratch.mit.edu/projects/editor/', 3),
    (v_material, 'Word Swap',
     'Create a multi-screen app using MIT App Inventor that translates words from one language to another (e.g., English to Twi) and reads the translated text aloud. Students learn about app navigation, translation APIs, and text-to-speech integration.',
     'https://ai2.appinventor.mit.edu/', 4),
    (v_material, 'Registration Form',
     'In this activity, students will be making their own webpage for registration to a coding club.',
     'https://studio.code.org/projects/weblab/new', 5),
    (v_material, 'Superhero board',
     'Learn to create a superhero soundboard webpage with buttons that play sounds.',
     'https://studio.code.org/projects/weblab/new', 6);

  insert into public.classroom_sessions (room_code, title, page_title, class_type, material_id, scheduled_at, duration_minutes)
  values ('50813276', 'AI & Coding Trial [Grade 6-8]', 'Trial class', 'trial', v_material, now(), 60)
  returning id into v_session;

  insert into public.classroom_session_students (
    session_id, display_name, grade, student_code, phone, email, country, city,
    time_zone, language, source, interests, special_requirement, position
  ) values (
    v_session, 'Amara', 'Grade 8', 's2048117', '+233 20 555 0142',
    'amara.family@example.com', 'Ghana', 'Accra', 'Africa/Accra', 'English',
    '/lp/trial-coding-classes-for-kids.html', array['AI', 'game design'],
    'Student is interested in AI & Coding. Please personalize the trial accordingly and confirm their preference at the start of the class.',
    1
  );
end;
$$;
