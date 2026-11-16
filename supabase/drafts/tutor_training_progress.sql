-- ============================================================================
-- DRAFT · NOT APPLIED. Tutor training progress.
--
-- This folder is outside supabase/migrations on purpose, so `supabase db push`
-- ignores it. The rest of the old sales draft (marketer role, trial bookings,
-- sales, WhatsApp log) is live: see supabase/migrations/20261116120000_marketer_role.sql
-- and 20261116130000_sales_trials.sql.
--
-- Today src/dashboards/views/tutor/TutorTrainingView.tsx keeps progress in the
-- tutor's browser. To let admins follow it:
--   1. Move this into a new migration and apply it, then `npm run gen:types`.
--   2. Read and write the table from TutorTrainingView instead of localStorage.
-- ============================================================================

-- One row per finished lesson (ids from src/data/tutorTraining.ts).
create table if not exists public.tutor_training_progress (
  tutor_id uuid not null references public.users(id) on delete cascade,
  lesson_id text not null,
  completed_at timestamptz not null default now(),
  primary key (tutor_id, lesson_id)
);

alter table public.tutor_training_progress enable row level security;

drop policy if exists "training: tutors manage their own, admins read all"
  on public.tutor_training_progress;
create policy "training: tutors manage their own, admins read all"
  on public.tutor_training_progress for all to authenticated
  using (tutor_id = auth.uid() or public.classroom_is_admin())
  with check (tutor_id = auth.uid());
