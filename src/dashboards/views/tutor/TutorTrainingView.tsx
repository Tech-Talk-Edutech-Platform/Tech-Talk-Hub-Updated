import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock3,
  ExternalLink,
  GraduationCap,
  RefreshCw,
} from 'lucide-react'

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

export default function TutorTrainingView({ userId }: { userId: string }) {
  const queryClient = useQueryClient()
  const queryKey = queryKeys.training.progress(userId)
  const trainingQuery = useQuery({
    queryKey,
    queryFn: () => loadTutorTraining(userId),
  })
  // null: all closed; undefined: not chosen yet (open the first unfinished).
  const [openChoice, setOpenChoice] = useState<string | null | undefined>(
    undefined,
  )
  const [saveError, setSaveError] = useState<string | null>(null)

  const course = trainingQuery.data?.course
  const done = trainingQuery.data?.done

  const toggleLesson = (lessonId: string) => {
    if (!done) return
    const nowDone = !done.has(lessonId)
    const update = (current: Set<string>) => {
      const next = new Set(current)
      if (nowDone) next.add(lessonId)
      else next.delete(lessonId)
      return next
    }
    const revert = (current: Set<string>) => {
      const next = new Set(current)
      if (nowDone) next.delete(lessonId)
      else next.add(lessonId)
      return next
    }
    setSaveError(null)
    queryClient.setQueryData<TutorTraining>(queryKey, (old) =>
      old ? { ...old, done: update(old.done) } : old,
    )
    setLessonDone(userId, lessonId, nowDone).catch((error: unknown) => {
      queryClient.setQueryData<TutorTraining>(queryKey, (old) =>
        old ? { ...old, done: revert(old.done) } : old,
      )
      setSaveError(
        `Couldn’t save that: ${getErrorMessage(error, 'please try again.')}`,
      )
    })
  }

  const totals = useMemo(() => {
    const modules = course ?? []
    const finished = done ?? new Set<string>()
    const lessons = modules.flatMap((module) => module.lessons)
    const requiredLessons = modules
      .filter((module) => module.required)
      .flatMap((module) => module.lessons)
    return {
      lessons: lessons.length,
      completed: lessons.filter((lesson) => finished.has(lesson.id)).length,
      requiredLeft: requiredLessons.filter((lesson) => !finished.has(lesson.id))
        .length,
      minutesLeft: lessons
        .filter((lesson) => !finished.has(lesson.id))
        .reduce((sum, lesson) => sum + lesson.minutes, 0),
    }
  }, [course, done])

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

  const openModule =
    openChoice === undefined
      ? (course.find((module) =>
          module.lessons.some((lesson) => !done.has(lesson.id)),
        )?.id ?? null)
      : openChoice
  const share = totals.lessons ? totals.completed / totals.lessons : 0

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <header className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm md:p-8 dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-purple-500/10 px-3 py-1 text-xs font-bold tracking-wider text-purple-600 uppercase dark:text-purple-300">
              <GraduationCap size={14} aria-hidden /> Tutor training
            </p>
            <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
              {totals.requiredLeft === 0
                ? 'Required training complete 🎉'
                : 'Get ready to teach'}
            </h1>
            <p className="mt-1 max-w-xl text-sm text-slate-500 dark:text-slate-400">
              {totals.requiredLeft === 0
                ? 'You’ve covered everything required. The optional modules are there whenever you need them.'
                : `${totals.requiredLeft} required ${totals.requiredLeft === 1 ? 'lesson' : 'lessons'} left. Tick each lesson off as you finish it.`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black text-slate-950 tabular-nums dark:text-white">
              {totals.completed}
              <span className="text-base font-bold text-slate-400">
                /{totals.lessons}
              </span>
            </p>
            <p className="text-xs text-slate-500">
              lessons · about {totals.minutesLeft} min left
            </p>
          </div>
        </div>
        <div
          className="mt-5 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"
          // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a styled bar; native <progress> can't be restyled consistently across browsers
          role="progressbar"
          aria-label="Training progress"
          aria-valuemin={0}
          aria-valuemax={totals.lessons}
          aria-valuenow={totals.completed}
        >
          <div
            className="h-full rounded-full bg-purple-600 transition-[width] duration-500 dark:bg-purple-400"
            style={{ width: `${share * 100}%` }}
          />
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Your progress is saved to your account, and the admins can see it.
        </p>
        {saveError && (
          <p
            role="alert"
            className="mt-2 text-xs font-semibold text-rose-600 dark:text-rose-300"
          >
            {saveError}
          </p>
        )}
      </header>

      {course.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500 dark:border-white/10">
          No training has been published yet. Check back soon.
        </p>
      ) : (
        <ol className="space-y-4">
          {course.map((module, index) => (
            <ModuleCard
              key={module.id}
              number={index + 1}
              module={module}
              done={done}
              open={openModule === module.id}
              onToggleOpen={() =>
                setOpenChoice(openModule === module.id ? null : module.id)
              }
              onToggleLesson={toggleLesson}
            />
          ))}
        </ol>
      )}
    </div>
  )
}

