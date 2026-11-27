import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  FileText,
  Play,
} from 'lucide-react'

import { InsightsError } from '../../insights/InsightsError'
import {
  durationText,
  examDateTime,
  examKeys,
  loadMyExams,
  type MyExam,
} from '../../../features/exams/examsApi'

type StudentExamsViewProps = {
  userId: string
  onOpenExam: (examId: string) => void
  onOpenGrades: () => void
}

type ExamState = 'upcoming' | 'open' | 'in-progress' | 'handed-in' | 'missed'

function examState(exam: MyExam, now: number): ExamState {
  if (exam.submitted_at) return 'handed-in'
  if (exam.attempt_id) return 'in-progress'
  if (exam.exam_status !== 'published') return 'missed'
  if (exam.closes_at && Date.parse(exam.closes_at) <= now) return 'missed'
  if (exam.opens_at && Date.parse(exam.opens_at) > now) return 'upcoming'
  return 'open'
}

const STATE_LABEL: Record<ExamState, string> = {
  upcoming: 'Opens soon',
  open: 'Ready to start',
  'in-progress': 'In progress',
  'handed-in': 'Handed in',
  missed: 'Closed',
}

const STATE_TONE: Record<ExamState, string> = {
  upcoming: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300',
  open: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
  'in-progress':
    'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  'handed-in':
    'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  missed: 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400',
}

/** Dashboard › Exams: the exams set for this student by the school. */
export default function StudentExamsView({
  userId,
  onOpenExam,
  onOpenGrades,
}: StudentExamsViewProps) {
  const exams = useQuery({
    queryKey: examKeys.mine(userId),
    queryFn: loadMyExams,
  })
  // When the page opened; good enough for opens soon / closed labels.
  const [now] = useState(() => Date.now())

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            Exams
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Exams set by Tech Talk Hub. Homework from your tutor is in My
            Courses.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenGrades}
          className="text-sm font-bold text-indigo-600 hover:underline dark:text-indigo-400"
        >
          See my grades
        </button>
      </div>

      {exams.isError ? (
        <InsightsError
          title="Your exams couldn’t be loaded"
          error={exams.error}
          onRetry={() => void exams.refetch()}
        />
      ) : exams.isPending ? (
        <div className="space-y-3">
          {[1, 2].map((n) => (
            <div
              key={n}
              className="h-28 animate-pulse rounded-3xl border border-slate-100 bg-white dark:border-white/10 dark:bg-white/5"
            />
          ))}
        </div>
      ) : exams.data.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-white/10 dark:bg-white/5">
          <FileText
            className="mx-auto mb-3 text-slate-300"
            size={40}
            aria-hidden="true"
          />
          <p className="font-bold text-slate-700 dark:text-slate-200">
            No exams right now
          </p>
          <p className="mt-1 text-sm text-slate-500">
            When an exam is set for you, it shows up here.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {exams.data.map((exam) => {
            const state = examState(exam, now)
            return (
              <li
                key={exam.exam_id}
                className="flex flex-col gap-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-white/5"
              >
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-black text-slate-900 dark:text-white">
                      {exam.title}
                    </h2>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-black tracking-wider uppercase ${STATE_TONE[state]}`}
                    >
                      {STATE_LABEL[state]}
                    </span>
                  </div>
                  {exam.description && (
                    <p className="line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
                      {exam.description}
                    </p>
                  )}
                  <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock size={13} aria-hidden="true" />
                      {durationText(exam.duration_minutes)} ·{' '}
                      {exam.question_count}{' '}
                      {exam.question_count === 1 ? 'question' : 'questions'} ·{' '}
                      {exam.total_marks} marks
                    </span>
                    {exam.course_title && <span>{exam.course_title}</span>}
                    {state === 'upcoming' && exam.opens_at && (
                      <span className="flex items-center gap-1">
                        <CalendarClock size={13} aria-hidden="true" />
                        Opens {examDateTime.format(new Date(exam.opens_at))}
                      </span>
                    )}
                    {(state === 'open' || state === 'upcoming') &&
                      exam.closes_at && (
                        <span>
                          Closes {examDateTime.format(new Date(exam.closes_at))}
                        </span>
                      )}
                  </p>
                </div>

                <div className="shrink-0">
                  {state === 'open' && (
                    <button
                      type="button"
                      onClick={() => onOpenExam(exam.exam_id)}
                      className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700"
                    >
                      <Play size={15} aria-hidden="true" /> Start exam
                    </button>
                  )}
                  {state === 'in-progress' && (
                    <button
                      type="button"
                      onClick={() => onOpenExam(exam.exam_id)}
                      className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-amber-600"
                    >
                      <Play size={15} aria-hidden="true" /> Continue
                    </button>
                  )}
                  {state === 'handed-in' &&
                    (exam.results_published && exam.score !== null ? (
                      <p className="text-right">
                        <span className="block text-2xl font-black text-slate-900 dark:text-white">
                          {exam.score}
                          <span className="text-sm text-slate-400">
                            /{exam.total_marks}
                          </span>
                        </span>
                        <span className="text-xs font-bold text-emerald-600">
                          Result out
                        </span>
                      </p>
                    ) : (
                      <p className="flex items-center gap-1.5 text-sm font-bold text-emerald-600">
                        <CheckCircle2 size={16} aria-hidden="true" /> Waiting
                        for results
                      </p>
                    ))}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
