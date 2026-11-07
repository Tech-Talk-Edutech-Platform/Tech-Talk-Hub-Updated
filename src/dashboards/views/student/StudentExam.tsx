import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Clock,
  Flag,
  CheckCircle,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import type { User } from '@supabase/supabase-js'
import { getErrorMessage } from '../../../lib/getErrorMessage'
import {
  examOptions,
  loadExamSession,
  saveExamAnswer,
  submitExamAttempt,
} from '../../../features/assessments/exams/examSession'
import type {
  Exam,
  ExamAttempt,
  ExamQuestion,
} from '../../../features/assessments/exams/examSession'

interface ExamPageProps {
  user: User | null
}

export default function ExamPage({ user }: ExamPageProps) {
  const { id } = useParams()
  const navigate = useNavigate()
  const userId = user?.id

  // Core Data States
  const [exam, setExam] = useState<Exam | null>(null)
  const [questions, setQuestions] = useState<ExamQuestion[]>([])
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null)

  // UI Engine States
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string | undefined>>({})
  const [flags, setFlags] = useState<Record<string, boolean | undefined>>({})

  const [timeLeft, setTimeLeft] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEmpty, setIsEmpty] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  // Bumped by the Retry button to run the loader again
  const [loadRequest, setLoadRequest] = useState(0)

  // 1. Core Fetcher Framework
  useEffect(() => {
    if (!id || !userId) return undefined

    let cancelled = false
    // A 10-second safety timeout so a stalled network doesn't hang the page
    const timeout = setTimeout(() => {
      if (cancelled) return
      setTimedOut(true)
      setLoading(false)
      toast.error('Network synchronization took too long.')
    }, 10000)

    loadExamSession(id, userId).then(
      (session) => {
        if (cancelled) return
        clearTimeout(timeout)
        setTimedOut(false)
        setExam(session.exam)
        setTimeLeft(session.exam.duration_minutes * 60)
        setQuestions(session.questions)
        setIsEmpty(session.questions.length === 0)
        setAttempt(session.attempt)
        setAnswers(session.answers)
        setLoading(false)
      },
      (err: unknown) => {
        if (cancelled) return
        clearTimeout(timeout)
        setTimedOut(false)
        console.error(err)
        toast.error(getErrorMessage(err, 'Initialization error occurred.'))
        setLoading(false)
      },
    )

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
    // oxlint-disable-next-line react/exhaustive-effect-dependencies -- loadRequest is the Retry trigger: bumping it re-runs this load
  }, [id, userId, loadRequest])

  // 2. Evaluation Engine & Submission Handler
  const submitExam = useCallback(async () => {
    if (!attempt || isSubmitting) return
    setIsSubmitting(true)

    try {
      const computedScore = await submitExamAttempt(attempt.id, questions)

      toast.success('Exam submitted safely!')
      alert(`Exam complete! Your recorded score is: ${computedScore}`)
      void navigate(-1)
    } catch (err) {
      toast.error(`Submission failed: ${getErrorMessage(err, 'Unknown error')}`)
    } finally {
      setIsSubmitting(false)
    }
  }, [attempt, questions, isSubmitting, navigate])

  // 3. Timer Heartbeat Hook
  useEffect(() => {
    if (!attempt || !exam || isSubmitting || questions.length === 0) {
      return undefined
    }

    const interval = setInterval(() => {
      const elapsedSeconds =
        (Date.now() - new Date(attempt.start_time).getTime()) / 1000
      const remainingTime = exam.duration_minutes * 60 - elapsedSeconds

      setTimeLeft(Math.max(0, remainingTime))

      if (remainingTime <= 0) {
        clearInterval(interval)
        toast.error('Time is up! Submitting answers immediately...', {
          duration: 5000,
        })
        void submitExam()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [attempt, exam, submitExam, isSubmitting, questions.length])

  // 4. Persistence Mutator for Database State Upserts
  const saveAnswerToDB = async (questionId: string, responseValue: string) => {
    if (!attempt) return

    setAnswers((prev) => ({ ...prev, [questionId]: responseValue }))

    try {
      await saveExamAnswer(attempt.id, questionId, responseValue)
    } catch (error) {
      console.error('Answer failed to sync: ', error)
      toast.error('Network sync lag detected.')
    }
  }

  const toggleFlag = (qId: string) =>
    setFlags((prev) => ({ ...prev, [qId]: !prev[qId] }))

  const retryLoad = () => {
    setTimedOut(false)
    setLoading(true)
    setLoadRequest((n) => n + 1)
  }

  // Guard: Handle missing ID
  if (!id)
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-dashboard-night">
        <AlertTriangle className="text-amber-500" size={48} />
        <div className="text-center">
          <p className="text-lg font-black text-slate-800 dark:text-white">
            No Exam Selected
          </p>
          <p className="mt-1 max-w-xs text-sm font-medium text-slate-400">
            Please select an assessment to view and start taking it.
          </p>
        </div>
        <button
          onClick={() => void navigate(-1)}
          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700"
        >
          Go Back
        </button>
      </div>
    )

  // Guard: Make sure user actually exists
  if (!user)
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-dashboard-night">
        <Loader2 className="animate-spin text-indigo-600" size={36} />
        <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
          Authenticating user credentials...
        </span>
      </div>
    )

  // Timeout Fallback View
  if (timedOut)
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-dashboard-night">
        <AlertTriangle className="text-amber-500" size={48} />
        <div className="text-center">
          <p className="text-lg font-black text-slate-800 dark:text-white">
            Connection Timed Out
          </p>
          <p className="mt-1 max-w-xs text-sm font-medium text-slate-400">
            We couldn't connect to the assessment server in time.
          </p>
        </div>
        <div className="mt-2 flex gap-3">
          <button
            onClick={retryLoad}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700"
          >
            <RefreshCw size={16} /> Retry
          </button>
          <button
            onClick={() => void navigate(-1)}
            className="rounded-xl bg-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-300 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
          >
            Go Back
          </button>
        </div>
      </div>
    )

  // Absolute fallback layer handling empty DB configurations cleanly
  if (isEmpty || (!loading && questions.length === 0))
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-dashboard-night">
        <AlertTriangle className="text-amber-500" size={48} />
        <div className="text-center">
          <p className="text-lg font-black text-slate-800 dark:text-white">
            Exam Is Empty
          </p>
          <p className="mt-1 max-w-xs text-sm font-medium text-slate-400">
            This assessment doesn't contain any questions yet. Please contact
            your administrator.
          </p>
        </div>
        <button
          onClick={() => void navigate(-1)}
          className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-white/10 dark:hover:bg-white/20"
        >
          Go Back
        </button>
      </div>
    )

  // Loading Screen Fallback Barrier
  if (loading)
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-dashboard-night">
        <Loader2 className="animate-spin text-indigo-600" size={36} />
        <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
          Synchronizing assessment nodes...
        </span>
      </div>
    )

  // Extra guard check in case configuration records are missing altogether
  if (!exam)
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-dashboard-night">
        <AlertTriangle className="text-amber-500" size={48} />
        <div className="text-center">
          <p className="text-lg font-black text-slate-800 dark:text-white">
            Configuration Error
          </p>
          <p className="mt-1 max-w-xs text-sm font-medium text-slate-400">
            Failed to gather exam details.
          </p>
        </div>
      </div>
    )

  const currentQuestion = questions[currentIdx]

  return (
    <div className="flex h-screen bg-slate-50 text-gray-900 dark:bg-dashboard-night dark:text-white">
      {/* ===== SIDEBAR COMPONENT MATRIX ===== */}
      <aside className="flex w-80 flex-col justify-between overflow-y-auto border-r border-slate-100 bg-white p-6 dark:border-white/10 dark:bg-white/5">
        <div>
          <button
            onClick={() => {
              if (
                confirm('Abandon exam? Progress saves but timer keeps running!')
              )
                void navigate(-1)
            }}
            className="mb-6 flex items-center gap-2 text-xs font-bold text-slate-500 uppercase hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft size={14} /> Exit Room
          </button>

          <h3 className="mb-4 text-xs font-black tracking-wider text-slate-900 uppercase dark:text-white">
            Navigation Tree
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {questions.map((q, idx) => {
              const isFlagged = flags[q.id]
              const isAnswered =
                answers[q.id] !== undefined && answers[q.id] !== ''
              const isCurrent = idx === currentIdx

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIdx(idx)}
                  className={`flex h-11 w-11 items-center justify-center rounded-xl border text-sm font-black transition active:scale-95 ${
                    isCurrent
                      ? 'ring-2 ring-indigo-600 ring-offset-2 dark:ring-offset-slate-900'
                      : ''
                  } ${
                    isFlagged
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
            <div className="h-3 w-3 rounded-sm bg-emerald-500" /> Saved Response
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm bg-amber-400" /> Flagged For
            Review
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm border bg-slate-50 dark:border-white/20 dark:bg-white/10" />{' '}
            Not Attempted
          </div>
        </div>
      </aside>

      {/* ===== MAIN WORKSPACE ===== */}
      <main className="flex flex-1 flex-col">
        {/* Header Block */}
        <header className="flex items-center justify-between border-b border-slate-100 bg-white px-8 py-5 shadow-xs dark:border-white/10 dark:bg-white/5">
          <div>
            <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
              {exam.title}
            </h1>
            <p className="text-xs font-bold text-slate-400">
              Targeted Assessment Sandbox
            </p>
          </div>

          <div
            className={`flex items-center gap-2 rounded-2xl border px-5 py-2 font-mono text-sm font-black shadow-xs transition-all ${
              timeLeft < 120
                ? 'animate-pulse border-red-100 bg-red-50 text-red-600'
                : 'border-transparent bg-slate-900 text-white dark:bg-white/10'
            }`}
          >
            <Clock size={16} />
            {Math.floor(timeLeft / 60)}:
            {('0' + Math.floor(timeLeft % 60)).slice(-2)}
          </div>
        </header>

        {/* Interactive Workspace Area */}
        <section className="mx-auto w-full max-w-4xl flex-1 overflow-y-auto p-8">
          <div className="rounded-[32px] border border-slate-100 bg-white p-8 shadow-xs dark:border-white/10 dark:bg-white/5">
            <span className="rounded-lg bg-indigo-50 px-3 py-1 text-[10px] font-black tracking-widest text-indigo-600 uppercase dark:bg-indigo-500/10">
              Question {currentIdx + 1} of {questions.length} (
              {currentQuestion.marks || 1} Marks)
            </span>
            <h2 className="mt-4 mb-8 text-xl leading-relaxed font-bold text-slate-800 dark:text-white">
              {currentQuestion.question_text}
            </h2>

            {/* MCQ Input Mode */}
            {currentQuestion.type === 'mcq' && (
              <div className="space-y-3">
                {examOptions(currentQuestion.options).map((opt) => {
                  const isChecked = answers[currentQuestion.id] === opt
                  return (
                    <button
                      key={opt}
                      onClick={() =>
                        void saveAnswerToDB(currentQuestion.id, opt)
                      }
                      className={`block w-full rounded-2xl border-2 p-4 text-left text-sm font-medium transition-all active:scale-[0.99] ${
                        isChecked
                          ? 'border-indigo-600 bg-indigo-50/50 font-bold text-indigo-900 dark:bg-indigo-500/10 dark:text-indigo-300'
                          : 'border-slate-100 text-slate-600 hover:bg-slate-50/80 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5'
                      }`}
                    >
                      {opt}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Open Form Inputs */}
            {(currentQuestion.type === 'short' ||
              currentQuestion.type === 'debug') && (
              <textarea
                className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 p-5 text-sm font-medium text-slate-700 shadow-inner outline-hidden transition placeholder:text-slate-300 focus:bg-white focus:ring-2 focus:ring-indigo-500 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-white/10"
                rows={6}
                value={answers[currentQuestion.id] || ''}
                placeholder="Type your formal code snippet or textual response evaluation here..."
                onChange={(e) =>
                  void saveAnswerToDB(currentQuestion.id, e.target.value)
                }
              />
            )}
          </div>
        </section>

        {/* Action Bottom Control Navigation Bar */}
        <footer className="flex items-center justify-between border-t border-slate-100 bg-white px-8 py-5 shadow-lg dark:border-white/10 dark:bg-white/5">
          <button
            onClick={() => toggleFlag(currentQuestion.id)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black tracking-wider uppercase transition ${
              flags[currentQuestion.id]
                ? 'bg-amber-400 text-white'
                : 'text-amber-500 hover:bg-amber-50 dark:hover:bg-white/5'
            }`}
          >
            <Flag
              size={16}
              className={flags[currentQuestion.id] ? 'fill-white' : ''}
            />{' '}
            Flag for Review
          </button>

          <div className="flex gap-3">
            <button
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx((p) => p - 1)}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-black tracking-wider text-slate-600 uppercase hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
            >
              Previous
            </button>

            {currentIdx < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIdx((p) => p + 1)}
                className="rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-black tracking-wider text-white uppercase hover:bg-slate-800 dark:bg-white/10 dark:hover:bg-white/20"
              >
                Next
              </button>
            ) : (
              <button
                disabled={isSubmitting}
                onClick={() => {
                  if (confirm('Are you sure you want to finish and submit?'))
                    void submitExam()
                }}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-black tracking-wider text-white uppercase shadow-md hover:bg-indigo-700"
              >
                {isSubmitting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CheckCircle size={14} />
                )}{' '}
                Submit Exam
              </button>
            )}
          </div>
        </footer>
      </main>
    </div>
  )
}