function ModuleCard({
  number,
  module,
  done,
  open,
  onToggleOpen,
  onToggleLesson,
}: {
  number: number
  module: TrainingModule
  done: Set<string>
  open: boolean
  onToggleOpen: () => void
  onToggleLesson: (lessonId: string) => void
}) {
  const completed = module.lessons.filter((lesson) => done.has(lesson.id))
  const finished =
    module.lessons.length > 0 && completed.length === module.lessons.length
  const panelId = `training-module-${module.id}`

  return (
    <li className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900">
      <button
        type="button"
        onClick={onToggleOpen}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-4 p-5 text-left hover:bg-slate-50 dark:hover:bg-white/5"
      >
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black ${
            finished
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
              : 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-200'
          }`}
        >
          {finished ? <CheckCircle2 size={20} aria-hidden /> : number}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2 font-extrabold text-slate-900 dark:text-white">
            {module.title}
            {module.required ? (
              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 uppercase dark:bg-rose-500/10 dark:text-rose-300">
                Required
              </span>
            ) : (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 uppercase dark:bg-white/10 dark:text-slate-300">
                Optional
              </span>
            )}
          </span>
          <span className="block text-sm text-slate-500 dark:text-slate-400">
            {module.description}
          </span>
        </span>
        <span className="hidden shrink-0 text-xs font-bold text-slate-500 tabular-nums sm:block">
          {completed.length}/{module.lessons.length}
        </span>
        <ChevronDown
          size={18}
          aria-hidden
          className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <ul
          id={panelId}
          className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-white/10 dark:border-white/10"
        >
          {module.lessons.length === 0 && (
            <li className="p-5 text-sm text-slate-500">
              Lessons for this module are on their way.
            </li>
          )}
          {module.lessons.map((lesson) => (
            <LessonRow
              key={lesson.id}
              lesson={lesson}
              complete={done.has(lesson.id)}
              onToggle={() => onToggleLesson(lesson.id)}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

function LessonRow({
  lesson,
  complete,
  onToggle,
}: {
  lesson: TrainingLesson
  complete: boolean
  onToggle: () => void
}) {
  return (
    <li className="flex gap-4 p-5">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={complete}
        aria-label={
          complete
            ? `Mark “${lesson.title}” as not done`
            : `Mark “${lesson.title}” as done`
        }
        className="mt-0.5 h-fit shrink-0 rounded-full text-slate-300 hover:text-purple-500 dark:text-slate-600"
      >
        {complete ? (
          <CheckCircle2 size={22} className="text-emerald-500" aria-hidden />
        ) : (
          <Circle size={22} aria-hidden />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span
            className={`font-bold ${complete ? 'text-slate-500 line-through decoration-slate-300' : 'text-slate-900 dark:text-white'}`}
          >
            {lesson.title}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
            <Clock3 size={12} aria-hidden /> {lesson.minutes} min
          </span>
        </p>
        {lesson.summary && (
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {lesson.summary}
          </p>
        )}
        {lesson.points.length > 0 && (
          <ul className="mt-3 space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
            {lesson.points.map((point) => (
              <li key={point} className="flex gap-2">
                <span aria-hidden className="text-purple-500">
                  •
                </span>
                {point}
              </li>
            ))}
          </ul>
        )}
        {lesson.links.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {lesson.links.map((link) =>
              /^https?:\/\//i.test(link.href) ? (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700 hover:bg-purple-100 dark:bg-purple-500/10 dark:text-purple-200"
                >
                  {link.label} <ExternalLink size={12} aria-hidden />
                </a>
              ) : (
                <Link
                  key={link.href}
                  to={link.href}
                  target="_blank"
                  className="inline-flex items-center gap-1 rounded-lg bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700 hover:bg-purple-100 dark:bg-purple-500/10 dark:text-purple-200"
                >
                  {link.label} <ExternalLink size={12} aria-hidden />
                </Link>
              ),
            )}
          </div>
        )}
      </div>
    </li>
  )
}
