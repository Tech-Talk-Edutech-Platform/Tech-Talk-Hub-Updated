import { useMemo, useRef, useState, type Ref } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  PlayCircle,
  RefreshCw,
} from 'lucide-react'

import {
  LessonDocuments,
  LessonImages,
  LessonVideos,
} from '../../../features/training/LessonMaterials'
import { useMaterialUrls } from '../../../features/training/materials'
import {
  importBrowserProgress,
  loadTrainingCourse,
  loadTutorProgress,
  setLessonDone,
  type TrainingLesson,
  type TrainingModule,
} from '../../../features/training/trainingApi'
import { getErrorMessage } from '../../../lib/getErrorMessage'
import { queryKeys } from '../../../lib/queryClient'

type TutorTraining = { course: TrainingModule[]; done: Set<string> }

/** One lesson with its place in the course. */
type Entry = { lesson: TrainingLesson; module: TrainingModule; index: number }

/** The course (edited by admins) and what this tutor has finished. */
async function loadTutorTraining(tutorId: string): Promise<TutorTraining> {
  const course = await loadTrainingCourse()
  const lessonIds = new Set(
    course.flatMap((module) => module.lessons.map((lesson) => lesson.id)),
  )
  // Progress used to be saved in the browser; bring it across once.
  await importBrowserProgress(tutorId, lessonIds)
  const done = await loadTutorProgress(tutorId)
  return { course, done }
}

// The lesson open last time, so the page comes back to it.
const lastLessonKey = (tutorId: string) => `tth:training:last-lesson:${tutorId}`

function readLastLesson(tutorId: string): string | null {
  try {
    return localStorage.getItem(lastLessonKey(tutorId))
  } catch {
    return null
  }
}

