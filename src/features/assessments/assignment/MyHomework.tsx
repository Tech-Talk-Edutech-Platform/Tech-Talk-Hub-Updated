import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom' // IMPORT THIS
import { toast } from 'react-hot-toast'
import { supabase } from '../../../supabase'
import {
  Loader2,
  CheckCircle,
  Clock,
  Send,
  MessageSquare,
  Star,
  ArrowLeft,
} from 'lucide-react' // ADDED ArrowLeft

interface MyHomeworkProps {
  studentId?: string
}

interface StudentAssignment {
  id: string
  status: string
  task_name: string
  description: string | null
  submission_text: string | null
  tutor_feedback: string | null
  grade: string | null
  submitted_at?: string | null
}

export default function MyHomework({ studentId }: MyHomeworkProps) {
  const navigate = useNavigate() // INITIALIZE NAVIGATE
  const [assignments, setAssignments] = useState<StudentAssignment[]>([])
  const [submissions, setSubmissions] = useState<Record<string, string>>({})
  const [submittingId, setSubmittingId] = useState<string | null>(null)

  const fetchAssignments = useCallback(async () => {
    const { data, error } = await supabase
      .from('student_assignments')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })

    if (error) console.error('Fetch error:', error)
    setAssignments(data || [])
  }, [studentId])

  useEffect(() => {
    if (studentId) void fetchAssignments()
  }, [studentId, fetchAssignments])

  async function submitAssignment(id: string) {
    const text = submissions[id]
    if (!text) return toast.error('Please write your response first')

    setSubmittingId(id)

    try {
      const { error } = await supabase
        .from('student_assignments')
        .update({
          submission_text: text,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) throw error

      toast.success('Homework sent!')

      setAssignments((prev) =>
        prev.map((a) =>
          a.id === id
            ? {
                ...a,
                status: 'submitted',
                submission_text: text,
                submitted_at: new Date().toISOString(),
              }
            : a,
        ),
      )

      setSubmissions((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })

      fetchAssignments()
    } catch (err) {
      toast.error(
        `Submit failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      )
    } finally {
      setSubmittingId(null)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      {/* ===== ADDED BACK BUTTON HEADER ===== */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <button
          onClick={() => navigate(-1)} // Navigates back to previous dashboard route
          className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-600 transition hover:bg-slate-200 active:scale-95"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <h2 className="text-xl font-black text-slate-900">
          My Homework Dashboard
        </h2>
        <div className="w-16"></div> {/* Spacer for symmetry */}
      </div>

      {assignments.length === 0 ? (
        <div className="rounded-[32px] border-2 border-dashed border-slate-200 bg-slate-50 py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
            <CheckCircle className="text-slate-200" size={32} />
          </div>
          <p className="font-bold text-slate-400">
            All caught up! No pending homework.
          </p>
        </div>
      ) : (
        assignments.map((a) => {
          const isSubmitting = submittingId === a.id
          const isCompleted = a.status === 'completed'

          return (
            <div
              key={a.id}
              className={`group rounded-[32px] border-2 bg-white p-6 transition-all duration-300 ${
                a.status === 'pending'
                  ? 'border-slate-100 hover:border-indigo-100'
                  : isCompleted
                    ? 'border-emerald-100 bg-emerald-50/10'
                    : 'border-transparent bg-slate-50/50'
              }`}
            >
              {/* Header */}
              <div className="mb-4 flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black tracking-tight text-slate-900">
                      {a.task_name}
                    </h3>
                    {a.status !== 'pending' && (
                      <CheckCircle
                        size={18}
                        className={
                          isCompleted ? 'text-emerald-500' : 'text-blue-500'
                        }
                      />
                    )}
                  </div>
                  <p className="text-sm leading-relaxed text-slate-500">
                    {a.description}
                  </p>
                </div>

                <span
                  className={`flex items-center gap-2 rounded-2xl px-4 py-1.5 text-[10px] font-black uppercase tracking-widest shadow-sm ${
                    a.status === 'pending'
                      ? 'border border-amber-100 bg-white text-amber-600'
                      : a.status === 'submitted'
                        ? 'bg-blue-600 text-white'
                        : 'bg-emerald-600 text-white'
                  }`}
                >
                  {a.status === 'pending' ? (
                    <Clock size={12} className="animate-pulse" />
                  ) : (
                    <CheckCircle size={12} />
                  )}
                  {a.status}
                </span>
              </div>

              {/* Interaction Area */}
              {a.status === 'pending' ? (
                <div className="mt-4 space-y-3">
                  <textarea
                    disabled={isSubmitting}
                    className="w-full rounded-[24px] border-none bg-slate-50 p-5 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                    placeholder="Write your answer or link your work here..."
                    rows={4}
                    value={submissions[a.id] || ''}
                    onChange={(e) =>
                      setSubmissions({ ...submissions, [a.id]: e.target.value })
                    }
                  />

                  <button
                    disabled={isSubmitting || !submissions[a.id]}
                    onClick={() => submitAssignment(a.id)}
                    className={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-black shadow-lg transition-all active:scale-[0.98] ${
                      isSubmitting
                        ? 'cursor-wait bg-blue-600 text-white'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-300'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />{' '}
                        Syncing...
                      </>
                    ) : (
                      <>
                        <Send size={16} /> Submit Homework
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Student's Submission */}
                  <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                    <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Your Work
                    </p>
                    <p className="whitespace-pre-wrap border-l-2 border-slate-100 pl-4 text-sm font-medium italic text-slate-700">
                      "{a.submission_text}"
                    </p>
                  </div>

                  {/* Tutor's Feedback */}
                  {isCompleted && (a.tutor_feedback || a.grade) && (
                    <div className="animate-in zoom-in rounded-2xl bg-emerald-600 p-5 text-white shadow-lg duration-300">
                      <div className="mb-2 flex items-center gap-2">
                        <MessageSquare size={16} />
                        <p className="text-[10px] font-black uppercase tracking-widest">
                          Tutor Feedback
                        </p>
                      </div>
                      <p className="mb-3 text-sm font-bold leading-relaxed">
                        {a.tutor_feedback ||
                          'Great job! Your work has been reviewed.'}
                      </p>

                      {/* Star Rating Display */}
                      <div className="flex items-center gap-2">
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              size={14}
                              className={
                                Number.parseInt(a.grade ?? '', 10) >= s
                                  ? 'fill-white text-white'
                                  : 'text-emerald-400'
                              }
                            />
                          ))}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-tight">
                          Grade: {a.grade}
                        </span>
                      </div>
                    </div>
                  )}

                  {!isCompleted && (
                    <div className="mt-2 flex items-center justify-between border-t border-slate-50 pt-3">
                      <span className="text-[10px] font-bold text-slate-400">
                        Status: Waiting for Review
                      </span>
                      <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
