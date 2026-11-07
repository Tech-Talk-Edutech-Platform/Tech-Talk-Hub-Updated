import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../../supabase'
import {
  Clock,
  Flag,
  CheckCircle,
  ArrowLeft,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import type { User } from '@supabase/supabase-js'

interface ExamPageProps {
  user: User | null
}

export default function ExamPage({ user }: ExamPageProps) {
  const { id } = useParams()
  const navigate = useNavigate()

  // Core Data States
  const [exam, setExam] = useState(null)
  const [questions, setQuestions] = useState([])
  const [attempt, setAttempt] = useState(null)

  // UI Engine States
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState({})
  const [flags, setFlags] = useState({})

  const [timeLeft, setTimeLeft] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEmpty, setIsEmpty] = useState(false)

  // 1. Core Fetcher Framework
  useEffect(() => {
    let isMounted = true

    const fetchExamAndInitialize = async () => {
      try {
        if (!isMounted) return
        setLoading(true)

        // Fetch Exam Configuration
        const { data: examData, error: examErr } = await supabase
          .from('exams')
          .select('*')
          .eq('id', id)
          .single()

        if (examErr || !examData)
          throw new Error('Exam context could not be located.')

        if (!isMounted) return
        setExam(examData)
        setTimeLeft(examData.duration_minutes * 60)

        // Fetch Targeted Questions
        const { data: qData, error: qErr } = await supabase
          .from('questions')
          .select('*')
          .eq('exam_id', examData.id)

        if (qErr) throw qErr

        const fetchedQuestions = qData || []
        if (!isMounted) return
        setQuestions(fetchedQuestions)

        // CRITICAL STOP: Short-circuit completely if no questions exist
        if (fetchedQuestions.length === 0) {
          setIsEmpty(true)
          setLoading(false)
          return
        }

        // Initialize or Retrieve Active Session Attempt
        const { data: attemptData, error: attemptErr } = await supabase
          .from('attempts')
          .select('*')
          .eq('exam_id', examData.id)
          .eq('student_id', user?.id)
          .is('end_time', null)
          .order('start_time', { ascending: false })
          .limit(1)

        if (attemptErr) throw attemptErr

        let activeAttempt = attemptData?.[0]

        if (!activeAttempt) {
          const { data: newAttempt, error: createErr } = await supabase
            .from('attempts')
            .insert({
              exam_id: examData.id,
              student_id: user?.id,
              start_time: new Date().toISOString(),
            })
            .select()
            .single()

          if (createErr) throw createErr
          activeAttempt = newAttempt
        } else {
          const { data: savedAnswers, error: answersErr } = await supabase
            .from('answers')
            .select('question_id, answer')
            .eq('attempt_id', activeAttempt.id)

          if (!answersErr && savedAnswers) {
            const recoveredAnswers = {}
            savedAnswers.forEach((row) => {
              recoveredAnswers[row.question_id] = row.answer
            })
            setAnswers(recoveredAnswers)
          }
        }

        if (isMounted) {
          setAttempt(activeAttempt)
          setLoading(false)
        }
      } catch (err) {
        console.error(err)
        if (isMounted) {
          toast.error(err.message || 'Initialization error occurred.')
          setLoading(false)
        }
      }
    }

    if (id && user) {
      fetchExamAndInitialize()
    }

    return () => {
      isMounted = false
    }
  }, [id, user])

  // 2. Evaluation Engine & Submission Handler
  const submitExam = useCallback(async () => {
    if (!attempt || isSubmitting) return
    setIsSubmitting(true)

    try {
      const { data: databaseAnswers } = await supabase
        .from('answers')
        .select('*')
        .eq('attempt_id', attempt.id)

      let computedScore = 0
      databaseAnswers?.forEach((savedAns) => {
        const matchingQuestion = questions.find(
          (q) => q.id === savedAns.question_id,
        )
        if (
          matchingQuestion?.type === 'mcq' &&
          savedAns.answer === matchingQuestion.correct_answer
        ) {
          computedScore += matchingQuestion.marks || 1
        }
      })

      const { error: updateError } = await supabase
        .from('attempts')
        .update({
          score: computedScore,
          end_time: new Date().toISOString(),
        })
        .eq('id', attempt.id)

      if (updateError) throw updateError

      toast.success('Exam submitted safely!')
      alert(`Exam complete! Your recorded score is: ${computedScore}`)
      navigate(-1)
    } catch (err) {
      toast.error(`Submission failed: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }, [attempt, questions, isSubmitting, navigate])

  // 3. Timer Heartbeat Hook
  useEffect(() => {
    if (!attempt || !exam || isSubmitting || questions.length === 0) return

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
        submitExam()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [attempt, exam, submitExam, isSubmitting, questions.length])

  // 4. Persistence Mutator for Database State Upserts
  const saveAnswerToDB = async (questionId, responseValue) => {
    if (!attempt) return

    setAnswers((prev) => ({ ...prev, [questionId]: responseValue }))

    const { error } = await supabase.from('answers').upsert(
      {
        attempt_id: attempt.id,
        question_id: questionId,
        answer: responseValue,
      },
      { onConflict: 'attempt_id,question_id' },
    )

    if (error) {
      console.error('Answer failed to sync: ', error)
      toast.error('Network sync lag detected.')
    }
  }

  const toggleFlag = (qId) =>
    setFlags((prev) => ({ ...prev, [qId]: !prev[qId] }))

  // Absolute fallback layer handling empty DB configurations cleanly (Checked FIRST)
  if (isEmpty || (!loading && questions.length === 0))
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-slate-50">
        <AlertTriangle className="text-amber-500" size={48} />
        <div className="text-center">
          <p className="text-lg font-black text-slate-800">Exam Is Empty</p>
          <p className="mt-1 max-w-xs text-sm font-medium text-slate-400">
            This assessment doesn't contain any questions yet. Please contact
            your administrator.
          </p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
        >
          Go Back
        </button>
      </div>
    )

  // Loading Screen Fallback Barrier
  if (loading)
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600" size={36} />
        <span className="text-sm font-bold text-slate-500">
          Synchronizing assessment nodes...
        </span>
      </div>
    )

  // Extra guard check in case configuration records are missing altogether
  if (!exam)
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-slate-50">
        <AlertTriangle className="text-amber-500" size={48} />
        <div className="text-center">
          <p className="text-lg font-black text-slate-800">
            Configuration Error
          </p>
          <p className="mt-1 max-w-xs text-sm font-medium text-slate-400">
            Failed to gather exam details.
          </p>
        </div>
      </div>
    )

  const currentQuestion = questions[currentIdx] || {}

  return (
    <div className="flex h-screen bg-slate-50">
      {/* ===== SIDEBAR COMPONENT MATRIX ===== */}
      <aside className="flex w-80 flex-col justify-between overflow-y-auto border-r border-slate-100 bg-white p-6">
        <div>
          <button
            onClick={() => {
              if (
                confirm('Abandon exam? Progress saves but timer keeps running!')
              )
                navigate(-1)
            }}
            className="mb-6 flex items-center gap-2 text-xs font-bold uppercase text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft size={14} /> Exit Room
          </button>

          <h3 className="mb-4 text-xs font-black uppercase tracking-wider text-slate-900">
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
                    isCurrent ? 'ring-2 ring-indigo-600 ring-offset-2' : ''
                  } ${
                    isFlagged
                      ? 'border-amber-500 bg-amber-400 text-white shadow-xs'
                      : isAnswered
                        ? 'border-emerald-600 bg-emerald-500 text-white'
                        : 'border-slate-100 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {idx + 1}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-6 space-y-2 rounded-2xl bg-slate-50 p-4 text-[11px] font-bold text-slate-500">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm bg-emerald-500" /> Saved Response
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm bg-amber-400" /> Flagged For Review
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm border bg-slate-50" /> Not Attempted
          </div>
        </div>
      </aside>

      {/* ===== MAIN WORKSPACE ===== */}
      <main className="flex flex-1 flex-col">
        {/* Header Block */}
        <header className="flex items-center justify-between border-b border-slate-100 bg-white px-8 py-5 shadow-xs">
          <div>
            <h1 className="text-lg font-black tracking-tight text-slate-900">
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
                : 'border-transparent bg-slate-900 text-white'
            }`}
          >
            <Clock size={16} />
            {Math.floor(timeLeft / 60)}:
            {('0' + Math.floor(timeLeft % 60)).slice(-2)}
          </div>
        </header>

        {/* Interactive Workspace Area */}
        <section className="mx-auto w-full max-w-4xl flex-1 overflow-y-auto p-8">
          <div className="rounded-[32px] border border-slate-100 bg-white p-8 shadow-xs">
            <span className="rounded-lg bg-indigo-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-indigo-600">
              Question {currentIdx + 1} of {questions.length} (
              {currentQuestion.marks || 1} Marks)
            </span>
            <h2 className="mb-8 mt-4 text-xl font-bold leading-relaxed text-slate-800">
              {currentQuestion.question}
            </h2>

            {/* MCQ Input Mode */}
            {currentQuestion.type === 'mcq' && currentQuestion.options && (
              <div className="space-y-3">
                {currentQuestion.options.map((opt) => {
                  const isChecked = answers[currentQuestion.id] === opt
                  return (
                    <button
                      key={opt}
                      onClick={() => saveAnswerToDB(currentQuestion.id, opt)}
                      className={`block w-full rounded-2xl border-2 p-4 text-left text-sm font-medium transition-all active:scale-[0.99] ${
                        isChecked
                          ? 'border-indigo-600 bg-indigo-50/50 font-bold text-indigo-900'
                          : 'border-slate-100 text-slate-600 hover:bg-slate-50/80'
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
                className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 p-5 text-sm font-medium text-slate-700 shadow-inner outline-hidden transition placeholder:text-slate-300 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                rows={6}
                value={answers[currentQuestion.id] || ''}
                placeholder="Type your formal code snippet or textual response evaluation here..."
                onChange={(e) =>
                  saveAnswerToDB(currentQuestion.id, e.target.value)
                }
              />
            )}
          </div>
        </section>

        {/* Action Bottom Control Navigation Bar */}
        <footer className="flex items-center justify-between border-t border-slate-100 bg-white px-8 py-5 shadow-lg">
          <button
            onClick={() => toggleFlag(currentQuestion.id)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider transition ${
              flags[currentQuestion.id]
                ? 'bg-amber-400 text-white'
                : 'text-amber-500 hover:bg-amber-50'
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
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-slate-600 disabled:cursor-not-allowed disabled:opacity-30"
            >
              Previous
            </button>

            {currentIdx < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIdx((p) => p + 1)}
                className="rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white hover:bg-slate-800"
              >
                Next
              </button>
            ) : (
              <button
                disabled={isSubmitting}
                onClick={() => {
                  if (confirm('Are you sure you want to finish and submit?'))
                    submitExam()
                }}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md hover:bg-indigo-700"
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