function rememberLesson(tutorId: string, lessonId: string) {
  try {
    localStorage.setItem(lastLessonKey(tutorId), lessonId)
  } catch {
    // Storage blocked: the page opens on the next unfinished lesson instead.
  }
}

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function TutorTrainingView({ userId }: { userId: string }) {
  const queryClient = useQueryClient()
  const queryKey = queryKeys.training.progress(userId)
  const trainingQuery = useQuery({
    queryKey,
    queryFn: () => loadTutorTraining(userId),
  })
  const [chosenId, setChosenId] = useState(() => readLastLesson(userId))
  const [outlineOpen, setOutlineOpen] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const lessonRef = useRef<HTMLElement>(null)

  const course = trainingQuery.data?.course
  const done = trainingQuery.data?.done

  const entries = useMemo<Entry[]>(
    () =>
      (course ?? []).flatMap((module) =>
        module.lessons.map((lesson, index) => ({ lesson, module, index })),
      ),
    [course],
  )

  const totals = useMemo(() => {
    const finished = done ?? new Set<string>()
    const left = entries.filter(({ lesson }) => !finished.has(lesson.id))
    return {
      lessons: entries.length,
      completed: entries.length - left.length,
      requiredLeft: left.filter(({ module }) => module.required).length,
      minutesLeft: left.reduce((sum, { lesson }) => sum + lesson.minutes, 0),
    }
  }, [entries, done])

  const toggleLesson = (lessonId: string) => {
    if (!done) return
    const nowDone = !done.has(lessonId)
    const flip = (current: Set<string>, add: boolean) => {
      const next = new Set(current)
      if (add) next.add(lessonId)
      else next.delete(lessonId)
      return next
    }
    setSaveError(null)
    queryClient.setQueryData<TutorTraining>(queryKey, (old) =>
      old ? { ...old, done: flip(old.done, nowDone) } : old,
    )
    setLessonDone(userId, lessonId, nowDone).catch((error: unknown) => {
      queryClient.setQueryData<TutorTraining>(queryKey, (old) =>
        old ? { ...old, done: flip(old.done, !nowDone) } : old,
      )
      setSaveError(
        `Couldn’t save that: ${getErrorMessage(error, 'please try again.')}`,
      )
    })
  }

  const openLesson = (lessonId: string) => {
    setChosenId(lessonId)
    rememberLesson(userId, lessonId)
    setOutlineOpen(false)
    // Start the new lesson from its top when the old one was scrolled past.
    const top = lessonRef.current?.getBoundingClientRect().top ?? 0
    if (top < 0) {
      lessonRef.current?.scrollIntoView({
        block: 'start',
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      })
    }
  }

  if (trainingQuery.isPending) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm font-semibold text-slate-500">
        <RefreshCw className="mr-2 animate-spin" size={18} aria-hidden />{' '}
        Loading your training…
      </div>
    )
  }

  if (trainingQuery.isError || !course || !done) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center">
        <p className="font-bold text-slate-900 dark:text-white">
          Training couldn’t load.
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {getErrorMessage(trainingQuery.error, 'Please try again.')}
        </p>
        <button
          type="button"
          onClick={() => void trainingQuery.refetch()}
          className="mt-4 rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold text-white hover:bg-purple-700"
        >
          Try again
        </button>
      </div>
    )
  }

  const current =
    entries.find(({ lesson }) => lesson.id === chosenId) ??
    entries.find(({ lesson }) => !done.has(lesson.id)) ??
    entries[0]
  const position = current ? entries.indexOf(current) : -1
  const share = totals.lessons ? totals.completed / totals.lessons : 0

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <header className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-black tracking-tight text-slate-950 md:text-3xl dark:text-white">
            {totals.requiredLeft === 0
              ? 'Required training complete'
              : 'Get ready to teach'}
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-slate-500 dark:text-slate-400">
            {totals.requiredLeft === 0
              ? 'You’ve covered everything required. The optional lessons are here whenever you need them.'
              : `${totals.requiredLeft} required ${totals.requiredLeft === 1 ? 'lesson' : 'lessons'} left. Your progress saves to your account, and the admins can see it.`}
          </p>
        </div>
        {totals.lessons > 0 && (
          <div className="w-full sm:w-80">
            <p className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-bold text-slate-900 tabular-nums dark:text-white">
                {totals.completed} of {totals.lessons} lessons
              </span>
              <span className="text-xs text-slate-500 tabular-nums dark:text-slate-400">
                {totals.minutesLeft > 0
                  ? `about ${totals.minutesLeft} min left`
                  : 'all done'}
              </span>
            </p>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10"
              // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a styled bar; native <progress> can't be restyled consistently across browsers
              role="progressbar"
              aria-label="Training progress"
              aria-valuemin={0}
              aria-valuemax={totals.lessons}
              aria-valuenow={totals.completed}
            >
              <div
                className="h-full rounded-full bg-purple-600 transition-[width] duration-500 ease-out dark:bg-purple-400"
                style={{ width: `${share * 100}%` }}
              />
            </div>
          </div>
        )}
      </header>

      {saveError && (
        <p
          role="alert"
          className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-200"
        >
          {saveError}
        </p>
      )}

      {!current ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500 dark:border-white/15">
          No training has been published yet. Check back soon.
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="lg:sticky lg:top-4">
            <button
              type="button"
              onClick={() => setOutlineOpen((open) => !open)}
              aria-expanded={outlineOpen}
              aria-controls="training-outline"
              className="flex w-full items-center justify-between gap-4 rounded-2xl bg-white px-4 py-3 text-left ring-1 ring-slate-200 lg:hidden dark:bg-slate-900 dark:ring-white/10"
            >
              <span className="min-w-0">
                <span className="block text-xs text-slate-500 tabular-nums dark:text-slate-400">
                  Lesson {position + 1} of {entries.length}
                </span>
                <span className="block truncate font-bold text-slate-900 dark:text-white">
                  {current.lesson.title}
                </span>
              </span>
              <span className="shrink-0 text-sm font-bold text-purple-700 dark:text-purple-300">
                {outlineOpen ? 'Hide lessons' : 'All lessons'}
              </span>
            </button>
            <CourseOutline
              course={course}
              done={done}
              currentId={current.lesson.id}
              onOpen={openLesson}
              className={`${outlineOpen ? 'mt-3' : 'max-lg:hidden'} lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto lg:overscroll-contain`}
            />
          </div>

          <LessonView
            articleRef={lessonRef}
            entry={current}
            complete={done.has(current.lesson.id)}
            previous={entries[position - 1]}
            next={entries[position + 1]}
            onOpen={openLesson}
            onToggleDone={() => toggleLesson(current.lesson.id)}
          />
        </div>
      )}
    </div>
  )
}

// ── Outline ──────────────────────────────────────────────────────────────

