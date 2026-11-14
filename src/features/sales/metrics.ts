import type { SalesData } from './salesDataContext'
import type { Sale, SalesRep, TrialBooking } from './types'

const DAY = 86_400_000

export function startOfMonth(now: Date) {
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

const inRange = (iso: string, from: Date, to: Date) => {
  const time = new Date(iso).getTime()
  return time >= from.getTime() && time < to.getTime()
}

/** Trials that happened (the student showed up), whatever the outcome. */
const HELD = new Set(['attended', 'converted', 'lost'])

export type FunnelStats = {
  /** Trials booked in the period (by booking date). */
  booked: number
  /** Trials that took place in the period. */
  held: number
  noShows: number
  sales: number
  revenue: number
  /** Share of held trials that enrolled, 0–1; null when none were held. */
  conversion: number | null
  /** Share of due trials the student attended, 0–1; null when none were due. */
  showUp: number | null
}

/** Funnel numbers for one rep, or the whole team when `repId` is null. */
export function funnelStats(
  data: Pick<SalesData, 'bookings' | 'sales'>,
  repId: string | null,
  from: Date,
  to: Date,
): FunnelStats {
  const mine = (booking: TrialBooking) =>
    repId === null || booking.salesRepId === repId
  const bookings = data.bookings.filter(mine)
  const booked = bookings.filter((b) => inRange(b.createdAt, from, to)).length
  const due = bookings.filter(
    (b) => inRange(b.start, from, to) && b.status !== 'cancelled',
  )
  const held = due.filter((b) => HELD.has(b.status)).length
  const noShows = due.filter((b) => b.status === 'no_show').length
  const sales = data.sales.filter(
    (sale) =>
      (repId === null || sale.salesRepId === repId) &&
      inRange(sale.closedAt, from, to),
  )
  const revenue = sales.reduce((sum, sale) => sum + sale.amount, 0)
  return {
    booked,
    held,
    noShows,
    sales: sales.length,
    revenue,
    conversion: held ? sales.length / held : null,
    showUp: held + noShows ? held / (held + noShows) : null,
  }
}

export type WeekPoint = { week: string; sales: number; revenue: number }

/** Sales per week for the last `weeks` weeks, oldest first. */
export function weeklySales(
  sales: readonly Sale[],
  repId: string | null,
  now: Date,
  weeks = 6,
): WeekPoint[] {
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)
  return Array.from({ length: weeks }, (_, index) => {
    const weekEnd = new Date(end.getTime() - (weeks - 1 - index) * 7 * DAY)
    const weekStart = new Date(weekEnd.getTime() - 7 * DAY)
    const inWeek = sales.filter(
      (sale) =>
        (repId === null || sale.salesRepId === repId) &&
        inRange(sale.closedAt, weekStart, weekEnd),
    )
    return {
      week:
        index === weeks - 1
          ? 'This week'
          : new Date(weekStart.getTime() + DAY).toLocaleDateString([], {
              day: 'numeric',
              month: 'short',
            }),
      sales: inWeek.length,
      revenue: inWeek.reduce((sum, sale) => sum + sale.amount, 0),
    }
  })
}

export type Achievement = {
  id: string
  title: string
  detail: string
  earned: boolean
}

/** Milestones shown on a rep's dashboard. */
export function achievements(
  data: Pick<SalesData, 'bookings' | 'sales' | 'reps'>,
  rep: SalesRep,
  now: Date,
): Achievement[] {
  const month = funnelStats(data, rep.id, startOfMonth(now), now)
  const weekAgo = new Date(now.getTime() - 7 * DAY)
  const thisWeek = (id: string) =>
    data.sales.filter(
      (sale) => sale.salesRepId === id && inRange(sale.closedAt, weekAgo, now),
    ).length
  const topThisWeek = Math.max(...data.reps.map((r) => thisWeek(r.id)))
  const bigTicket = data.sales.some(
    (sale) => sale.salesRepId === rep.id && sale.amount >= 100_000,
  )

  return [
    {
      id: 'first-sale',
      title: 'First enrolment this month',
      detail: 'Close one trial into a paid plan.',
      earned: month.sales >= 1,
    },
    {
      id: 'halfway',
      title: 'Halfway to target',
      detail: `${Math.ceil(rep.monthlyTarget / 2)} sales this month.`,
      earned: month.sales >= rep.monthlyTarget / 2,
    },
    {
      id: 'target',
      title: 'Monthly target hit',
      detail: `${rep.monthlyTarget} sales this month.`,
      earned: month.sales >= rep.monthlyTarget,
    },
    {
      id: 'top-closer',
      title: 'Top closer this week',
      detail: 'Most enrolments on the team in the last 7 days.',
      earned: topThisWeek > 0 && thisWeek(rep.id) === topThisWeek,
    },
    {
      id: 'annual',
      title: 'Annual plan sold',
      detail: 'Enrol a family on a full-year plan.',
      earned: bigTicket,
    },
    {
      id: 'show-up',
      title: '80% show-up rate',
      detail: 'Keep no-shows low with reminders and follow-ups.',
      earned: (month.showUp ?? 0) >= 0.8 && month.held >= 5,
    },
  ]
}

export const percent = (value: number | null) =>
  value === null ? '—' : `${Math.round(value * 100)}%`
