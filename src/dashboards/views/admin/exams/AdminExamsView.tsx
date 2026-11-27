import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ClipboardCheck, Clock, Plus } from 'lucide-react'
import { toast } from 'react-hot-toast'

import { InsightsError } from '../../../insights/InsightsError'
import { getErrorMessage } from '../../../../lib/getErrorMessage'
import {
  createExam,
  durationText,
  examDateTime,
  examKeys,
  listAdminExams,
  loadExamPeople,
} from '../../../../features/exams/examsApi'
import { ExamDetailsForm } from './ExamDetailsForm'
import { ExamEditor } from './ExamEditor'
import { examCounts } from './examCounts'

type AdminExamsViewProps = {
  userId: string
  /** The exam open in the editor (from ?exam=), or null for the list. */
  examId: string | null
  onOpenExam: (examId: string | null) => void
}

const STATUS_TONE: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300',
  published:
    'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  closed: 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400',
}

/**
 * Dashboard › Exams (admins). Exams are set and marked here; tutors' homework
 * stays in Course Assignment.
 */
export default function AdminExamsView({
  userId,
  examId,
  onOpenExam,
}: AdminExamsViewProps) {
  const client = useQueryClient()
  const exams = useQuery({
    queryKey: examKeys.adminList(),
    queryFn: listAdminExams,
  })
  const people = useQuery({
    queryKey: examKeys.people(),
    queryFn: loadExamPeople,
    staleTime: 5 * 60_000,
  })
  const [creating, setCreating] = useState(false)

  const create = useMutation({
    mutationFn: (details: Parameters<typeof createExam>[0]) =>
      createExam(details, userId),
    onSuccess: (id) => {
      setCreating(false)
      toast.success('Exam created. Add its questions next.')
      void client.invalidateQueries({ queryKey: examKeys.adminList() })
      onOpenExam(id)
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Couldn’t create the exam.')),
  })

  const open = examId
    ? (exams.data ?? []).find((exam) => exam.id === examId)
    : undefined

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      {exams.isError ? (
        <InsightsError
          title="Exams couldn’t be loaded"
          error={exams.error}
          onRetry={() => void exams.refetch()}
        />
      ) : exams.isPending ? (
        <p className="text-sm text-slate-400">Loading exams…</p>
      ) : open ? (
        <ExamEditor
          exam={open}
          students={people.data?.students ?? []}
          courses={people.data?.courses ?? []}
          onBack={() => onOpenExam(null)}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                Exams
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Set exams, choose who sits them, mark them and publish results.
                Homework stays with tutors in Course Assignment.
              </p>
            </div>
            {!creating && (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700"
              >
                <Plus size={16} aria-hidden="true" /> New exam
              </button>
            )}
          </div>

          {examId && (
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
              That exam wasn’t found. It may have been deleted.
            </p>
          )}

          {creating && (
            <div className="rounded-3xl border border-indigo-200 bg-white p-5 dark:border-indigo-500/30 dark:bg-white/5">
              <h2 className="mb-4 font-black text-slate-900 dark:text-white">
                New exam
              </h2>
              <ExamDetailsForm
                courses={people.data?.courses ?? []}
                submitLabel="Create exam"
                pending={create.isPending}
                onSubmit={(details) => create.mutate(details)}
                onCancel={() => setCreating(false)}
              />
            </div>
          )}

          {exams.data.length === 0 && !creating ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-white/10 dark:bg-white/5">
              <ClipboardCheck
                className="mx-auto mb-3 text-slate-300"
                size={40}
                aria-hidden="true"
              />
              <p className="font-bold text-slate-700 dark:text-slate-200">
                No exams yet
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Create one, add questions, pick who sits it, then publish it.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {exams.data.map((exam) => {
                const counts = examCounts(exam)
                return (
                  <li key={exam.id}>
                    <button
                      type="button"
                      onClick={() => onOpenExam(exam.id)}
                      className="flex w-full flex-col gap-3 rounded-3xl border border-slate-100 bg-white p-5 text-left shadow-xs transition hover:border-indigo-300 sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-white/5 dark:hover:border-indigo-500/40"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-black text-slate-900 dark:text-white">
                            {exam.title}
                          </span>
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-black tracking-wider uppercase ${STATUS_TONE[exam.status] ?? ''}`}
                          >
                            {exam.status}
                          </span>
                          {exam.results_published && (
                            <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-black tracking-wider text-indigo-700 uppercase dark:bg-indigo-500/15 dark:text-indigo-300">
                              Results out
                            </span>
                          )}
                        </div>
                        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock size={12} aria-hidden="true" />
                            {durationText(exam.duration_minutes)}
                          </span>
                          <span>
                            {counts.questions}{' '}
                            {counts.questions === 1 ? 'question' : 'questions'}
                          </span>
                          <span>
                            {exam.course
                              ? `${exam.course.title}${counts.named ? ` + ${counts.named} named` : ''}`
                              : `${counts.named} ${counts.named === 1 ? 'student' : 'students'}`}
                          </span>
                          {exam.opens_at && (
                            <span>
                              Opens{' '}
                              {examDateTime.format(new Date(exam.opens_at))}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-4 text-xs font-bold text-slate-500 tabular-nums">
                        <span>{counts.handedIn} handed in</span>
                        {counts.toMark > 0 && (
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                            {counts.toMark} to mark
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