function CourseOutline({
  course,
  done,
  currentId,
  onOpen,
  className,
}: {
  course: TrainingModule[]
  done: Set<string>
  currentId: string
  onOpen: (lessonId: string) => void
  className: string
}) {
  return (
    <nav
      id="training-outline"
      aria-label="Course outline"
      className={`rounded-2xl bg-white p-2 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-white/10 ${className}`}
    >
      <ol className="space-y-1">
        {course.map((module) => {
          const finished = module.lessons.filter((lesson) =>
            done.has(lesson.id),
          ).length
          return (
            <li key={module.id} className="pt-3 first:pt-2">
              <div className="flex items-baseline justify-between gap-3 px-3">
                <h2 className="text-[13px] leading-5 font-extrabold text-slate-900 dark:text-white">
                  {module.title}
                </h2>
                <span className="shrink-0 text-xs text-slate-400 tabular-nums">
                  {finished}/{module.lessons.length}
                </span>
              </div>
              {!module.required && (
                <p className="px-3 text-xs text-slate-400">Optional</p>
              )}
              {module.lessons.length === 0 ? (
                <p className="px-3 py-2 text-xs text-slate-400">
                  Lessons are on their way.
                </p>
              ) : (
                <ol className="mt-1.5 space-y-0.5">
                  {module.lessons.map((lesson) => (
                    <li key={lesson.id}>
                      <OutlineLesson
                        lesson={lesson}
                        complete={done.has(lesson.id)}
                        current={lesson.id === currentId}
                        onOpen={() => onOpen(lesson.id)}
                      />
                    </li>
                  ))}
                </ol>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function OutlineLesson({
  lesson,
  complete,
  current,
  onOpen,
}: {
  lesson: TrainingLesson
  complete: boolean
  current: boolean
  onOpen: () => void
}) {
  const kinds = new Set(lesson.materials.map((material) => material.kind))
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-current={current ? 'step' : undefined}
      className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
        current
          ? 'bg-purple-50 dark:bg-purple-500/15'
          : 'hover:bg-slate-100 dark:hover:bg-white/5'
      }`}
    >
      <span className="mt-px shrink-0">
        {complete ? (
          <CheckCircle2
            size={18}
            className="fill-emerald-500 text-white dark:text-slate-900"
            aria-label="Done"
          />
        ) : current ? (
          <span
            aria-hidden
            className="grid size-[18px] place-items-center rounded-full ring-2 ring-purple-600 ring-inset dark:ring-purple-300"
          >
            <span className="size-1.5 rounded-full bg-purple-600 dark:bg-purple-300" />
          </span>
        ) : (
          <Circle
            size={18}
            className="text-slate-300 dark:text-slate-600"
            aria-hidden
          />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`block text-sm leading-5 ${
            current
              ? 'font-bold text-purple-950 dark:text-white'
              : 'font-semibold text-slate-700 dark:text-slate-200'
          }`}
        >
          {lesson.title}
        </span>
        <span className="mt-1 flex items-center gap-2.5 text-xs text-slate-400">
          <span className="tabular-nums">{lesson.minutes} min</span>
          {kinds.has('video') && (
            <PlayCircle size={13} aria-label="Has video" />
          )}
          {kinds.has('image') && (
            <ImageIcon size={13} aria-label="Has pictures" />
          )}
          {kinds.has('document') && (
            <FileText size={13} aria-label="Has documents" />
          )}
        </span>
      </span>
    </button>
  )
}

// ── Lesson ───────────────────────────────────────────────────────────────

const sectionHeading =
  'text-base font-extrabold tracking-tight text-slate-900 dark:text-white'

function LessonView({
  articleRef,
  entry,
  complete,
  previous,
  next,
  onOpen,
  onToggleDone,
}: {
  articleRef: Ref<HTMLElement>
  entry: Entry
  complete: boolean
  previous: Entry | undefined
  next: Entry | undefined
  onOpen: (lessonId: string) => void
  onToggleDone: () => void
}) {
  const { lesson, module, index } = entry
  const { urlOf, error: filesError } = useMaterialUrls(lesson.materials)
  const videos = lesson.materials.filter((m) => m.kind === 'video')
  const images = lesson.materials.filter((m) => m.kind === 'image')
  const documents = lesson.materials.filter((m) => m.kind === 'document')

  const finishAndContinue = () => {
    if (!complete) onToggleDone()
    if (next) onOpen(next.lesson.id)
  }

  return (
    <article
      ref={articleRef}
      aria-labelledby="training-lesson-title"
      className="min-w-0 scroll-mt-4 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-white/10"
    >
      {videos.length > 0 && (
        <LessonVideos key={lesson.id} videos={videos} urlOf={urlOf} />
      )}

      <div key={`body-${lesson.id}`} className="px-5 py-7 md:px-10 md:py-9">
        <h2
          id="training-lesson-title"
          className="text-2xl font-black tracking-tight text-balance text-slate-950 md:text-[30px] md:leading-[1.15] dark:text-white"
        >
          {lesson.title}
        </h2>
        <p className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
          <span>{module.title}</span>
          <span aria-hidden>·</span>
          <span className="tabular-nums">
            Lesson {index + 1} of {module.lessons.length}
          </span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Clock3 size={13} aria-hidden /> {lesson.minutes} min
          </span>
          {!module.required && (
            <>
              <span aria-hidden>·</span>
              <span>Optional</span>
            </>
          )}
          {complete && (
            <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
              <Check size={12} aria-hidden /> Done
            </span>
          )}
        </p>

        {lesson.summary && (
          <p className="mt-6 max-w-[65ch] text-[17px] leading-7 text-slate-700 dark:text-slate-200">
            {lesson.summary}
          </p>
        )}

        {lesson.points.length > 0 && (
          <section className="mt-9" aria-labelledby="training-points">
            <h3 id="training-points" className={sectionHeading}>
              Key points
            </h3>
            <ul className="mt-3.5 max-w-[65ch] space-y-3">
              {lesson.points.map((point) => (
                <li
                  key={point}
                  className="flex gap-3 text-[15px] leading-6 text-slate-700 dark:text-slate-200"
                >
                  <span
                    aria-hidden
                    className="mt-[9px] size-1.5 shrink-0 rounded-full bg-purple-500"
                  />
                  {point}
                </li>
              ))}
            </ul>
          </section>
        )}

        {images.length > 0 && (
          <section className="mt-10" aria-labelledby="training-pictures">
            <h3 id="training-pictures" className={`${sectionHeading} mb-4`}>
              {images.length === 1 ? 'Picture' : 'Pictures'}
            </h3>
            <LessonImages images={images} urlOf={urlOf} />
          </section>
        )}

        {documents.length > 0 && (
          <section className="mt-10" aria-labelledby="training-documents">
            <h3 id="training-documents" className={`${sectionHeading} mb-4`}>
              {documents.length === 1 ? 'Document' : 'Documents'}
            </h3>
            <LessonDocuments documents={documents} urlOf={urlOf} />
          </section>
        )}

        {lesson.links.length > 0 && (
          <section className="mt-10" aria-labelledby="training-links">
            <h3 id="training-links" className={`${sectionHeading} mb-3`}>
              Read more
            </h3>
            <ul className="flex flex-wrap gap-2">
              {lesson.links.map((link) => {
                const className =
                  'inline-flex items-center gap-1.5 rounded-xl bg-purple-50 px-3 py-2 text-sm font-bold text-purple-700 hover:bg-purple-100 dark:bg-purple-500/10 dark:text-purple-200 dark:hover:bg-purple-500/20'
                return (
                  <li key={link.href}>
                    {/^https?:\/\//i.test(link.href) ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                        className={className}
                      >
                        {link.label} <ExternalLink size={13} aria-hidden />
                      </a>
                    ) : (
                      <Link
                        to={link.href}
                        target="_blank"
                        className={className}
                      >
                        {link.label} <ExternalLink size={13} aria-hidden />
                      </Link>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        {filesError && (
          <p
            role="alert"
            className="mt-8 text-sm text-rose-700 dark:text-rose-300"
          >
            Some files couldn’t load:{' '}
            {getErrorMessage(filesError, 'please refresh the page.')}
          </p>
        )}
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 md:px-10 dark:border-white/10 dark:bg-white/[0.03]">
        {previous ? (
          <button
            type="button"
            onClick={() => onOpen(previous.lesson.id)}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <ArrowLeft size={16} aria-hidden /> Previous
          </button>
        ) : (
          <span />
        )}
        <div className="flex flex-wrap justify-end gap-2">
          {complete ? (
            <>
              <button
                type="button"
                aria-pressed
                onClick={onToggleDone}
                title="Mark as not done"
                className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-50 dark:text-emerald-300 dark:ring-emerald-500/30 dark:hover:bg-emerald-500/10"
              >
                <CheckCircle2 size={16} aria-hidden /> Completed
                <span className="sr-only">(mark as not done)</span>
              </button>
              {next && (
                <button
                  type="button"
                  onClick={() => onOpen(next.lesson.id)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-purple-700"
                >
                  Next lesson <ArrowRight size={16} aria-hidden />
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={finishAndContinue}
              className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-purple-700"
            >
              {next ? (
                <>
                  Mark done and continue <ArrowRight size={16} aria-hidden />
                </>
              ) : (
                <>
                  <Check size={16} aria-hidden /> Mark as done
                </>
              )}
            </button>
          )}
        </div>
      </footer>
    </article>
  )
}
