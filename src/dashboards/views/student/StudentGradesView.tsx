import { useQuery } from '@tanstack/react-query'
import { Award, BarChart2, Clock } from 'lucide-react'

import { InsightsError } from '../../insights/InsightsError'
import {
  examDateTime,
  examKeys,
  loadMyExams,
} from '../../../features/exams/examsApi'

type StudentGradesViewProps = {
  userId: string
}

/** Dashboard › Grades: exam results once the school publishes them. */
export default function StudentGradesView({ userId }: StudentGradesViewProps) {
  // Same data as the Exams page, so switching between them is instant.
  const exams = useQuery({
    queryKey: examKeys.mine(userId),
    queryFn: loadMyExams,
  })
  const handedIn = (exams.data ?? []).filter((exam) => exam.submitted_at)
  const graded = handedIn.filter(
    (exam) => exam.results_published && exam.score !== null,
  )
  const average =
    graded.length > 0
      ? Math.round(
          (graded.reduce(
            (sum, exam) =>
              sum +
              (exam.total_marks > 0 ? (exam.score ?? 0) / exam.total_marks : 0),
            0,
          ) /
            graded.length) *
            100,
        )
      : null

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">
          Grades
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Your exam results and feedback. Results show here once your teachers
          have marked the exam and published them.
        </p>
      </div>

      {exams.isError ? (
        <InsightsError
          title="Your grades couldn’t be loaded"
          error={exams.error}
          onRetry={() => void exams.refetch()}
        />
      ) : exams.isPending ? (
        <div className="h-40 animate-pulse rounded-3xl border border-slate-100 bg-white dark:border-white/10 dark:bg-white/5" />
      ) : handedIn.length === 0 ? (
        <div className="rounded-3xl border border-slate-100 bg-white p-12 text-center dark:border-white/10 dark:bg-white/5">
          <BarChart2
            className="mx-auto mb-4 text-slate-300"
            size={40}
            aria-hidden="true"
          />
          <h2 className="font-bold text-slate-800 dark:text-white">
            No results yet
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Exams you hand in show up here.
          </p>
        </div>
      ) : (
        <>
          {average !== null && (
            <div className="flex items-center gap-4 rounded-3xl bg-indigo-600 p-5 text-white">
              <Award size={28} aria-hidden="true" />
              <div>
                <p className="text-xs font-bold tracking-wider text-indigo-100 uppercase">
                  Average across {graded.length}{' '}
                  {graded.length === 1 ? 'exam' : 'exams'}
                </p>
                <p className="text-3xl font-black">{average}%</p>
              </div>
            </div>
          )}
          <ul className="space-y-3">
            {handedIn.map((exam) => {
              const published = exam.results_published && exam.score !== null
              const percent =
                published && exam.total_marks > 0
                  ? Math.round(((exam.score ?? 0) / exam.total_marks) * 100)
                  : null
              return (
                <li
                  key={exam.exam_id}
                  className="rounded-3xl border border-slate-100 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-white/5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="font-black text-slate-900 dark:text-white">
                        {exam.title}
                      </h2>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                        <Clock size={12} aria-hidden="true" />
                        Handed in{' '}
                        {examDateTime.format(new Date(exam.submitted_at ?? ''))}
                        {exam.course_title && ` · ${exam.course_title}`}
                      </p>
                    </div>
                    {published ? (
                      <div className="text-right">
                        <p className="text-2xl font-black text-slate-900 dark:text-white">
                          {exam.score}
                          <span className="text-sm text-slate-400">
                            /{exam.total_marks}
                          </span>
                        </p>
                        {percent !== null && (
                          <p
                            className={`text-xs font-black ${percent >= 50 ? 'text-emerald-600' : 'text-amber-600'}`}
                          >
                            {percent}%
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm font-bold text-slate-400">
                        {exam.marked
                          ? 'Marked, not published yet'
                          : 'Being marked'}
                      </p>
                    )}
                  </div>
                  {published && exam.feedback && (
                    <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm whitespace-pre-wrap text-slate-700 dark:bg-white/5 dark:text-slate-300">
                      <span className="mb-1 block text-[10px] font-black tracking-wider text-slate-400 uppercase">
                        Feedback
                      </span>
                      {exam.feedback}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
