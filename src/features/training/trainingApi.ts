import { supabase } from '../../supabase'
import type { Json, Tables } from '../../types/database'
import {
  materialPaths,
  parseMaterials,
  removeMaterialFiles,
  serializeMaterials,
  type TrainingMaterial,
} from './materials'

/**
 * Tutor training lives in the database so admins can edit it
 * (supabase/migrations/20261117140000_tutor_training.sql):
 * Dashboard -> Tutor Training for admins, Growth -> Training for tutors.
 */

export type TrainingLink = { label: string; href: string }

export type TrainingLesson = Omit<
  Tables<'tutor_training_lessons'>,
  'links' | 'materials'
> & {
  links: TrainingLink[]
  /** Videos, pictures and documents (empty until migration 20261124120000). */
  materials: TrainingMaterial[]
}

export type TrainingModule = Tables<'tutor_training_modules'> & {
  lessons: TrainingLesson[]
}

export type TrainingProgressRow = Pick<
  Tables<'tutor_training_progress'>,
  'tutor_id' | 'lesson_id' | 'completed_at'
>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** `links` is free-form JSON in the database; keep only well-formed entries. */
export function parseLinks(value: Json): TrainingLink[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) =>
    isRecord(item) &&
    typeof item.label === 'string' &&
    typeof item.href === 'string' &&
    item.label.trim() &&
    item.href.trim()
      ? [{ label: item.label.trim(), href: item.href.trim() }]
      : [],
  )
}

/**
 * The course in order. Tutors only get published modules (row level
 * security); admins get drafts too.
 */
export async function loadTrainingCourse(): Promise<TrainingModule[]> {
  const { data, error } = await supabase
    .from('tutor_training_modules')
    .select('*, tutor_training_lessons(*)')
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error

  return data.map(({ tutor_training_lessons: lessons, ...module }) =>
    Object.assign(module, {
      lessons: lessons
        .toSorted(
          (a, b) =>
            a.position - b.position || a.created_at.localeCompare(b.created_at),
        )
        .map((lesson) =>
          Object.assign(lesson, {
            links: parseLinks(lesson.links),
            materials: parseMaterials(lesson.materials),
          }),
        ),
    }),
  )
}

export async function loadTutorProgress(tutorId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('tutor_training_progress')
    .select('lesson_id')
    .eq('tutor_id', tutorId)
  if (error) throw error
  return new Set(data.map((row) => row.lesson_id))
}

export async function setLessonDone(
  tutorId: string,
  lessonId: string,
  done: boolean,
): Promise<void> {
  const { error } = done
    ? await supabase
        .from('tutor_training_progress')
        .upsert(
          { tutor_id: tutorId, lesson_id: lessonId },
          { onConflict: 'tutor_id,lesson_id', ignoreDuplicates: true },
        )
    : await supabase
        .from('tutor_training_progress')
        .delete()
        .eq('tutor_id', tutorId)
        .eq('lesson_id', lessonId)
  if (error) throw error
}

/**
 * Progress used to be kept in the tutor's browser. Copies whatever is there
 * (for lessons that still exist) into the database once, then forgets it.
 */
export async function importBrowserProgress(
  tutorId: string,
  lessonIds: ReadonlySet<string>,
): Promise<number> {
  const key = `tth:tutor-training:${tutorId}`
  let saved: string[] = []
  try {
    const raw = localStorage.getItem(key)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    if (Array.isArray(parsed)) {
      saved = parsed.filter(
        (id): id is string => typeof id === 'string' && lessonIds.has(id),
      )
    }
  } catch {
    return 0
  }
  if (saved.length > 0) {
    const { error } = await supabase.from('tutor_training_progress').upsert(
      saved.map((lessonId) => ({ tutor_id: tutorId, lesson_id: lessonId })),
      { onConflict: 'tutor_id,lesson_id', ignoreDuplicates: true },
    )
    if (error) throw error
  }
  try {
    localStorage.removeItem(key)
  } catch {
    // Storage blocked: nothing to forget.
  }
  return saved.length
}

