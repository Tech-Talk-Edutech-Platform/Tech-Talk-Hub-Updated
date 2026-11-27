import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Clock,
  Flag,
  Loader2,
  Paperclip,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'react-hot-toast'

import { getErrorMessage } from '../../../lib/getErrorMessage'
import {
  EXAM_FILE_TYPES,
  examKeys,
  examOptions,
  saveAnswer,
  startExam,
  submitExam,
  uploadExamFile,
  type ExamSitting,
} from '../../../features/exams/examsApi'

type StudentExamProps = {
  userId: string
  examId: string
  onExit: () => void
}

/** Typed answers wait this long after the last key before saving. */
const SAVE_DELAY_MS = 800

function clock(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const rest = String(safe % 60).padStart(2, '0')
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${rest}`
    : `${minutes}:${rest}`
}

function initialAnswers(sitting: ExamSitting) {
  const answers: Record<string, string> = {}
  for (const [questionId, saved] of Object.entries(sitting.answers)) {
    if (saved) answers[questionId] = saved.answer
  }
  return answers
}

function CenteredMessage({
  title,
  body,
  children,
}: {
  title: string
  body: string
  children?: ReactNode
}) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <AlertTriangle className="text-amber-500" size={44} aria-hidden="true" />
      <div>
        <p className="text-lg font-black text-slate-800 dark:text-white">
          {title}
        </p>
        <p className="mx-auto mt-1 max-w-sm text-sm font-medium text-slate-500 dark:text-slate-400">
          {body}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">{children}</div>
    </div>
  )
}

/**
 * Sitting an exam. The deadline comes from the database (start time plus the
 * exam's length, or when the exam closes), answers save as the student works,
 * and time running out hands the exam in.
 */
export default function StudentExam({
  userId,
  examId,
  onExit,
}: StudentExamProps) {
  const client = useQueryClient()
  const sitting = useQuery({
    queryKey: ['exams', 'sitting', examId],
    queryFn: () => startExam(examId),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  })

  const [currentIdx, setCurrentIdx] = useState(0)
  const [edited, setEdited] = useState<Record<string, string>>({})
  const [flags, setFlags] = useState<Record<string, boolean | undefined>>({})
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'error'>(
    'idle',
  )
  const [confirming, setConfirming] = useState(false)
  const [handedIn, setHandedIn] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const pending = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const unsaved = useRef(new Map<string, string>())

  const data = sitting.data
  const attemptId = data?.attempt.id ?? ''
  const answers = data ? { ...initialAnswers(data), ...edited } : edited
  const deadline = data ? Date.parse(data.attempt.deadline) : Number.NaN
  const secondsLeft = data
    ? (deadline - (now + data.clockOffsetMs)) / 1000
    : Number.POSITIVE_INFINITY
  const finished = handedIn || Boolean(data?.attempt.end_time)

  const persist = async (questionId: string, value: string) => {
    setSaveState('saving')
    try {
      await saveAnswer(attemptId, questionId, value)
      if (unsaved.current.get(questionId) === value) {
        unsaved.current.delete(questionId)
      }
      setSaveState(unsaved.current.size > 0 ? 'saving' : 'idle')
    } catch (error) {
      setSaveState('error')
      toast.error(getErrorMessage(error, 'Your answer didn’t save.'))
    }
  }

  /** Saves every answer still waiting on its timer. */
  const flush = async () => {
    for (const timer of pending.current.values()) clearTimeout(timer)
    pending.current.clear()
    await Promise.all(
      [...unsaved.current].map(([questionId, value]) =>
        persist(questionId, value),
      ),
    )
  }

  const handIn = useMutation({
    mutationFn: async () => {
      await flush()
      await submitExam(attemptId)
    },
    onSuccess: () => {
      setHandedIn(true)
      setConfirming(false)
      void client.invalidateQueries({ queryKey: examKeys.mine(userId) })
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'The exam couldn’t be handed in.')),
  })

  const upload = useMutation({
    mutationFn: ({ questionId, file }: { questionId: string; file: File }) =>
      uploadExamFile(userId, attemptId, questionId, file),
    onSuccess: (_path, { questionId, file }) => {
      setEdited((current) => ({ ...current, [questionId]: file.name }))
      toast.success('File uploaded.')
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'The file didn’t upload.')),
  })

  // The countdown.
  useEffect(() => {
    if (!data || finished) return undefined
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [data, finished])

  // Time's up: hand in what's saved.
  const timeUp = Boolean(data) && !finished && secondsLeft <= 0
  useEffect(() => {
    if (timeUp && !handIn.isPending && !handIn.isError) {
      toast.error('Time is up. Handing in your exam…', { duration: 5000 })
      handIn.mutate()
    }
  }, [timeUp, handIn])

  // Typed answers still waiting on their timer save even after the student
  // leaves this page: the timers aren't cancelled on unmount.

  const answerTyped = (questionId: string, value: string) => {
    setEdited((current) => ({ ...current, [questionId]: value }))
    unsaved.current.set(questionId, value)
    const waiting = pending.current.get(questionId)
    if (waiting) clearTimeout(waiting)
    pending.current.set(
      questionId,
      setTimeout(() => {
        pending.current.delete(questionId)
        void persist(questionId, value)
      }, SAVE_DELAY_MS),
    )
  }

  const answerChosen = (questionId: string, value: string) => {
    setEdited((current) => ({ ...current, [questionId]: value }))
    unsaved.current.set(questionId, value)
    void persist(questionId, value)
  }

  if (sitting.isPending) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3">
        <Loader2
          className="animate-spin text-indigo-600"
          size={36}
          aria-hidden="true"
        />
        <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
          Opening your exam…
        </span>
      </div>
    )
  }

  if (sitting.isError) {
    return (
      <CenteredMessage
        title="This exam can’t be opened"
        body={getErrorMessage(sitting.error, 'Something went wrong.')}
      >
        <button
          type="button"
          onClick={() => void sitting.refetch()}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700"
        >
          <RefreshCw size={16} aria-hidden="true" /> Try again
        </button>
        <button
          type="button"
          onClick={onExit}
          className="rounded-xl bg-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-300 dark:bg-white/10 dark:text-white"
        >
          Back to exams
        </button>
      </CenteredMessage>
    )
  }

  const { exam, questions } = sitting.data

  if (finished) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 p-6 text-center">
        <CheckCircle
          className="text-emerald-500"
          size={48}
          aria-hidden="true"
        />
        <div>
          <p className="text-xl font-black text-slate-900 dark:text-white">
            {exam.title} is handed in
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
            Your answers are saved. Your score shows under Grades once your
            teachers have marked it and published the results.
          </p>
        </div>
        <button
          type="button"
          onClick={onExit}
          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700"
        >
          Back to exams
        </button>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <CenteredMessage
        title="This exam is empty"
        body="It has no questions yet. Ask your teacher."
      >
        <button
          type="button"
          onClick={onExit}
          className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-bold text-white dark:bg-white/10"
        >
          Back to exams
        </button>
      </CenteredMessage>
    )
  }

  const question = questions[Math.min(currentIdx, questions.length - 1)]
  const answeredCount = questions.filter(
    (q) => (answers[q.id] ?? '').trim() !== '',
  ).length

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col bg-slate-50 text-gray-900 md:flex-row dark:bg-dashboard-night dark:text-white">
      <aside className="flex flex-col justify-between border-b border-slate-100 bg-white p-6 md:w-72 md:border-r md:border-b-0 dark:border-white/10 dark:bg-white/5">
        <div>
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  'Leave the exam? Your answers are saved, but the timer keeps running.',
                )
              ) {
                void flush().then(onExit)
              }
            }}
            className="mb-6 flex items-center gap-2 text-xs font-bold text-slate-500 uppercase hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft size={14} aria-hidden="true" /> Leave exam
          </button>

          <h2 className="mb-4 text-xs font-black tracking-wider text-slate-900 uppercase dark:text-white">
            Questions
          </h2>
          <div className="grid grid-cols-6 gap-2 md:grid-cols-4">
            {questions.map((q, idx) => {
              const isAnswered = (answers[q.id] ?? '').trim() !== ''
              const isCurrent = q.id === question.id
              return (
                <button
                  key={q.id}
                  type="button"
                  aria-label={`Question ${idx + 1}${isAnswered ? ', answered' : ''}${flags[q.id] ? ', flagged' : ''}`}
                  aria-current={isCurrent ? 'step' : undefined}
                  onClick={() => setCurrentIdx(idx)}
                  className={`flex h-11 w-11 items-center justify-center rounded-xl border text-sm font-black transition active:scale-95 ${
                    isCurrent
                      ? 'ring-2 ring-indigo-600 ring-offset-2 dark:ring-offset-slate-900'
                      : ''
                  } ${
                    flags[q.id]
                      ? 'border-amber-500 bg-amber-400 text-white shadow-xs'
                      : isAnswered
                        ? 'border-emerald-600 bg-emerald-500 text-white'
                        : 'border-slate-100 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
                  }`}
                >
                  {idx + 1}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-6 space-y-2 rounded-2xl bg-slate-50 p-4 text-[11px] font-bold text-slate-500 dark:bg-white/5 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm bg-emerald-500" /> Answered
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm bg-amber-400" /> Flagged to check
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm border bg-slate-50 dark:border-white/20 dark:bg-white/10" />{' '}
            Not answered
          </div>
        </div>
      </aside>

      <main className="flex flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-white px-6 py-5 shadow-xs md:px-8 dark:border-white/10 dark:bg-white/5">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-black tracking-tight text-slate-900 dark:text-white">
              {exam.title}
            </h1>
            <p className="text-xs font-bold text-slate-400" aria-live="polite">
              {saveState === 'saving'
                ? 'Saving…'
                : saveState === 'error'
                  ? 'Last answer didn’t save. Keep going; it retries when you change it.'
                  : `All answers saved · ${answeredCount} of ${questions.length} answered`}
            </p>
          </div>
          <div
            role="timer"
            aria-label="Time left"
            className={`flex items-center gap-2 rounded-2xl border px-5 py-2 font-mono text-sm font-black shadow-xs transition-all ${
              secondsLeft < 120
                ? 'animate-pulse border-red-100 bg-red-50 text-red-600'
                : 'border-transparent bg-slate-900 text-white dark:bg-white/10'
            }`}
          >
            <Clock size={16} aria-hidden="true" />
            {clock(secondsLeft)}
          </div>
        </header>

        <section className="mx-auto w-full max-w-4xl flex-1 overflow-y-auto p-6 md:p-8">
          <div className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-xs md:p-8 dark:border-white/10 dark:bg-white/5">
            <span className="rounded-lg bg-indigo-50 px-3 py-1 text-[10px] font-black tracking-widest text-indigo-600 uppercase dark:bg-indigo-500/10">
              Question {questions.indexOf(question) + 1} of {questions.length} ·{' '}
              {question.marks} {question.marks === 1 ? 'mark' : 'marks'}
            </span>
            <h2 className="mt-4 mb-8 text-xl leading-relaxed font-bold whitespace-pre-wrap text-slate-800 dark:text-white">
              {question.question_text}
            </h2>

            {question.type === 'mcq' && (
              <div className="space-y-3">
                {examOptions(question.options).map((option) => {
                  const isChecked = answers[question.id] === option
                  return (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={isChecked}
                      onClick={() => answerChosen(question.id, option)}
                      className={`block w-full rounded-2xl border-2 p-4 text-left text-sm font-medium transition-all active:scale-[0.99] ${
                        isChecked
                          ? 'border-indigo-600 bg-indigo-50/50 font-bold text-indigo-900 dark:bg-indigo-500/10 dark:text-indigo-300'
                          : 'border-slate-100 text-slate-600 hover:bg-slate-50/80 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5'
                      }`}
                    >
                      {option}
                    </button>
                  )
                })}
              </div>
            )}

            {(question.type === 'short' || question.type === 'debug') && (
              <>
                <label htmlFor={`answer-${question.id}`} className="sr-only">
                  Your answer
                </label>
                <textarea
                  id={`answer-${question.id}`}
                  className={`w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 p-5 text-sm text-slate-700 shadow-inner outline-hidden transition placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:bg-white/10 ${
                    question.type === 'debug' ? 'font-mono' : 'font-medium'
                  }`}
                  rows={question.type === 'debug' ? 12 : 6}
                  spellCheck={question.type !== 'debug'}
                  value={answers[question.id] ?? ''}
                  placeholder={
                    question.type === 'debug'
                      ? 'Write or fix the code here…'
                      : 'Type your answer here…'
                  }
                  onChange={(event) =>
                    answerTyped(question.id, event.target.value)
                  }
                />
              </>
            )}

            {question.type === 'file' && (
              <div className="space-y-3">
                <label
                  htmlFor={`answer-file-${question.id}`}
                  className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600 transition focus-within:border-indigo-500 hover:border-indigo-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                >
                  {upload.isPending ? (
                    <Loader2
                      className="animate-spin text-indigo-600"
                      size={24}
                      aria-hidden="true"
                    />
                  ) : (
                    <Paperclip
                      className="text-indigo-600"
                      size={24}
                      aria-hidden="true"
                    />
                  )}
                  <span className="font-bold">
                    {upload.isPending
                      ? 'Uploading…'
                      : answers[question.id]
                        ? `Uploaded: ${answers[question.id]} (choose another to replace it)`
                        : 'Choose a file to upload'}
                  </span>
                  <span className="text-xs text-slate-400">
                    PDF, image, Word, text or ZIP, up to 20 MB
                  </span>
                  <input
                    id={`answer-file-${question.id}`}
                    type="file"
                    accept={EXAM_FILE_TYPES.join(',')}
                    disabled={upload.isPending}
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      event.target.value = ''
                      if (file) upload.mutate({ questionId: question.id, file })
                    }}
                  />
                </label>
              </div>
            )}
          </div>

          {confirming && (
            <div
              role="alertdialog"
              aria-labelledby="hand-in-title"
              className="mt-6 rounded-3xl border border-indigo-200 bg-indigo-50 p-6 dark:border-indigo-500/30 dark:bg-indigo-500/10"
            >
              <p
                id="hand-in-title"
                className="font-black text-slate-900 dark:text-white"
              >
                Hand in your exam?
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                You’ve answered {answeredCount} of {questions.length} questions.
                You can’t change your answers after handing in.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={handIn.isPending}
                  onClick={() => handIn.mutate()}
                  className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-black tracking-wider text-white uppercase hover:bg-indigo-700 disabled:opacity-60"
                >
                  {handIn.isPending ? (
                    <Loader2
                      size={14}
                      className="animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <CheckCircle size={14} aria-hidden="true" />
                  )}
                  Hand in now
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="rounded-xl px-5 py-2.5 text-xs font-black tracking-wider text-slate-600 uppercase hover:bg-white dark:text-slate-300 dark:hover:bg-white/10"
                >
                  Keep working
                </button>
              </div>
            </div>
          )}
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white px-6 py-5 shadow-lg md:px-8 dark:border-white/10 dark:bg-white/5">
          <button
            type="button"
            aria-pressed={Boolean(flags[question.id])}
            onClick={() =>
              setFlags((current) => ({
                ...current,
                [question.id]: !current[question.id],
              }))
            }
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black tracking-wider uppercase transition ${
              flags[question.id]
                ? 'bg-amber-400 text-white'
                : 'text-amber-600 hover:bg-amber-50 dark:hover:bg-white/5'
            }`}
          >
            <Flag
              size={16}
              className={flags[question.id] ? 'fill-white' : ''}
              aria-hidden="true"
            />
            Flag to check
          </button>

          <div className="flex gap-3">
            <button
              type="button"
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx((index) => index - 1)}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-black tracking-wider text-slate-600 uppercase hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
            >
              Previous
            </button>
            {currentIdx < questions.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentIdx((index) => index + 1)}
                className="rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-black tracking-wider text-white uppercase hover:bg-slate-800 dark:bg-white/10 dark:hover:bg-white/20"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                disabled={handIn.isPending}
                onClick={() => setConfirming(true)}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-black tracking-wider text-white uppercase shadow-md hover:bg-indigo-700"
              >
                <CheckCircle size={14} aria-hidden="true" /> Hand in
              </button>
            )}
          </div>
        </footer>
      </main>
    </div>
  )
}
