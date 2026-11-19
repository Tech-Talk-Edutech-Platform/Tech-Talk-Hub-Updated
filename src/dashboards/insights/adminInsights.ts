import { supabase } from '../../supabase'
import {
  bucketSeries,
  percentChange,
  periodHalf,
  periodRange,
  type ChartPoint,
  type PeriodId,
} from '../../components/dashboard/period'
import { optionalRows } from './optionalRows'

export type ActionItem = {
  id: string
  kind: 'unassigned' | 'invite_failed'
  student: string
  parent: string | null
  createdAt: string | null
  /** Dashboard view where the item is resolved. */
  view: 'global-schedule' | 'sales'
}

export type AdminInsights = {
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
  const text = value === null ? '' : String(value)
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function sourceLabel(source: string | null) {
  const text = source?.trim()
  if (!text) return 'Unknown'
  return text.charAt(0).toUpperCase() + text.slice(1).replaceAll('_', ' ')
}

export async function loadAdminInsights(
  periodId: PeriodId,
): Promise<AdminInsights> {
  const range = periodRange(periodId)
  const since = range.previousStart.toISOString()

  const [
    sales,
    activeStudents,
    newStudents,
    trials,
    leads,
    unassigned,
    failedInvites,
  ] = await Promise.all([
    optionalRows(
      'sales',
      supabase
        .from('sales')
        .select('amount_kes, closed_at')
        .gte('closed_at', since),
    ),
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'student')
      .neq('is_active', false),
    optionalRows(
      'new students',
      supabase
        .from('users')
        .select('created_at')
        .eq('role', 'student')
        .gte('created_at', since),
    ),
    optionalRows(
      'trials',
      supabase
        .from('trial_bookings')
        .select('created_at, status')
        .is('removed_at', null)
        .gte('created_at', since),
    ),
    optionalRows(
      'leads',
      supabase
        .from('leads')
        .select('created_at, lead_source')
        .gte('created_at', since),
    ),
    optionalRows(
      'unassigned trials',
      supabase
        .from('trial_bookings')
        .select('id, student_name, parent_name, created_at')
        .is('mentor_id', null)
        .is('removed_at', null)
        .eq('status', 'scheduled')
        .order('created_at', { ascending: true })
        .limit(20),
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
    ),
  ])
  if (activeStudents.error) throw activeStudents.error

  const revenue = { current: 0, previous: 0, sales: 0 }
  for (const sale of sales) {
    const half = periodHalf(range, sale.closed_at)
    if (!half) continue
    revenue[half] += sale.amount_kes
    if (half === 'current') revenue.sales += 1
  }

  const newCount = { current: 0, previous: 0 }
  for (const student of newStudents) {
    const half = periodHalf(range, student.created_at)
    if (half) newCount[half] += 1
  }

  const trialCount = {
    current: { all: 0, converted: 0 },
    previous: { all: 0, converted: 0 },
  }
  for (const trial of trials) {
    const half = periodHalf(range, trial.created_at)
    if (!half || trial.status === 'cancelled') continue
    trialCount[half].all += 1
    if (trial.status === 'converted') trialCount[half].converted += 1
  }
  const conversionCurrent = conversionRate(trialCount.current)
  const conversionPrevious = conversionRate(trialCount.previous)

  const leadCount = { current: 0, previous: 0 }
  const sources = new Map<string, number>()
  for (const lead of leads) {
    const half = periodHalf(range, lead.created_at)
    if (!half) continue
    leadCount[half] += 1
    if (half === 'current') {
      const label = sourceLabel(lead.lead_source)
      sources.set(label, (sources.get(label) ?? 0) + 1)
    }
  }
  const ranked = [...sources.entries()]
    .map(([name, value]) => ({ name, value }))
    .toSorted((a, b) => b.value - a.value)
  const otherTotal = ranked
    .slice(MAX_SOURCES)
    .reduce((sum, item) => sum + item.value, 0)
  const leadSources = [
    ...ranked.slice(0, MAX_SOURCES),
    ...(otherTotal ? [{ name: 'Other', value: otherTotal }] : []),
  ]

  return {
    kpis: {
      revenue: {
        current: revenue.current,
        change: percentChange(revenue.current, revenue.previous),
        sales: revenue.sales,
      },
      students: {
        active: activeStudents.count ?? 0,
        newCurrent: newCount.current,
        change: percentChange(newCount.current, newCount.previous),
      },
      conversion: {
        current: conversionCurrent,
        change:
          conversionCurrent === null || conversionPrevious === null
            ? null
            : percentChange(conversionCurrent, conversionPrevious),
        trials: trialCount.current.all,
      },
      leads: {
        current: leadCount.current,
        change: percentChange(leadCount.current, leadCount.previous),
      },
    },
    revenueTrend: bucketSeries(
      range,
      sales.flatMap((sale) =>
        periodHalf(range, sale.closed_at) === 'current' && sale.closed_at
          ? [
              {
                at: sale.closed_at,
                key: 'revenue' as const,
                value: sale.amount_kes,
              },
            ]
          : [],
      ),
      ['revenue'],
    ),
    leadSources,
    actions: [
      ...unassigned.map((trial) => ({
        id: `unassigned-${trial.id}`,
        kind: 'unassigned' as const,
        student: trial.student_name,
        parent: trial.parent_name,
        createdAt: trial.created_at,
        view: 'global-schedule' as const,
      })),
      ...failedInvites.map((trial) => ({
        id: `invite-${trial.id}`,
        kind: 'invite_failed' as const,
        student: trial.student_name,
        parent: trial.parent_name,
        createdAt: trial.created_at,
        view: 'sales' as const,
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
