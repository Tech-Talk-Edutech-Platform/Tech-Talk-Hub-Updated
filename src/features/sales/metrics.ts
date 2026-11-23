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

/**
 * Milestones shown on a rep's dashboard. On real data a rep only has their own
 * sales, so "Top closer" needs `week` from sales_rep_standing(); without it
 * (demo data) it's worked out from `data`.
 */
export function achievements(
  data: Pick<SalesData, 'bookings' | 'sales' | 'reps'>,
  rep: SalesRep,
  now: Date,
  week?: { mine: number; top: number },
): Achievement[] {
  const month = funnelStats(data, rep.id, startOfMonth(now), now)
  const weekAgo = new Date(now.getTime() - 7 * DAY)
  const thisWeek = (id: string) =>
    data.sales.filter(
      (sale) => sale.salesRepId === id && inRange(sale.closedAt, weekAgo, now),
    ).length
  const mineThisWeek = week?.mine ?? thisWeek(rep.id)
  const topThisWeek =
    week?.top ?? Math.max(0, ...data.reps.map((r) => thisWeek(r.id)))
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
      earned: topThisWeek > 0 && mineThisWeek === topThisWeek,
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

/** Rank among `reps` by sales in [from, to): 1 = most, ties share. Demo only. */
export function teamStanding(
  data: Pick<SalesData, 'sales' | 'reps'>,
  repId: string,
  from: Date,
  to: Date,
) {
  const count = (id: string, start: Date) =>
    data.sales.filter(
      (sale) => sale.salesRepId === id && inRange(sale.closedAt, start, to),
    ).length
  const mine = count(repId, from)
  const weekAgo = new Date(to.getTime() - 7 * DAY)
  return {
    rank: 1 + data.reps.filter((rep) => count(rep.id, from) > mine).length,
    reps: Math.max(1, data.reps.length),
    weekMine: count(repId, weekAgo),
    weekTop: Math.max(0, ...data.reps.map((rep) => count(rep.id, weekAgo))),
  }
}

export type FunnelStep = { id: string; label: string; count: number }

/**
 * What happened to the parents a rep took on in [from, to): reached out to,
 * booked, came to the trial, enrolled. Each step counts parents, so it never
 * grows from one step to the next.
 */
export function leadFunnel(
  data: Pick<SalesData, 'leads' | 'bookings'>,
  repId: string,
  from: Date,
  to: Date,
): FunnelStep[] {
  const leads = data.leads.filter(
    (lead) => lead.salesRepId === repId && inRange(lead.createdAt, from, to),
  )
  const bookingsByLead = new Map<string, TrialBooking[]>()
  for (const booking of data.bookings) {
    if (!booking.leadId || booking.status === 'cancelled') continue
    const list = bookingsByLead.get(booking.leadId) ?? []
    list.push(booking)
    bookingsByLead.set(booking.leadId, list)
  }
  const reached = leads.filter((lead) => lead.status !== 'new')
  const booked = reached.filter((lead) => bookingsByLead.has(lead.id))
  const came = booked.filter((lead) =>
    bookingsByLead.get(lead.id)?.some((b) => HELD.has(b.status)),
  )
  const enrolled = came.filter((lead) =>
    bookingsByLead.get(lead.id)?.some((b) => b.status === 'converted'),
  )
  return [
    { id: 'added', label: 'Parents taken on', count: leads.length },
    { id: 'reached', label: 'Reached out to', count: reached.length },
    { id: 'booked', label: 'Trial booked', count: booked.length },
    { id: 'came', label: 'Came to the trial', count: came.length },
    { id: 'enrolled', label: 'Enrolled', count: enrolled.length },
  ]
}

export type SalesPeriod = 'this-month' | 'last-month'

/**
 * The period on screen and the one it's compared with. This month runs to
 * now and is compared with the same stretch of last month; last month is
 * compared with the whole month before.
 */
export function salesPeriods(period: SalesPeriod, now: Date) {
  const thisMonth = startOfMonth(now)
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const monthBefore = new Date(now.getFullYear(), now.getMonth() - 2, 1)
  if (period === 'last-month') {
    return {
      from: lastMonth,
      to: thisMonth,
      previousFrom: monthBefore,
      previousTo: lastMonth,
    }
  }
  const elapsed = now.getTime() - thisMonth.getTime()
  return {
    from: thisMonth,
    to: now,
    previousFrom: lastMonth,
    previousTo: new Date(
      Math.min(lastMonth.getTime() + elapsed, thisMonth.getTime()),
    ),
  }
}
