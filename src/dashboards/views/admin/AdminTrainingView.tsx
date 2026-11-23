import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Clock3,
  EyeOff,
  GraduationCap,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Users,
  X,
} from 'lucide-react'

import { supabase } from '../../../supabase'
import { getErrorMessage } from '../../../lib/getErrorMessage'
import { queryKeys } from '../../../lib/queryClient'
import {
  deleteLesson,
  deleteModule,
  loadAllProgress,
  loadTrainingCourse,
  saveLesson,
  saveModule,
  saveOrder,
  type LessonDraft,
  type ModuleDraft,
  type TrainingLesson,
  type TrainingLink,
  type TrainingModule,
} from '../../../features/training/trainingApi'
import {
  materialPaths,
  removeMaterialFiles,
  type MaterialKind,
} from '../../../features/training/materials'
import {
  MaterialsEditor,
  type MaterialRow,
} from '../../../features/training/MaterialsEditor'

/**
 * Admins write the tutor training course here; tutors take it under
 * Growth -> Training. Also shows how far each tutor has got.
 */

type Editing =
  | { kind: 'module'; module: TrainingModule | null }
  | { kind: 'lesson'; moduleId: string; lesson: TrainingLesson | null }

type Tab = 'content' | 'progress'

const inputClass =
  'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-purple-500 focus:outline-hidden dark:border-white/10 dark:bg-slate-950 dark:text-slate-100 dark:placeholder-slate-500'
const labelClass =
  'block text-xs font-bold tracking-wide text-slate-600 uppercase dark:text-slate-300'

async function loadTutors() {
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, email, is_active')
    .eq('role', 'tutor')
    .order('full_name', { ascending: true })
  if (error) throw error
  return data
}

