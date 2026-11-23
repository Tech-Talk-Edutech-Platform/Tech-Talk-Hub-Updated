-- =============================================================================
-- Tutor training: lesson materials (videos, pictures and documents).
--
--   tutor_training_lessons.materials   what tutors open inside the lesson:
--     [{ "id": "…", "kind": "video" | "image" | "document",
--        "title": "…", "note": "…",
--        "path": "lessons/<uuid>/file.pdf"      an upload in the bucket below
--        "url":  "https://youtu.be/…" | "/page"  or a link
--        "mime": "application/pdf", "size": 123456 }, …]
--
--   storage bucket tutor-training      the uploaded files, private: staff
--     (tutors and admins) read them through signed links, admins upload and
--     delete. 50 MB a file, the free plan's ceiling; longer videos go on
--     YouTube (unlisted), Loom, Vimeo or Google Drive and are added as links.
--
-- Also points the "Before the trial" lesson at My Schedule, now that the
-- tutors' Trial bookings page is gone (only if the text wasn't edited).
--
-- Safe to re-run.
-- =============================================================================

alter table public.tutor_training_lessons
  add column if not exists materials jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'tutor_training_lessons_materials_array'
      and conrelid = 'public.tutor_training_lessons'::regclass
  ) then
    alter table public.tutor_training_lessons
      add constraint tutor_training_lessons_materials_array
      check (jsonb_typeof(materials) = 'array' and jsonb_array_length(materials) <= 40);
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Storage
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tutor-training',
  'tutor-training',
  false,
  52428800,
  array[
    'image/png', 'image/jpeg', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm', 'video/quicktime',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "tutor-training: staff read" on storage.objects;
create policy "tutor-training: staff read" on storage.objects
  for select to authenticated
  using (bucket_id = 'tutor-training' and public.classroom_is_staff());

drop policy if exists "tutor-training: admins upload" on storage.objects;
create policy "tutor-training: admins upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'tutor-training' and public.classroom_is_admin());

drop policy if exists "tutor-training: admins update" on storage.objects;
create policy "tutor-training: admins update" on storage.objects
  for update to authenticated
  using (bucket_id = 'tutor-training' and public.classroom_is_admin())
  with check (bucket_id = 'tutor-training' and public.classroom_is_admin());

drop policy if exists "tutor-training: admins delete" on storage.objects;
create policy "tutor-training: admins delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'tutor-training' and public.classroom_is_admin());

-- -----------------------------------------------------------------------------
-- Content
-- -----------------------------------------------------------------------------

-- The tutors' Trial bookings page was folded into My Schedule.
update public.tutor_training_lessons
set points = array_replace(
  points,
  'Open “Trial bookings” and read the student’s grade and the notes from sales.',
  'Open the trial in “My Schedule” and read the student’s grade and the notes from sales.'
)
where id = 'trial-before';

-- A first picture, so the lesson page shows how materials look. Only where
-- the lesson has none yet.
update public.tutor_training_lessons
set materials = jsonb_build_array(jsonb_build_object(
  'id', 'seed-how-we-teach-photo',
  'kind', 'image',
  'title', 'Students build, the tutor guides',
  'note', 'The student at the keyboard drives; you point, ask and praise the debugging.',
  'url', '/classroom.png'
))
where id = 'welcome-how-we-teach' and materials = '[]'::jsonb;
