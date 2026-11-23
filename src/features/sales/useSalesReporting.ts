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

export function useSalesReporting(isDemo: boolean, now: number) {
  const today = new Date(now)
  const chartEnd = new Date(now)
  chartEnd.setHours(23, 59, 59, 999)
  return useQuery({
    queryKey: [
      'dashboard-sales-report',
      startOfMonth(today).toISOString(),
      today.toISOString(),
      chartEnd.toISOString(),
    ],
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase
        .rpc('dashboard_sales_metrics', {
          p_from: startOfMonth(today).toISOString(),
          p_to: today.toISOString(),
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
