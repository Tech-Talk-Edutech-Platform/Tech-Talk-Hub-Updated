import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { InsightsError } from '../../../insights/InsightsError'
import {
  examDateTime,
  examKeys,
  listQuestions,
  listSubmissions,
  type Submission,
} from '../../../../features/exams/examsApi'
import { AttemptMarking } from './AttemptMarking'

type ExamSubmissionsPanelProps = {
  examId: string
  durationMinutes: number
  closesAt: string | null
}

function submissionState(
  submission: Submission,
  durationMinutes: number,
  closesAt: string | null,
) {
  if (submission.marked_at) return 'Marked'
  if (submission.end_time) return 'To mark'
  const deadline = Math.min(
    Date.parse(submission.start_time) + durationMinutes * 60_000,
    closesAt ? Date.parse(closesAt) : Number.POSITIVE_INFINITY,
  )
  return deadline < Date.now() ? 'Time ran out' : 'Sitting now'
}

const STATE_TONE: Record<string, string> = {
  Marked:
    'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  'To mark':
    'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  'Time ran out':
    'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  'Sitting now':
    'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
}

/** Every student's attempt, with marking. */
export function ExamSubmissionsPanel({
  examId,
  durationMinutes,
  closesAt,
}: ExamSubmissionsPanelProps) {
  const client = useQueryClient()
  const submissions = useQuery({
    queryKey: examKeys.submissions(examId),
    queryFn: () => listSubmissions(examId),
  })
  const questions = useQuery({
    queryKey: examKeys.questions(examId),
    queryFn: () => listQuestions(examId),
  })
  const [marking, setMarking] = useState<string | null>(null)

  if (submissions.isError || questions.isError) {
    return (
      <InsightsError
        title="Submissions couldn’t be loaded"
        error={submissions.error ?? questions.error}
        onRetry={() => {
          void submissions.refetch()
          void questions.refetch()
        }}
      />
    )
  }
  if (submissions.isPending || questions.isPending) {
    return <p className="text-sm text-slate-400">Loading submissions…</p>
  }

  const outOf = questions.data.reduce((sum, q) => sum + (q.marks ?? 1), 0)

  if (submissions.data.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500 dark:border-white/10">
        Nobody has started this exam yet.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 bg-white dark:divide-white/5 dark:border-white/10 dark:bg-white/5">
        {submissions.data.map((submission) => {
          const state = submissionState(submission, durationMinutes, closesAt)
          return (
            <li key={submission.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                    {submission.student?.full_name ?? 'Student'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {submission.end_time
                      ? `Handed in ${examDateTime.format(new Date(submission.end_time))}`
                      : `Started ${examDateTime.format(new Date(submission.start_time))}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-black tracking-wider uppercase ${STATE_TONE[state] ?? ''}`}
                  >
                    {state}
                  </span>
                  <p className="w-20 text-right text-sm font-black text-slate-900 tabular-nums dark:text-white">
                    {submission.score ?? submission.auto_score ?? '–'}
                    <span className="text-xs text-slate-400">/{outOf}</span>
                  </p>
                  {state !== 'Sitting now' && (
                    <button
                      type="button"
                      aria-expanded={marking === submission.id}
                      onClick={() =>
                        setMarking(
                          marking === submission.id ? null : submission.id,
                        )
                      }
                      className="rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-indigo-700"
                    >
                      {submission.marked_at ? 'Review' : 'Mark'}
                    </button>
                  )}
                </div>
              </div>
              {marking === submission.id && (
                <div className="mt-4">
                  <AttemptMarking
                    submission={submission}
                    questions={questions.data}
                    onClose={() => setMarking(null)}
                    onSaved={() => {
                      setMarking(null)
                      void client.invalidateQueries({
                        queryKey: examKeys.submissions(examId),
                      })
                      void client.invalidateQueries({
                        queryKey: examKeys.adminList(),
                      })
                    }}
                  />
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
