import { supabase } from '../../supabase'
import {
  bucketSeries,
  percentChange,
  periodRange,
  type ChartPoint,
  type PeriodId,
} from '../../components/dashboard/period'
import { z } from 'zod'
import { optionalRows } from './optionalRows'

export type ActionItem = {
  id: string
  kind: 'unassigned' | 'invite_failed'
  student: string
  parent: string | null
  createdAt: string | null
  /** Dashboard view where the item is resolved. */
  view: 'global-schedule' | 'sales'
  targetId: string | null
}

type AdminPanel = 'revenue' | 'students' | 'conversion' | 'leads' | 'actions'

export type AdminInsights = {
  unavailable: AdminPanel[]
  kpis: {
    revenue: { current: number; change: number | null; sales: number }
    students: { active: number; newCurrent: number; change: number | null }
    conversion: {
      current: number | null
      change: number | null
      trials: number
    }
    leads: { current: number; change: number | null }
  }
  revenueTrend: ChartPoint[]
  leadSources: Array<{ name: string; value: number }>
  actions: ActionItem[]
}

const MAX_SOURCES = 5

function conversionRate(count: { all: number; converted: number }) {
  return count.all ? Math.round((count.converted / count.all) * 100) : null
}

function csvCell(value: string | number | null) {
  const raw = value === null ? '' : String(value)
  const text =
    typeof value === 'string' && /^[\s]*[=+@-]|^[\t\r\n]/.test(raw)
      ? "'" + raw
      : raw
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function sourceLabel(source: string | null) {
  const text = source?.trim()
  if (!text) return 'Unknown'
  return text.charAt(0).toUpperCase() + text.slice(1).replaceAll('_', ' ')
}

const comparison = z.object({ current: z.number(), previous: z.number() })
const adminReport = z.object({
  sales: comparison.extend({ count: z.number() }),
  students: comparison.extend({ active: z.number() }),
  trials: comparison.extend({
    current_converted: z.number(),
    previous_converted: z.number(),
  }),
  leads: comparison,
  revenueBuckets: z.array(z.object({ bucket: z.number(), amount: z.number() })),
  leadSources: z.array(z.object({ source: z.string(), count: z.number() })),
})

export async function loadAdminInsights(
  periodId: PeriodId,
): Promise<AdminInsights> {
  const range = periodRange(periodId)
  const buckets = range.days <= 7 ? range.days : 6
  const unavailable = new Set<AdminPanel>()
  const markUnavailable = (panel: AdminPanel) => () => {
    unavailable.add(panel)
  }

  const [metrics, unassigned, failedInvites] = await Promise.all([
    supabase.rpc('dashboard_admin_metrics', {
      p_previous: range.previousStart.toISOString(),
      p_start: range.start.toISOString(),
      p_end: range.end.toISOString(),
      p_buckets: buckets,
    }),
    optionalRows(
      'unassigned trials',
      supabase
        .from('leads')
        .select('id, student_name, parent_name, created_at')
        .is('assigned_tutor_id', null)
        .order('created_at', { ascending: true })
        .limit(20),
      markUnavailable('actions'),
    ),
    optionalRows(
      'failed invites',
      supabase
        .from('trial_bookings')
        .select('id, student_name, parent_name, created_at')
        .eq('invite_email_status', 'failed')
        .is('removed_at', null)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: true })
        .limit(20),
      markUnavailable('actions'),
    ),
  ])
  if (metrics.error) {
    for (const panel of ['revenue', 'students', 'conversion', 'leads'] as const)
      unavailable.add(panel)
  }
  const report = metrics.error ? null : adminReport.parse(metrics.data)
  const revenue = report?.sales ?? { current: 0, previous: 0, count: 0 }
  const students = report?.students ?? { active: 0, current: 0, previous: 0 }
  const trials = report?.trials ?? {
    current: 0,
    previous: 0,
    current_converted: 0,
    previous_converted: 0,
  }
  const leads = report?.leads ?? { current: 0, previous: 0 }
  const conversionCurrent = conversionRate({
    all: trials.current,
    converted: trials.current_converted,
  })
  const conversionPrevious = conversionRate({
    all: trials.previous,
    converted: trials.previous_converted,
  })

  const sources = new Map<string, number>()
  for (const { source, count } of report?.leadSources ?? []) {
    const label = sourceLabel(source)
    sources.set(label, (sources.get(label) ?? 0) + count)
  }
  const ranked = [...sources.entries()]
    .map(([name, value]) => ({ name, value }))
    .toSorted((a, b) => b.value - a.value || a.name.localeCompare(b.name))
  const otherTotal = ranked
    .slice(MAX_SOURCES)
    .reduce((sum, item) => sum + item.value, 0)
  const leadSources = [
    ...ranked.slice(0, MAX_SOURCES),
    ...(otherTotal ? [{ name: 'Other', value: otherTotal }] : []),
  ]

  return {
    unavailable: [...unavailable],
    kpis: {
      revenue: {
        current: revenue.current,
        change: percentChange(revenue.current, revenue.previous),
        sales: revenue.count,
      },
      students: {
        active: students.active,
        newCurrent: students.current,
        change: percentChange(students.current, students.previous),
      },
      conversion: {
        current: conversionCurrent,
        change:
          conversionCurrent === null || conversionPrevious === null
            ? null
            : percentChange(conversionCurrent, conversionPrevious),
        trials: trials.current,
      },
      leads: {
        current: leads.current,
        change: percentChange(leads.current, leads.previous),
      },
    },
    revenueTrend: bucketSeries(
      range,
      (report?.revenueBuckets ?? []).map(({ bucket, amount }) => ({
        at: new Date(
          range.start.getTime() +
            ((bucket + 0.5) * (range.end.getTime() - range.start.getTime())) /
              buckets,
        ).toISOString(),
        key: 'revenue' as const,
        value: amount,
      })),
      ['revenue'],
    ),
    leadSources,
    actions: [
      ...unassigned.map((trial) => ({
        id: `unassigned-${trial.id}`,
        kind: 'unassigned' as const,
        student: trial.student_name ?? 'Trial student',
        parent: trial.parent_name,
        createdAt: trial.created_at,
        view: 'global-schedule' as const,
        targetId: trial.id,
      })),
      ...failedInvites.map((trial) => ({
        id: `invite-${trial.id}`,
        kind: 'invite_failed' as const,
        student: trial.student_name,
        parent: trial.parent_name,
        createdAt: trial.created_at,
        view: 'sales' as const,
        targetId: trial.id,
      })),
    ],
  }
}

/** CSV of the headline numbers, revenue trend and lead sources. */
export function adminInsightsCsv(data: AdminInsights, periodLabel: string) {
  const rows: Array<Array<string | number | null>> = [
    ['Tech Talk Hub dashboard report', periodLabel],
    [],
    ['Metric', 'Value', 'Change vs previous period (%)'],
    ['Revenue (KES)', data.kpis.revenue.current, data.kpis.revenue.change],
    ['Sales closed', data.kpis.revenue.sales, null],
    ['Active students', data.kpis.students.active, null],
    ['New students', data.kpis.students.newCurrent, data.kpis.students.change],
    [
      'Trial to paid (%)',
      data.kpis.conversion.current,
      data.kpis.conversion.change,
    ],
    ['New leads', data.kpis.leads.current, data.kpis.leads.change],
    [],
    ['Revenue by period', 'KES'],
    ...data.revenueTrend.map((point) => [point.label, Number(point.revenue)]),
    [],
    ['Lead source', 'Leads'],
    ...data.leadSources.map((source) => [source.name, source.value]),
  ]
  return rows.map((row) => row.map(csvCell).join(',')).join('\n')
}