export default function AdminTrainingView() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('content')
  const [editing, setEditing] = useState<Editing | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{
    tone: 'ok' | 'error'
    text: string
  } | null>(null)

  const courseQuery = useQuery({
    queryKey: queryKeys.training.course,
    queryFn: loadTrainingCourse,
  })
  const course = courseQuery.data ?? []

  /** Runs a change, then reloads the course (and tutors' views of it). */
  const run = async (change: () => Promise<void>, success: string) => {
    setBusy(true)
    setNotice(null)
    try {
      await change()
      setNotice({ tone: 'ok', text: success })
      await queryClient.invalidateQueries({ queryKey: ['training'] })
      return true
    } catch (error) {
      setNotice({
        tone: 'error',
        text: getErrorMessage(error, 'That didn’t save. Please try again.'),
      })
      return false
    } finally {
      setBusy(false)
    }
  }

  const moveModule = (index: number, step: -1 | 1) => {
    const order = [...course]
    const [moved] = order.splice(index, 1)
    if (!moved) return
    order.splice(index + step, 0, moved)
    void run(
      () => saveOrder('tutor_training_modules', order),
      'Module order saved.',
    )
  }

  const moveLesson = (module: TrainingModule, index: number, step: -1 | 1) => {
    const order = [...module.lessons]
    const [moved] = order.splice(index, 1)
    if (!moved) return
    order.splice(index + step, 0, moved)
    void run(
      () => saveOrder('tutor_training_lessons', order),
      'Lesson order saved.',
    )
  }

  const removeModule = (module: TrainingModule) => {
    if (
      !window.confirm(
        `Delete “${module.title}” and its ${module.lessons.length} lessons, with their uploaded files? Tutors’ progress on them is deleted too. To hide it for now, edit it and untick “Published” instead.`,
      )
    )
      return
    void run(() => deleteModule(module), 'Module deleted.')
  }

  const removeLesson = (lesson: TrainingLesson) => {
    if (
      !window.confirm(
        `Delete the lesson “${lesson.title}” and its uploaded files? Tutors who finished it lose that tick.`,
      )
    )
      return
    void run(() => deleteLesson(lesson), 'Lesson deleted.')
  }

  const totalLessons = course.reduce((sum, m) => sum + m.lessons.length, 0)
  const totalMinutes = course.reduce(
    (sum, m) => sum + m.lessons.reduce((s, l) => s + l.minutes, 0),
    0,
  )

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <header className="flex flex-col justify-between gap-4 rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm md:flex-row md:items-center md:p-8 dark:border-white/10 dark:bg-white/5">
        <div>
          <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-purple-500/10 px-3 py-1 text-xs font-bold tracking-wider text-purple-600 uppercase dark:text-purple-300">
            <GraduationCap size={14} aria-hidden /> Tutor training
          </p>
          <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
            Training course
          </h1>
          <p className="mt-1 max-w-xl text-sm text-slate-500 dark:text-slate-400">
            Write the modules and lessons every tutor works through. Changes
            show up for tutors straight away; unpublished modules stay hidden
            until you publish them.
          </p>
        </div>
        <div className="flex shrink-0 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-white/10">
          <TabButton
            active={tab === 'content'}
            onClick={() => setTab('content')}
          >
            <BookOpen size={15} aria-hidden /> Content
          </TabButton>
          <TabButton
            active={tab === 'progress'}
            onClick={() => setTab('progress')}
          >
            <Users size={15} aria-hidden /> Tutor progress
          </TabButton>
        </div>
      </header>

      {notice && (
        <p
          role={notice.tone === 'error' ? 'alert' : 'status'}
          className={`rounded-xl px-4 py-3 text-sm font-semibold ${
            notice.tone === 'error'
              ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200'
              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200'
          }`}
        >
          {notice.text}
        </p>
      )}

      {courseQuery.isPending ? (
        <div className="flex min-h-[30vh] items-center justify-center text-sm font-semibold text-slate-500">
          <RefreshCw className="mr-2 animate-spin" size={18} aria-hidden />{' '}
          Loading the course…
        </div>
      ) : courseQuery.isError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          <p className="font-bold">The course couldn’t load.</p>
          <p className="mt-1">
            {getErrorMessage(
              courseQuery.error,
              'Check that the tutor training migration has been applied.',
            )}
          </p>
        </div>
      ) : tab === 'progress' ? (
        <ProgressTab course={course} />
      ) : (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {course.length} modules · {totalLessons} lessons · about{' '}
              {totalMinutes} min
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => setEditing({ kind: 'module', module: null })}
              className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-purple-700 disabled:opacity-50"
            >
              <Plus size={16} aria-hidden /> Add module
            </button>
          </div>

          {course.length === 0 && (
            <p className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500 dark:border-white/10">
              No modules yet. Add the first one.
            </p>
          )}

          <ol className="space-y-4">
            {course.map((module, index) => (
              <li
                key={module.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900"
              >
                <div className="flex flex-wrap items-start gap-4 p-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-sm font-black text-purple-700 dark:bg-purple-500/20 dark:text-purple-200">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-extrabold text-slate-900 dark:text-white">
                      {module.title}
                      <Badge tone={module.required ? 'rose' : 'slate'}>
                        {module.required ? 'Required' : 'Optional'}
                      </Badge>
                      {!module.is_published && (
                        <Badge tone="amber">
                          <EyeOff size={11} aria-hidden /> Draft
                        </Badge>
                      )}
                    </p>
                    {module.description && (
                      <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                        {module.description}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <IconButton
                      label={`Move “${module.title}” up`}
                      disabled={busy || index === 0}
                      onClick={() => moveModule(index, -1)}
                    >
                      <ArrowUp size={15} />
                    </IconButton>
                    <IconButton
                      label={`Move “${module.title}” down`}
                      disabled={busy || index === course.length - 1}
                      onClick={() => moveModule(index, 1)}
                    >
                      <ArrowDown size={15} />
                    </IconButton>
                    <IconButton
                      label={`Edit “${module.title}”`}
                      disabled={busy}
                      onClick={() => setEditing({ kind: 'module', module })}
                    >
                      <Pencil size={15} />
                    </IconButton>
                    <IconButton
                      label={`Delete “${module.title}”`}
                      tone="danger"
                      disabled={busy}
                      onClick={() => removeModule(module)}
                    >
                      <Trash2 size={15} />
                    </IconButton>
                  </div>
                </div>

                <ul className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-white/10 dark:border-white/10">
                  {module.lessons.map((lesson, lessonIndex) => (
                    <li
                      key={lesson.id}
                      className="flex flex-wrap items-start gap-3 px-5 py-4"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-bold text-slate-900 dark:text-white">
                          {lesson.title}
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400">
                            <Clock3 size={12} aria-hidden /> {lesson.minutes}{' '}
                            min
                          </span>
                        </p>
                        {lesson.summary && (
                          <p className="mt-0.5 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
                            {lesson.summary}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-slate-400">
                          {lessonContents(lesson)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <IconButton
                          label={`Move “${lesson.title}” up`}
                          disabled={busy || lessonIndex === 0}
                          onClick={() => moveLesson(module, lessonIndex, -1)}
                        >
                          <ArrowUp size={14} />
                        </IconButton>
                        <IconButton
                          label={`Move “${lesson.title}” down`}
                          disabled={
                            busy || lessonIndex === module.lessons.length - 1
                          }
                          onClick={() => moveLesson(module, lessonIndex, 1)}
                        >
                          <ArrowDown size={14} />
                        </IconButton>
                        <IconButton
                          label={`Edit “${lesson.title}”`}
                          disabled={busy}
                          onClick={() =>
                            setEditing({
                              kind: 'lesson',
                              moduleId: module.id,
                              lesson,
                            })
                          }
                        >
                          <Pencil size={14} />
                        </IconButton>
                        <IconButton
                          label={`Delete “${lesson.title}”`}
                          tone="danger"
                          disabled={busy}
                          onClick={() => removeLesson(lesson)}
                        >
                          <Trash2 size={14} />
                        </IconButton>
                      </div>
                    </li>
                  ))}
                  <li className="px-5 py-3">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        setEditing({
                          kind: 'lesson',
                          moduleId: module.id,
                          lesson: null,
                        })
                      }
                      className="inline-flex items-center gap-1.5 text-sm font-bold text-purple-600 hover:underline disabled:opacity-50 dark:text-purple-300"
                    >
                      <Plus size={15} aria-hidden /> Add lesson
                    </button>
                  </li>
                </ul>
              </li>
            ))}
          </ol>
        </section>
      )}

      {editing?.kind === 'module' && (
        <ModuleEditor
          module={editing.module}
          busy={busy}
          onClose={() => setEditing(null)}
          onSave={async (draft) => {
            const target = editing.module
              ? { id: editing.module.id }
              : { position: course.length + 1 }
            const saved = await run(
              () => saveModule(draft, target),
              editing.module ? 'Module saved.' : 'Module added.',
            )
            if (saved) setEditing(null)
          }}
        />
      )}

      {editing?.kind === 'lesson' && (
        <LessonEditor
          lesson={editing.lesson}
          busy={busy}
          onClose={() => setEditing(null)}
          onSave={async (draft) => {
            const lessonCount =
              course.find((m) => m.id === editing.moduleId)?.lessons.length ?? 0
            const target = editing.lesson
              ? { id: editing.lesson.id }
              : { moduleId: editing.moduleId, position: lessonCount + 1 }
            // The editor closes itself once its files are tidied up.
            return run(
              () => saveLesson(draft, target),
              editing.lesson ? 'Lesson saved.' : 'Lesson added.',
            )
          }}
        />
      )}
    </div>
  )
}

// ── Tutor progress ───────────────────────────────────────────────────────

function ProgressTab({ course }: { course: TrainingModule[] }) {
  const tutorsQuery = useQuery({
    queryKey: ['training', 'tutors'],
    queryFn: loadTutors,
  })
  const progressQuery = useQuery({
    queryKey: queryKeys.training.allProgress,
    queryFn: loadAllProgress,
  })

  if (tutorsQuery.isPending || progressQuery.isPending) {
    return (
      <div className="flex min-h-[20vh] items-center justify-center text-sm font-semibold text-slate-500">
        <RefreshCw className="mr-2 animate-spin" size={18} aria-hidden />{' '}
        Loading progress…
      </div>
    )
  }
  if (tutorsQuery.isError || progressQuery.isError) {
    return (
      <p className="rounded-2xl bg-rose-50 p-6 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">
        {getErrorMessage(
          tutorsQuery.error ?? progressQuery.error,
          'Progress couldn’t load.',
        )}
      </p>
    )
  }

  const published = course.filter((module) => module.is_published)
  const allIds = new Set(
    published.flatMap((module) => module.lessons.map((l) => l.id)),
  )
  const requiredIds = new Set(
    published
      .filter((module) => module.required)
      .flatMap((module) => module.lessons.map((l) => l.id)),
  )

  const rows = tutorsQuery.data.map((tutor) => {
    const mine = progressQuery.data.filter(
      (row) => row.tutor_id === tutor.id && allIds.has(row.lesson_id),
    )
    const last = mine.reduce<string | null>(
      (latest, row) =>
        !latest || row.completed_at > latest ? row.completed_at : latest,
      null,
    )
    return {
      tutor,
      done: mine.length,
      requiredDone: mine.filter((row) => requiredIds.has(row.lesson_id)).length,
      last,
    }
  })

  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500 dark:border-white/10">
        No tutors yet.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="border-b border-slate-100 text-xs font-bold tracking-wide text-slate-500 uppercase dark:border-white/10">
          <tr>
            <th className="px-5 py-3">Tutor</th>
            <th className="px-5 py-3">Required</th>
            <th className="px-5 py-3">All lessons</th>
            <th className="px-5 py-3">Last activity</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-white/10">
          {rows.map(({ tutor, done, requiredDone, last }) => {
            const requiredComplete =
              requiredIds.size > 0 && requiredDone === requiredIds.size
            return (
              <tr key={tutor.id}>
                <td className="px-5 py-3">
                  <p className="font-bold text-slate-900 dark:text-white">
                    {tutor.full_name || tutor.email || 'Unnamed tutor'}
                  </p>
                  {tutor.is_active === false && (
                    <p className="text-xs text-slate-400">Inactive</p>
                  )}
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`font-bold tabular-nums ${requiredComplete ? 'text-emerald-600 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-200'}`}
                  >
                    {requiredDone}/{requiredIds.size}
                  </span>
                  {requiredComplete && (
                    <span className="ml-2 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                      Ready to teach
                    </span>
                  )}
                </td>
                <td
                  className="px-5 py-3"
                  aria-label={`${done} of ${allIds.size} lessons done`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                      <div
                        className="h-full rounded-full bg-purple-600 dark:bg-purple-400"
                        style={{
                          width: `${allIds.size ? (done / allIds.size) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-500 tabular-nums">
                      {done}/{allIds.size}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3 text-xs text-slate-500">
                  {last
                    ? new Date(last).toLocaleDateString(undefined, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'Not started'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Editors ──────────────────────────────────────────────────────────────

function ModuleEditor({
  module,
  busy,
  onClose,
  onSave,
}: {
  module: TrainingModule | null
  busy: boolean
  onClose: () => void
  onSave: (draft: ModuleDraft) => Promise<void>
}) {
  const [draft, setDraft] = useState<ModuleDraft>(() => ({
    title: module?.title ?? '',
    description: module?.description ?? '',
    required: module?.required ?? true,
    is_published: module?.is_published ?? true,
  }))
  const [error, setError] = useState<string | null>(null)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!draft.title.trim()) {
      setError('Give the module a title.')
      return
    }
    setError(null)
    void onSave(draft)
  }

  return (
    <EditorDialog
      title={module ? 'Edit module' : 'New module'}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        <label className={labelClass}>
          Title
          <input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            maxLength={200}
            placeholder="e.g. Running a great trial class"
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          Description
          <textarea
            value={draft.description}
            onChange={(e) =>
              setDraft({ ...draft, description: e.target.value })
            }
            rows={3}
            placeholder="One line on what this module covers."
            className={inputClass}
          />
        </label>
        <Checkbox
          checked={draft.required}
          onChange={(required) => setDraft({ ...draft, required })}
          label="Required"
          hint="Tutors must finish it before teaching on their own."
        />
        <Checkbox
          checked={draft.is_published}
          onChange={(is_published) => setDraft({ ...draft, is_published })}
          label="Published"
          hint="Untick to hide it from tutors while you work on it."
        />
        <EditorFooter error={error} busy={busy} onCancel={onClose} />
      </form>
    </EditorDialog>
  )
}

type LinkRow = TrainingLink & { key: number }

/** Stable React keys for link rows that are being typed into. */
let linkRowSeq = 0
const linkRow = (link: TrainingLink): LinkRow => ({
  label: link.label,
  href: link.href,
  key: ++linkRowSeq,
})

function LessonEditor({
  lesson,
  busy,
  onClose,
  onSave,
}: {
  lesson: TrainingLesson | null
  busy: boolean
  onClose: () => void
  /** Resolves true once saved. */
  onSave: (draft: LessonDraft) => Promise<boolean>
}) {
  const [title, setTitle] = useState(lesson?.title ?? '')
  const [minutes, setMinutes] = useState(String(lesson?.minutes ?? 10))
  const [summary, setSummary] = useState(lesson?.summary ?? '')
  const [points, setPoints] = useState((lesson?.points ?? []).join('\n'))
  const [links, setLinks] = useState<LinkRow[]>(() =>
    (lesson?.links ?? []).map(linkRow),
  )
  const [materials, setMaterials] = useState<MaterialRow[]>(
    () => lesson?.materials ?? [],
  )
  const [error, setError] = useState<string | null>(null)
  // Files uploaded while editing: deleted again if the lesson isn't saved.
  const uploaded = useRef(new Set<string>())
  const saved = useRef(false)
  useEffect(() => {
    const fresh = uploaded.current
    return () => {
      if (!saved.current) void removeMaterialFiles([...fresh])
    }
  }, [])

  const updateLink = (key: number, patch: Partial<TrainingLink>) =>
    setLinks((rows) =>
      rows.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    )

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const length = Number(minutes)
    if (!title.trim()) {
      setError('Give the lesson a title.')
      return
    }
    if (!Number.isInteger(length) || length < 1 || length > 600) {
      setError('Minutes must be a whole number from 1 to 600.')
      return
    }
    const cleanLinks = links
      .map(({ label, href }) => ({ label: label.trim(), href: href.trim() }))
      .filter((link) => link.label || link.href)
    const badLink = cleanLinks.find(
      (link) =>
        !link.label ||
        !(link.href.startsWith('/') || /^https?:\/\//i.test(link.href)),
    )
    if (badLink) {
      setError(
        'Each link needs a label and an address starting with / (a page on this site) or https://.',
      )
      return
    }
    if (materials.some((row) => row.uploading)) {
      setError('Wait for the uploads to finish, then save.')
      return
    }
    setError(null)
    void saveDraft({
      title,
      minutes: length,
      summary,
      points: [
        ...new Set(
          points
            .split('\n')
            .map((point) => point.trim())
            .filter(Boolean),
        ),
      ],
      links: cleanLinks,
      materials: materials.map((row) => ({
        id: row.id,
        kind: row.kind,
        title: row.title,
        note: row.note,
        path: row.path,
        url: row.url,
        mime: row.mime,
        size: row.size,
      })),
    })
  }

  const saveDraft = async (draft: LessonDraft) => {
    if (!(await onSave(draft))) return
    saved.current = true
    // Files taken out of the lesson (or uploaded, then removed) go too.
    const keep = new Set(materialPaths(draft.materials))
    const before = materialPaths(lesson?.materials ?? [])
    void removeMaterialFiles(
      [...new Set([...before, ...uploaded.current])].filter(
        (path) => !keep.has(path),
      ),
    )
    onClose()
  }

  return (
    <EditorDialog
      title={lesson ? 'Edit lesson' : 'New lesson'}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_120px]">
          <label className={labelClass}>
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder="e.g. Before the trial"
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Minutes
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={600}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              className={inputClass}
            />
          </label>
        </div>
        <label className={labelClass}>
          Summary
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={2}
            placeholder="The lesson in one sentence."
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          Key points <span className="normal-case">(one per line)</span>
          <textarea
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            rows={5}
            placeholder={
              'Join 5 minutes early.\nHave a backup project ready.\nNever discuss fees.'
            }
            className={inputClass}
          />
        </label>
        <fieldset className="min-w-0 space-y-2">
          <legend className={labelClass}>Read more links (optional)</legend>
          {links.map((link) => (
            <div key={link.key} className="flex gap-2">
              <input
                aria-label="Link label"
                value={link.label}
                onChange={(e) =>
                  updateLink(link.key, { label: e.target.value })
                }
                placeholder="Label"
                className={`${inputClass} mt-0 !w-1/3 min-w-0`}
              />
              <input
                aria-label="Link address"
                value={link.href}
                onChange={(e) => updateLink(link.key, { href: e.target.value })}
                placeholder="/child-safety or https://…"
                className={`${inputClass} mt-0 !w-auto min-w-0 flex-1`}
              />
              <IconButton
                label="Remove link"
                tone="danger"
                onClick={() =>
                  setLinks((rows) => rows.filter((row) => row.key !== link.key))
                }
              >
                <X size={15} />
              </IconButton>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setLinks((rows) => [...rows, linkRow({ label: '', href: '' })])
            }
            className="inline-flex items-center gap-1.5 text-sm font-bold text-purple-600 hover:underline dark:text-purple-300"
          >
            <Plus size={14} aria-hidden /> Add link
          </button>
        </fieldset>
        <MaterialsEditor
          materials={materials}
          onChange={setMaterials}
          onUploaded={(path) => uploaded.current.add(path)}
          labelClass={labelClass}
        />
        <EditorFooter error={error} busy={busy} onCancel={onClose} />
      </form>
    </EditorDialog>
  )
}

// ── Small pieces ─────────────────────────────────────────────────────────

const KIND_NAMES: Record<MaterialKind, [string, string]> = {
  video: ['video', 'videos'],
  image: ['picture', 'pictures'],
  document: ['document', 'documents'],
}

const counted = (count: number, [one, many]: [string, string]) =>
  `${count} ${count === 1 ? one : many}`

/** "3 key points · 1 video · 2 pictures · 1 link". */
function lessonContents(lesson: TrainingLesson): string {
  const kinds: MaterialKind[] = ['video', 'image', 'document']
  return [
    counted(lesson.points.length, ['key point', 'key points']),
    ...kinds.flatMap((kind) => {
      const count = lesson.materials.filter((m) => m.kind === kind).length
      return count ? [counted(count, KIND_NAMES[kind])] : []
    }),
    ...(lesson.links.length
      ? [counted(lesson.links.length, ['link', 'links'])]
      : []),
  ].join(' · ')
}

/** Native modal dialog: traps focus, closes on Escape or a backdrop click. */
function EditorDialog({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
    return () => {
      if (dialog?.open) dialog.close()
    }
  }, [])

  return (
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- backdrop click to close; Escape (onCancel) is the keyboard equivalent
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl border-0 bg-white p-6 text-slate-900 shadow-2xl backdrop:bg-slate-950/60 backdrop:backdrop-blur-sm dark:bg-slate-900 dark:text-white"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 id={titleId} className="text-lg font-black">
          {title}
        </h2>
        <IconButton label="Close" onClick={onClose}>
          <X size={18} />
        </IconButton>
      </div>
      {children}
    </dialog>
  )
}

function EditorFooter({
  error,
  busy,
  onCancel,
}: {
  error: string | null
  busy: boolean
  onCancel: () => void
}) {
  return (
    <div className="space-y-3 border-t border-slate-100 pt-4 dark:border-white/10">
      {error && (
        <p
          role="alert"
          className="text-sm font-semibold text-rose-600 dark:text-rose-300"
        >
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-purple-600 px-5 py-2 text-sm font-bold text-white hover:bg-purple-700 disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

function Checkbox({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  hint: string
}) {
  return (
    <label
      aria-label={label}
      className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 dark:border-white/10"
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 accent-purple-600"
      />
      <span>
        <span className="block text-sm font-bold text-slate-900 dark:text-white">
          {label}
        </span>
        <span className="block text-xs text-slate-500 dark:text-slate-400">
          {hint}
        </span>
      </span>
    </label>
  )
}

function IconButton({
  label,
  onClick,
  disabled,
  tone = 'neutral',
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  tone?: 'neutral' | 'danger'
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-lg p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
        tone === 'danger'
          ? 'text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-300'
          : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-bold transition-colors ${
        active
          ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
          : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}

function Badge({
  tone,
  children,
}: {
  tone: 'rose' | 'slate' | 'amber'
  children: ReactNode
}) {
  const tones = {
    rose: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
    slate: 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300',
    amber:
      'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${tones[tone]}`}
    >
      {children}
    </span>
  )
}