// ── Admin ────────────────────────────────────────────────────────────────

export async function loadAllProgress(): Promise<TrainingProgressRow[]> {
  const { data, error } = await supabase
    .from('tutor_training_progress')
    .select('tutor_id, lesson_id, completed_at')
  if (error) throw error
  return data
}

export type ModuleDraft = {
  title: string
  description: string
  required: boolean
  is_published: boolean
}

export async function saveModule(
  draft: ModuleDraft,
  existing: { id: string } | { position: number },
): Promise<void> {
  const fields = {
    title: draft.title.trim(),
    description: draft.description.trim(),
    required: draft.required,
    is_published: draft.is_published,
  }
  const { error } =
    'id' in existing
      ? await supabase
          .from('tutor_training_modules')
          .update(fields)
          .eq('id', existing.id)
      : await supabase
          .from('tutor_training_modules')
          .insert({ ...fields, position: existing.position })
  if (error) throw error
}

/** Deletes the module, its lessons and their uploaded files. */
export async function deleteModule(module: TrainingModule): Promise<void> {
  const { error } = await supabase
    .from('tutor_training_modules')
    .delete()
    .eq('id', module.id)
  if (error) throw error
  await removeMaterialFiles(
    module.lessons.flatMap((lesson) => materialPaths(lesson.materials)),
  )
}

export type LessonDraft = {
  title: string
  minutes: number
  summary: string
  points: string[]
  links: TrainingLink[]
  materials: TrainingMaterial[]
}

export async function saveLesson(
  draft: LessonDraft,
  existing: { id: string } | { moduleId: string; position: number },
): Promise<void> {
  const base = {
    title: draft.title.trim(),
    minutes: draft.minutes,
    summary: draft.summary.trim(),
    points: draft.points,
    links: draft.links,
  }
  const write = (row: typeof base & { materials?: Json }) =>
    'id' in existing
      ? supabase
          .from('tutor_training_lessons')
          .update(row)
          .eq('id', existing.id)
      : supabase.from('tutor_training_lessons').insert({
          ...row,
          module_id: existing.moduleId,
          position: existing.position,
        })
  let { error } = await write({
    ...base,
    materials: serializeMaterials(draft.materials),
  })
  if (error && missingMaterialsColumn(error)) {
    // Before migration 20261124120000 a lesson with no materials still saves.
    if (draft.materials.length > 0) {
      throw new Error(
        'Lesson materials aren’t set up in the database yet (migration 20261124120000_tutor_training_materials.sql).',
      )
    }
    ;({ error } = await write(base))
  }
  if (error) throw error
}

function missingMaterialsColumn(error: { code?: string; message: string }) {
  return (
    (error.code === 'PGRST204' || error.code === '42703') &&
    error.message.includes('materials')
  )
}

/** Deletes the lesson and its uploaded files. */
export async function deleteLesson(lesson: TrainingLesson): Promise<void> {
  const { error } = await supabase
    .from('tutor_training_lessons')
    .delete()
    .eq('id', lesson.id)
  if (error) throw error
  await removeMaterialFiles(materialPaths(lesson.materials))
}

/**
 * Saves a new order: each item's position becomes its index. Only rows whose
 * position changed are written.
 */
export async function saveOrder(
  table: 'tutor_training_modules' | 'tutor_training_lessons',
  items: readonly { id: string; position: number }[],
): Promise<void> {
  const changed = items.flatMap((item, index) =>
    item.position === index + 1 ? [] : [{ id: item.id, position: index + 1 }],
  )
  const results = await Promise.all(
    changed.map(({ id, position }) =>
      supabase.from(table).update({ position }).eq('id', id),
    ),
  )
  const failed = results.find((result) => result.error)
  if (failed?.error) throw failed.error
}
