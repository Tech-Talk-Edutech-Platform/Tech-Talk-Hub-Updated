import { useQuery } from '@tanstack/react-query'
import {
  Award,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  PlayCircle,
  Target,
} from 'lucide-react'

import { KpiCard } from '../../components/dashboard/ui/KpiCard'
import { ChartCard } from '../../components/dashboard/ui/ChartCard'
import { formatRelative } from '../../components/dashboard/period'
import { EmptyState } from '../../components/ui/EmptyState'
import { Button } from '../../components/ui/Button'
import { queryKeys } from '../../lib/queryClient'
import { loadStudentInsights } from './studentInsights'
import { InsightsError } from './InsightsError'
import { ProgressBar } from './bits'

/** A student's progress at a glance and the next thing to do. */
export function StudentInsights({
  studentId,
  onNavigate,
}: {
  studentId: string
  onNavigate?: (view: string) => void
}) {
  const query = useQuery({
    queryKey: queryKeys.dashboard.student(studentId),
    queryFn: () => loadStudentInsights(studentId),
    staleTime: 60_000,
  })
  const data = query.data
  const loading = query.isPending

  if (query.isError) {
    return <InsightsError onRetry={() => void query.refetch()} />
  }

  return (
    <section aria-label="My progress" className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Course progress"
          icon={Target}
          accent="purple"
          loading={loading}
          value={data?.progress === null ? '—' : `${data?.progress ?? 0}%`}
          hint={data?.course?.title ?? 'No course assigned yet'}
        />
        <KpiCard
          title="Lessons done"
          icon={BookOpen}
          accent="blue"
          loading={loading}
          value={data?.lessonsDone ?? 0}
          hint={`of ${data?.lessonsTotal ?? 0} lessons`}
        />
        <KpiCard
          title="Quizzes passed"
          icon={GraduationCap}
          accent="green"
          loading={loading}
          value={data?.quizzesPassed ?? 0}
          hint={
            data?.quizzesToRetake
              ? `${data.quizzesToRetake} to retake`
              : 'Keep it up!'
          }
        />
        <KpiCard
          title="Badges"
          icon={Award}
          accent="amber"
          loading={loading}
          value={data?.badges ?? 0}
          hint="Earned in live classes"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ChartCard
          title="Continue learning"
          subtitle={data?.course?.title}
          className="lg:col-span-2"
        >
          {loading ? null : !data?.course ? (
            <EmptyState
              size="sm"
              tone="brand"
              icon={BookOpen}
              title="No course yet"
              description="Your tutor will assign your first course soon."
            />
          ) : data.nextLesson ? (
            <div className="space-y-5">
              <ProgressBar value={data.progress} />
              <div className="flex flex-col gap-4 rounded-2xl bg-purple-50 p-5 sm:flex-row sm:items-center sm:justify-between dark:bg-purple-500/10">
                <div className="min-w-0">
                  <p className="text-xs font-bold tracking-wider text-purple-700 uppercase dark:text-purple-300">
                    Up next
                  </p>
                  <p className="mt-1 truncate text-lg font-black text-slate-900 dark:text-white">
                    {data.nextLesson.title}
                  </p>
                </div>
                {onNavigate && (
                  <Button onClick={() => onNavigate('courses')}>
                    <PlayCircle size={16} aria-hidden="true" /> Continue
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <EmptyState
              size="sm"
              tone="brand"
              icon={CheckCircle2}
              title="Course complete"
              description="You have finished every lesson. Great work!"
            />
          )}
        </ChartCard>

        <ChartCard title="Homework due" subtitle="Oldest first">
          {loading ? null : data && data.homework.length > 0 ? (
            <ul className="space-y-3">
              {data.homework.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 p-3 dark:border-white/10"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {item.task}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Set {formatRelative(item.createdAt).toLowerCase()}
                    </p>
                  </div>
                  {item.status === 'needs_revision' && (
                    <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                      Revise
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              size="sm"
              icon={ClipboardList}
              title="All caught up"
              description="New homework from your tutor will appear here."
            />
          )}
        </ChartCard>
      </div>
    </section>
  )
}
