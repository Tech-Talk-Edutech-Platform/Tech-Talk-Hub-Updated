import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { supabase } from '../../supabase'
import { startOfMonth, weeklySales } from './metrics'

const stats = z.object({
  booked: z.number(),
  held: z.number(),
  noShows: z.number(),
  sales: z.number(),
  revenue: z.number(),
  conversion: z.number().nullable(),
  showUp: z.number().nullable(),
  website: z.number(),
})

const reporting = z.object({
  stats: z.record(stats),
  weeks: z.array(
    z.object({
      scope: z.string(),
      bucket: z.number(),
      sales: z.number(),
      revenue: z.number(),
    }),
  ),
  mentors: z.record(
    z.object({
      held: z.number(),
      converted: z.number(),
      open: z.number(),
      booked: z.number(),
    }),
  ),
})

export const emptySalesStats: z.infer<typeof stats> = {
  booked: 0,
  held: 0,
  noShows: 0,
  sales: 0,
  revenue: 0,
  conversion: null,
  showUp: null,
  website: 0,
}
type SalesReport = z.infer<typeof reporting>

/** Live numbers: this month so far, with the six-week chart up to today. */
export function useSalesReporting(isDemo: boolean, now: number) {
  const today = new Date(now)
  const chartEnd = new Date(now)
  chartEnd.setHours(23, 59, 59, 999)
  return useSalesReport(isDemo, startOfMonth(today), today, chartEnd)
}

/**
 * Totals for [from, to), at most 32 days. The chart weeks end at
 * `chartEnd` (within a day of `to`; defaults to `to`). Reps only ever get
 * their own rows back (RLS on the tables the function reads).
 */
export function useSalesReport(
  isDemo: boolean,
  from: Date,
  to: Date,
  chartEnd: Date = to,
) {
  return useQuery({
    queryKey: [
      'dashboard-sales-report',
      from.toISOString(),
      to.toISOString(),
      chartEnd.toISOString(),
    ],
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase
        .rpc('dashboard_sales_metrics', {
          p_from: from.toISOString(),
          p_to: to.toISOString(),
          p_chart_end: chartEnd.toISOString(),
        })
        .abortSignal(signal)
      if (error) throw error
      return reporting.parse(data)
    },
    enabled: !isDemo,
    placeholderData: keepPreviousData,
  })
}

const standing = z.object({
  /** 1 = most sales in the period; ties share a rank. */
  rank: z.number(),
  reps: z.number(),
  /** Sales in the 7 days before the period's end: the rep's, the team's best. */
  weekMine: z.number(),
  weekTop: z.number(),
})

export type SalesStanding = z.infer<typeof standing>

/**
 * The signed-in rep's place on the team. Counts only: the function never
 * returns other reps' names, families or revenue.
 */
export function useSalesStanding(enabled: boolean, from: Date, to: Date) {
  return useQuery({
    queryKey: [
      'dashboard-sales-standing',
      from.toISOString(),
      to.toISOString(),
    ],
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase
        .rpc('sales_rep_standing', {
          p_from: from.toISOString(),
          p_to: to.toISOString(),
        })
        .abortSignal(signal)
      if (error) throw error
      return standing.parse(data)
    },
    enabled,
    placeholderData: keepPreviousData,
  })
}

export function reportWeeks(data: SalesReport, scope: string, now: Date) {
  const weeks = new Map(
    data.weeks
      .filter((point) => point.scope === scope)
      .map((point) => [point.bucket, point]),
  )
  return weeklySales([], null, now).map((point, index) => {
    const totals = weeks.get(index)
    return totals
      ? { week: point.week, sales: totals.sales, revenue: totals.revenue }
      : point
  })
}
