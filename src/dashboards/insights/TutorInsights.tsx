import { useSearchParams } from 'react-router-dom'
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
import { formatRelative, isPeriodId } from '../../components/dashboard/period'
import { EmptyState } from '../../components/ui/EmptyState'
import { Button } from '../../components/ui/Button'
import { queryKeys } from '../../lib/queryClient'
import { loadTutorInsights, type TutorStudentRow } from './tutorInsights'
import { InsightsError, InsightsStale } from './InsightsError'
import { NavButton } from './NavButton'
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
    className: 'whitespace-nowrap',
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
    className: 'whitespace-nowrap',
    sortValue: (row) => row.quizAverage,
    render: (row) => <ScorePill score={row.quizAverage} />,
  },
  {
    key: 'status',
    header: 'Status',
    sortValue: (row) => (row.needsHelp ? 0 : 1),
    render: (row) =>
      row.needsHelp ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-bold whitespace-nowrap text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
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
  const [params, setParams] = useSearchParams()
  const requestedPeriod = params.get('period') ?? ''
  const period = isPeriodId(requestedPeriod) ? requestedPeriod : '30d'
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
        onPeriodChange={(value) =>
          setParams((previous) => {
            const next = new URLSearchParams(previous)
            next.set('period', value)
            return next
          })
        }
        actions={
          onNavigate && (
            <Button size="md" onClick={() => onNavigate('course-assignment')}>
              <ClipboardCheck size={16} aria-hidden="true" /> Review homework
            </Button>
          )
        }
      />

      {query.isError && !data ? (
        <InsightsError onRetry={() => void query.refetch()} />
      ) : (
        <>
          {query.isError && (
            <InsightsStale onRetry={() => void query.refetch()} />
          )}
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
              loading={loading}
            >
              {data && data.kpis.classes.current > 0 ? (
                <BarTrendChart
                  data={data.classTrend}
                  series={CLASS_SERIES}
                  caption="Classes scheduled and completed"
                />
              ) : (
                <EmptyState
                  size="sm"
                  className="flex-1"
                  icon={CalendarCheck}
                  title="No classes in this period"
                  description="Classes you teach appear here once they have taken place. Try a longer period, or check your schedule."
                  action={
                    <NavButton
                      label="Open my schedule"
                      view="schedule"
                      onNavigate={onNavigate}
                    />
                  }
                />
              )}
            </ChartCard>
            <ChartCard
              title="Homework status"
              subtitle="All homework you set"
              loading={loading}
            >
              {data && data.homework.length > 0 ? (
                <DonutChart data={data.homework} centerLabel="Assignments" />
              ) : (
                <EmptyState
                  size="sm"
                  className="flex-1"
                  icon={ClipboardCheck}
                  title="No homework yet"
                  description="Homework you set will be tracked here."
                  action={
                    <NavButton
                      label="Assign homework"
                      view="course-assignment"
                      onNavigate={onNavigate}
                    />
                  }
                />
              )}
            </ChartCard>
          </div>

          <ChartCard
            title="My students"
            subtitle="Students needing help are listed first"
            size="list"
            loading={loading}
          >
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
                  className="flex-1"
                  icon={Users}
                  title="No students assigned yet"
                  description="An admin assigns students to you in Users & Staff. Keep your availability up to date so classes can be booked."
                  action={
                    <NavButton
                      label="Update availability"
                      view="schedule"
                      onNavigate={onNavigate}
                    />
                  }
                />
              }
            />
          </ChartCard>

          <ChartCard
            title="Where students get stuck"
            subtitle="Quizzes with the lowest pass rate"
            size="auto"
            loading={loading}
          >
            {data && data.stuckQuizzes.length > 0 ? (
              <ol className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
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
                className="flex-1"
                icon={BookOpenCheck}
                title="No sticking points"
                description="Quizzes your students struggle with will appear here."
                action={
                  <NavButton
                    label="View student results"
                    view="students"
                    onNavigate={onNavigate}
                  />
                }
              />
            )}
          </ChartCard>
        </>
      )}
    </section>
  )
}
