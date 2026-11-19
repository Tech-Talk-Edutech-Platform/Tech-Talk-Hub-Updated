import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  BookOpenCheck,
  CalendarCheck,
  ClipboardCheck,
  GraduationCap,
  Mail,
  Users,
} from 'lucide-react'

import { DashboardHeader } from '../../components/dashboard/ui/DashboardHeader'
import { KpiCard } from '../../components/dashboard/ui/KpiCard'
import { ChartCard } from '../../components/dashboard/ui/ChartCard'
import {
  DataTable,
  type DataColumn,
} from '../../components/dashboard/ui/DataTable'
import {
  BarTrendChart,
  DonutChart,
} from '../../components/dashboard/ui/LazyCharts'
import { SERIES_COLORS } from '../../components/dashboard/ui/chartColors'
import {
  formatRelative,
  type PeriodId,
} from '../../components/dashboard/period'
import { EmptyState } from '../../components/ui/EmptyState'
import { Button } from '../../components/ui/Button'
import { queryKeys } from '../../lib/queryClient'
import { loadTutorInsights, type TutorStudentRow } from './tutorInsights'
import { InsightsError } from './InsightsError'
import { ScorePill, ProgressBar, Avatar } from './bits'

const CLASS_SERIES = [
  { key: 'scheduled', label: 'Scheduled', color: SERIES_COLORS.slate },
  { key: 'completed', label: 'Completed', color: SERIES_COLORS.purple },
] as const

const studentColumns: DataColumn<TutorStudentRow>[] = [
  {
    key: 'student',
    header: 'Student',
    sortValue: (row) => row.name,
    render: (row) => (
      <div className="flex items-center gap-3">
        <Avatar name={row.name} url={row.avatarUrl} />
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900 dark:text-white">
            {row.name}
          </p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            {row.email}
          </p>
        </div>
      </div>
    ),
  },
  {
    key: 'course',
    header: 'Course',
    sortValue: (row) => row.course,
    render: (row) => row.course ?? <span className="text-slate-400">—</span>,
  },
  {
    key: 'lastClass',
    header: 'Last class',
    sortValue: (row) => (row.lastClassAt ? Date.parse(row.lastClassAt) : null),
    render: (row) => formatRelative(row.lastClassAt),
  },
  {
    key: 'progress',
    header: 'Progress',
    sortValue: (row) => row.progress,
    render: (row) => <ProgressBar value={row.progress} />,
  },
  {
    key: 'quiz',
    header: 'Quiz average',
    sortValue: (row) => row.quizAverage,
    render: (row) => <ScorePill score={row.quizAverage} />,
  },
  {
    key: 'status',
    header: 'Status',
    sortValue: (row) => (row.needsHelp ? 0 : 1),
    render: (row) =>
      row.needsHelp ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertTriangle size={12} aria-hidden="true" />
          {row.failedQuizzes > 0
            ? `${row.failedQuizzes} quiz${row.failedQuizzes === 1 ? '' : 'zes'} to retake`
            : 'Below pass mark'}
        </span>
      ) : (
        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          On track
        </span>
      ),
  },
  {
    key: 'contact',
    header: 'Contact',
    render: (row) => (
      <a
        href={`mailto:${row.email}`}
        aria-label={`Email ${row.name}`}
        className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-purple-700 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
      >
        <Mail size={14} aria-hidden="true" />
      </a>
    ),
  },
]

