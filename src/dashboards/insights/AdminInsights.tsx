import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Banknote,
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
  type PeriodId,
} from '../../components/dashboard/period'
import { EmptyState } from '../../components/ui/EmptyState'
import { Button } from '../../components/ui/Button'
import { queryKeys } from '../../lib/queryClient'
import {
  adminInsightsCsv,
  loadAdminInsights,
  type ActionItem,
} from './adminInsights'
import { InsightsError } from './InsightsError'

const REVENUE_SERIES = [
  { key: 'revenue', label: 'Revenue', color: SERIES_COLORS.purple },
] as const

const ACTION_COPY = {
  unassigned: { label: 'Trial has no tutor', icon: UserX, fix: 'Assign' },
  invite_failed: {
    label: 'Invite email failed',
    icon: MailWarning,
    fix: 'Resend',
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
  onNavigate?: (view: string) => void
}) {
  const [period, setPeriod] = useState<PeriodId>('30d')
  const query = useQuery({
    queryKey: queryKeys.dashboard.admin(period),
    queryFn: () => loadAdminInsights(period),
    staleTime: 60_000,
  })
  const data = query.data
  const loading = query.isPending
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
            onClick={() => onNavigate(row.view)}
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
        onPeriodChange={setPeriod}
        actions={
          <Button
            disabled={!data}
            onClick={() => {
              if (data)
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

      {query.isError ? (
        <InsightsError onRetry={() => void query.refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title="Revenue"
              icon={Banknote}
              accent="green"
              loading={loading}
              value={formatKes(data?.kpis.revenue.current ?? 0)}
              change={data?.kpis.revenue.change}
            />
            <KpiCard
              title="Active students"
              icon={Users}
              accent="blue"
              loading={loading}
              value={formatNumber(data?.kpis.students.active ?? 0)}
              hint={
                <>
                  <span className="font-bold text-slate-700 dark:text-slate-200">
                    +{data?.kpis.students.newCurrent ?? 0}
                  </span>{' '}
                  joined in this period
                </>
              }
            />
            <KpiCard
              title="Trial to paid"
              icon={Repeat}
              accent="purple"
              loading={loading}
              value={
                data?.kpis.conversion.current === null ||
                data?.kpis.conversion.current === undefined
                  ? '—'
                  : `${data.kpis.conversion.current}%`
              }
              change={
                data?.kpis.conversion.current === null
                  ? undefined
                  : data?.kpis.conversion.change
              }
              hint={
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
              value={formatNumber(data?.kpis.leads.current ?? 0)}
              change={data?.kpis.leads.change}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <ChartCard
              title="Revenue"
              subtitle={`${data?.kpis.revenue.sales ?? 0} sales closed · ${periodLabel.toLowerCase()}`}
              className="lg:col-span-2"
            >
              {loading ? null : data && data.kpis.revenue.current > 0 ? (
                <BarTrendChart
                  data={data.revenueTrend}
                  series={REVENUE_SERIES}
                  caption="Revenue per period in Kenyan shillings"
                  format={formatKes}
                />
              ) : (
                <EmptyState
                  size="sm"
                  icon={Banknote}
                  title="No sales recorded in this period"
                  description="Sales recorded by the sales team appear here."
                />
              )}
            </ChartCard>
            <ChartCard
              title="Where leads come from"
              subtitle="New leads by source"
            >
              {loading ? null : data && data.leadSources.length > 0 ? (
                <DonutChart data={data.leadSources} centerLabel="Leads" />
              ) : (
                <EmptyState
                  size="sm"
                  icon={Megaphone}
                  title="No new leads"
                  description="Leads captured in this period appear here."
                />
              )}
            </ChartCard>
          </div>

          <ChartCard
            title="Needs attention"
            subtitle="Trials without a tutor and invite emails that did not send"
          >
            {loading ? null : (
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
                    title="Nothing needs attention"
                    description="Every trial has a tutor and every invite email was sent."
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
