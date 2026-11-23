import { useSearchParams } from 'react-router-dom'
import type { DashboardNavigation } from '../navigation'
import { useQuery } from '@tanstack/react-query'
import {
  Banknote,
  CheckCircle2,
  Download,
  Megaphone,
  MailWarning,
  Repeat,
  UserPlus,
  UserX,
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
  formatKes,
  formatNumber,
  formatRelative,
  PERIODS,
  isPeriodId,
} from '../../components/dashboard/period'
import { EmptyState } from '../../components/ui/EmptyState'
import { Button } from '../../components/ui/Button'
import { queryKeys } from '../../lib/queryClient'
import {
  adminInsightsCsv,
  loadAdminInsights,
  type ActionItem,
} from './adminInsights'
import { InsightsError, InsightsStale } from './InsightsError'
import { NavButton } from './NavButton'

const REVENUE_SERIES = [
  { key: 'revenue', label: 'Revenue', color: SERIES_COLORS.purple },
] as const

const ACTION_COPY = {
  unassigned: {
    label: 'Trial has no tutor',
    icon: UserX,
    fix: 'Open trial queue',
  },
  invite_failed: {
    label: 'Invite email failed',
    icon: MailWarning,
    fix: 'Open booking',
  },
} as const

function downloadCsv(filename: string, csv: string) {
  const url = URL.createObjectURL(
    new Blob([csv], { type: 'text/csv;charset=utf-8' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/** Business health for owners and admins: revenue, growth, funnel, to-dos. */
export function AdminInsights({
  onNavigate,
}: {
  onNavigate?: DashboardNavigation
}) {
  const [params, setParams] = useSearchParams()
  const requestedPeriod = params.get('period') ?? ''
  const period = isPeriodId(requestedPeriod) ? requestedPeriod : '30d'
  const query = useQuery({
    queryKey: queryKeys.dashboard.admin(period),
    queryFn: () => loadAdminInsights(period),
    staleTime: 60_000,
  })
  const data = query.data
  const loading = query.isPending
  const unavailable = new Set(data?.unavailable)
  const canExport =
    Boolean(data) &&
    !query.isError &&
    !(['revenue', 'students', 'conversion', 'leads'] as const).some((metric) =>
      unavailable.has(metric),
    )
  const periodLabel =
    PERIODS.find((option) => option.id === period)?.label ?? ''

  const actionColumns: DataColumn<ActionItem>[] = [
    {
      key: 'issue',
      header: 'Issue',
      sortValue: (row) => row.kind,
      render: (row) => {
        const { icon: Icon, label } = ACTION_COPY[row.kind]
        return (
          <span className="inline-flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
            <Icon
              size={16}
              aria-hidden="true"
              className="text-amber-600 dark:text-amber-400"
            />
            {label}
          </span>
        )
      },
    },
    {
      key: 'student',
      header: 'Student',
      sortValue: (row) => row.student,
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate">{row.student}</p>
          {row.parent && (
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              Parent: {row.parent}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'age',
      header: 'Booked',
      sortValue: (row) => (row.createdAt ? Date.parse(row.createdAt) : null),
      render: (row) => formatRelative(row.createdAt),
    },
    {
      key: 'fix',
      header: '',
      className: 'text-right',
      render: (row) =>
        onNavigate ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              onNavigate(
                row.view,
                row.targetId
                  ? {
                      [row.view === 'sales' ? 'booking' : 'lead']: row.targetId,
                    }
                  : undefined,
              )
            }
          >
            {ACTION_COPY[row.kind].fix}
          </Button>
        ) : null,
    },
  ]

  return (
    <section aria-labelledby="admin-insights" className="space-y-6">
      <DashboardHeader
        title={<span id="admin-insights">Business overview</span>}
        subtitle="Revenue, growth and the items that need someone today."
        period={period}
        onPeriodChange={(value) =>
          setParams((previous) => {
            const next = new URLSearchParams(previous)
            next.set('period', value)
            return next
          })
        }
        actions={
          <Button
            disabled={!canExport}
            onClick={() => {
              if (data && canExport)
                downloadCsv(
                  `tech-talk-hub-report-${period}.csv`,
                  adminInsightsCsv(data, periodLabel),
                )
            }}
          >
            <Download size={16} aria-hidden="true" /> Export report
          </Button>
        }
      />

      {query.isError && !data ? (
        <InsightsError onRetry={() => void query.refetch()} />
      ) : (
        <>
          {query.isError && (
            <InsightsStale onRetry={() => void query.refetch()} />
          )}
          {unavailable.size > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <output>Some dashboard information is unavailable.</output>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void query.refetch()}
              >
                Retry
              </Button>
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title="Revenue"
              icon={Banknote}
              accent="green"
              loading={loading}
              value={
                unavailable.has('revenue')
                  ? 'Unavailable'
                  : formatKes(data?.kpis.revenue.current ?? 0)
              }
              change={
                unavailable.has('revenue')
                  ? undefined
                  : data?.kpis.revenue.change
              }
            />
            <KpiCard
              title="Active students"
              icon={Users}
              accent="blue"
              loading={loading}
              value={
                unavailable.has('students')
                  ? 'Unavailable'
                  : formatNumber(data?.kpis.students.active ?? 0)
              }
              hint={
                unavailable.has('students') ? undefined : (
                  <>
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      +{data?.kpis.students.newCurrent ?? 0}
                    </span>{' '}
                    joined in this period
                  </>
                )
              }
            />
            <KpiCard
              title="Trial to paid"
              icon={Repeat}
              accent="purple"
              loading={loading}
              value={
                unavailable.has('conversion')
                  ? 'Unavailable'
                  : data?.kpis.conversion.current === null ||
                      data?.kpis.conversion.current === undefined
                    ? '—'
                    : `${data.kpis.conversion.current}%`
              }
              change={
                unavailable.has('conversion') ||
                data?.kpis.conversion.current === null
                  ? undefined
                  : data?.kpis.conversion.change
              }
              hint={
                !unavailable.has('conversion') &&
                data?.kpis.conversion.current === null
                  ? 'No trials booked in this period'
                  : undefined
              }
            />
            <KpiCard
              title="New leads"
              icon={UserPlus}
              accent="amber"
              loading={loading}
              value={
                unavailable.has('leads')
                  ? 'Unavailable'
                  : formatNumber(data?.kpis.leads.current ?? 0)
              }
              change={
                unavailable.has('leads') ? undefined : data?.kpis.leads.change
              }
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <ChartCard
              title="Revenue"
              subtitle={`${data?.kpis.revenue.sales ?? 0} sales closed · ${periodLabel.toLowerCase()}`}
              className="lg:col-span-2"
              loading={loading}
            >
              {data && data.kpis.revenue.current > 0 ? (
                <BarTrendChart
                  data={data.revenueTrend}
                  series={REVENUE_SERIES}
                  caption="Revenue per period in Kenyan shillings"
                  format={formatKes}
                />
              ) : (
                <EmptyState
                  size="sm"
                  className="flex-1"
                  icon={Banknote}
                  title="No sales recorded in this period"
                  description="Sales the team records appear here. Try a longer period."
                  action={
                    <NavButton
                      label="Open Sales & Trials"
                      view="sales"
                      onNavigate={onNavigate}
                    />
                  }
                />
              )}
            </ChartCard>
            <ChartCard
              title="Where leads come from"
              subtitle="New leads by source"
              loading={loading}
            >
              {unavailable.has('leads') ? (
                <p>Lead sources unavailable.</p>
              ) : data && data.leadSources.length > 0 ? (
                <DonutChart data={data.leadSources} centerLabel="Leads" />
              ) : (
                <EmptyState
                  size="sm"
                  className="flex-1"
                  icon={Megaphone}
                  title="No new leads"
                  description="Leads captured in this period appear here."
                  action={
                    <NavButton
                      label="Open Leads"
                      view="Leads"
                      onNavigate={onNavigate}
                    />
                  }
                />
              )}
            </ChartCard>
          </div>

          <ChartCard
            title="Needs attention"
            subtitle="Trials without a tutor and invite emails that did not send"
            size="auto"
            loading={loading}
          >
            {unavailable.has('actions') && (
              <p className="mb-3">Some action items could not be loaded.</p>
            )}
            <DataTable
              rows={data?.actions ?? []}
              columns={actionColumns}
              rowKey={(row) => row.id}
              caption="Items that need attention"
              initialSort={{ key: 'age', direction: 'asc' }}
              empty={
                <EmptyState
                  size="sm"
                  tone="brand"
                  icon={CheckCircle2}
                  title={
                    unavailable.has('actions')
                      ? 'Action items unavailable'
                      : 'Nothing needs attention'
                  }
                  description={
                    unavailable.has('actions')
                      ? undefined
                      : 'No unassigned trials or failed invites were returned.'
                  }
                />
              }
            />
          </ChartCard>
        </>
      )}
    </section>
  )
}