/** Udemy-style teaching overview: KPIs, class trend, homework, students, quizzes. */
export function TutorInsights({
  tutorId,
  onNavigate,
}: {
  tutorId: string
  onNavigate?: (view: string) => void
}) {
  const [period, setPeriod] = useState<PeriodId>('30d')
  const query = useQuery({
    queryKey: queryKeys.dashboard.tutor(tutorId, period),
    queryFn: () => loadTutorInsights(tutorId, period),
    staleTime: 60_000,
  })
  const data = query.data
  const loading = query.isPending
  const needHelp = data?.students.filter((row) => row.needsHelp).length ?? 0

  return (
    <section aria-labelledby="tutor-insights" className="space-y-6">
      <DashboardHeader
        title={<span id="tutor-insights">Teaching overview</span>}
        subtitle="How your students are doing and what needs your attention."
        period={period}
        onPeriodChange={setPeriod}
        actions={
          onNavigate && (
            <Button size="md" onClick={() => onNavigate('course-assignment')}>
              <ClipboardCheck size={16} aria-hidden="true" /> Review homework
            </Button>
          )
        }
      />

      {query.isError ? (
        <InsightsError onRetry={() => void query.refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title="My students"
              icon={Users}
              accent="blue"
              loading={loading}
              value={data?.kpis.students ?? 0}
              hint={
                needHelp > 0 ? `${needHelp} need help` : 'All students on track'
              }
            />
            <KpiCard
              title="Classes held"
              icon={CalendarCheck}
              accent="purple"
              loading={loading}
              value={data?.kpis.classes.current ?? 0}
              change={data?.kpis.classes.change}
            />
            <KpiCard
              title="Average quiz score"
              icon={GraduationCap}
              accent="green"
              loading={loading}
              value={
                data?.kpis.quizAverage.current === null ||
                data?.kpis.quizAverage.current === undefined
                  ? '—'
                  : `${data.kpis.quizAverage.current}%`
              }
              change={
                data?.kpis.quizAverage.current === null
                  ? undefined
                  : data?.kpis.quizAverage.change
              }
              hint={
                data?.kpis.quizAverage.current === null
                  ? 'No quiz attempts in this period'
                  : undefined
              }
            />
            <KpiCard
              title="Homework to review"
              icon={ClipboardCheck}
              accent="amber"
              loading={loading}
              value={data?.kpis.toReview ?? 0}
              hint={`${data?.kpis.needsRevision ?? 0} awaiting resubmission`}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <ChartCard
              title="Classes"
              subtitle="Scheduled versus completed in the selected period"
              className="lg:col-span-2"
            >
              {loading ? null : data && data.kpis.classes.current > 0 ? (
                <BarTrendChart
                  data={data.classTrend}
                  series={CLASS_SERIES}
                  caption="Classes scheduled and completed"
                />
              ) : (
                <EmptyState
                  size="sm"
                  icon={CalendarCheck}
                  title="No classes in this period"
                  description="Classes you teach appear here once they have taken place."
                />
              )}
            </ChartCard>
            <ChartCard title="Homework status" subtitle="All homework you set">
              {loading ? null : data && data.homework.length > 0 ? (
                <DonutChart data={data.homework} centerLabel="Assignments" />
              ) : (
                <EmptyState
                  size="sm"
                  icon={ClipboardCheck}
                  title="No homework yet"
                  description="Assign homework from Course Assignment."
                />
              )}
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <ChartCard
              title="My students"
              subtitle="Students needing help are listed first"
              className="xl:col-span-2"
            >
              {loading ? null : (
                <DataTable
                  rows={data?.students ?? []}
                  columns={studentColumns}
                  rowKey={(row) => row.id}
                  caption="My students"
                  searchText={(row) =>
                    `${row.name} ${row.email} ${row.course ?? ''}`
                  }
                  searchPlaceholder="Search students"
                  initialSort={{ key: 'status', direction: 'asc' }}
                  empty={
                    <EmptyState
                      icon={Users}
                      title="No students assigned yet"
                      description="An admin assigns students to you in Users & Staff."
                    />
                  }
                />
              )}
            </ChartCard>

            <ChartCard
              title="Where students get stuck"
              subtitle="Quizzes with the lowest pass rate"
            >
              {loading ? null : data && data.stuckQuizzes.length > 0 ? (
                <ol className="space-y-4">
                  {data.stuckQuizzes.map((quiz) => (
                    <li key={quiz.quizId}>
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate font-semibold text-slate-800 dark:text-white">
                          {quiz.title}
                        </span>
                        <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                          {quiz.passRate}% passed · {quiz.attempted} tried
                        </span>
                      </div>
                      <ProgressBar value={quiz.passRate} showLabel={false} />
                    </li>
                  ))}
                </ol>
              ) : (
                <EmptyState
                  size="sm"
                  icon={BookOpenCheck}
                  title="No sticking points"
                  description="Quizzes your students struggle with will appear here."
                />
              )}
            </ChartCard>
          </div>
        </>
      )}
    </section>
  )
}
