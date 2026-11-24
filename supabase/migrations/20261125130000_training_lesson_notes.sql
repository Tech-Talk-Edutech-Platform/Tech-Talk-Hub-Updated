-- Tutor training: full lesson notes.
--
-- A lesson had a one-line summary and a few key points; the teaching itself
-- had nowhere to go. `body` holds the lesson's notes in Markdown (headings,
-- lists, bold, tables, links). A picture, video or document from the
-- lesson's materials is placed at a point in the notes with
--   ![Title](material:<material id>)
-- on its own line, so it shows where the text talks about it. Materials not
-- placed still show after the notes, as before.

alter table public.tutor_training_lessons
  add column if not exists body text not null default '';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'tutor_training_lessons_body_length'
      and conrelid = 'public.tutor_training_lessons'::regclass
  ) then
    alter table public.tutor_training_lessons
      add constraint tutor_training_lessons_body_length
      check (char_length(body) <= 60000);
  end if;
end
$$;

comment on column public.tutor_training_lessons.body is
  'The lesson''s notes in Markdown. ![Title](material:<id>) on its own line places one of the lesson''s materials there.';
