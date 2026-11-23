import {
  emptySalesStats,
  reportWeeks,
  useSalesReporting,
} from './useSalesReporting'
import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Award,
  BadgeCheck,
  BarChart3,
  CalendarCheck2,
  CalendarPlus,
  Contact,
  Percent,
  TrendingUp,
  UserCheck,
  Wallet,
} from 'lucide-react'
import { Toaster } from 'react-hot-toast'

import { useNow } from '../../hooks/useNow'
import { formatMoney } from '../../lib/money'
import { BookTrialWizard } from './BookTrialWizard'
import { gradeCategory } from './gradeCategories'
import { visibleLeads, waitingForTrial } from './leads'
import {
  achievements,
  funnelStats,
  percent,
  startOfMonth,
  weeklySales,
} from './metrics'
import { SALES_NAV, type SalesView } from './navigation'
import { ParentsList } from './ParentsList'
import { useSalesData } from './salesDataContext'
import { SalesBookingsList } from './SalesBookingsList'
import { SalesWeeklyChart } from './SalesWeeklyChart'
import type { SalesRep } from './types'
import { EmptyState, Kpi, Panel, StatusBadge } from './ui'
import { trialTime } from './whatsapp'
import { WhatsAppFeed } from './WhatsAppFeed'

const PAGE_INTRO: Record<SalesView, string> = {
  dashboard: 'Your trials, sales and follow-ups this month.',
  parents:
    'Everyone to reach out to. Message or call them, then book a trial once you know about their child.',
  book: 'Pick a day and shift, choose a tutor’s open session, then add the student and their parent.',
  bookings: 'Your trials and what happened next.',
  whatsapp: 'Messages to your parents and their replies.',
}

/**
 * A sales rep's pages: their numbers, the parents to reach out to, trial
 * booking, bookings and WhatsApp. The sidebar (dashboard or preview) picks
 * `view`.
 */
export function SalesRepDashboard({
  rep,
  view,
  onNavigate,
  banner,
}: {
  rep: SalesRep
  view: SalesView
  onNavigate: (view: SalesView) => void
  /** Shown under the page heading, e.g. the demo-data notice. */
  banner?: ReactNode
}) {
  // The parent picked in "Parents" when the rep chose "Book trial".
  const [bookingFor, setBookingFor] = useState<string | null>(null)
  const [shownView, setShownView] = useState(view)
  if (shownView !== view) {
    // Opening "Book a Trial" from the sidebar starts with a new parent.
    setShownView(view)
    if (view !== 'book') setBookingFor(null)
  }

  const title =
    view === 'dashboard'
      ? `Hi ${rep.name.split(' ')[0] || 'there'} 👋`
      : (SALES_NAV.find((item) => item.id === view)?.label ?? '')

  return (
    <div className="space-y-5">
      <Toaster position="top-right" />
      <header>
        <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
          {title}
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
          {PAGE_INTRO[view]}
        </p>
      </header>
      {banner}
      {view === 'dashboard' && (
        <RepOverview rep={rep} onNavigate={onNavigate} />
      )}
      {view === 'parents' && (
        <ParentsList
          repId={rep.id}
          onBook={(leadId) => {
            setBookingFor(leadId)
            onNavigate('book')
          }}
        />
      )}
      {view === 'book' && (
        <BookTrialWizard
          key={bookingFor ?? 'new'}
          salesRepId={rep.id}
          initialLeadId={bookingFor}
        />
      )}
      {view === 'bookings' && (
        <SalesBookingsList repId={rep.id} creditRepId={rep.id} />
      )}
      {view === 'whatsapp' && <WhatsAppFeed repId={rep.id} />}
    </div>
  )
}

function RepOverview({
  rep,
  onNavigate,
}: {
  rep: SalesRep
  onNavigate: (view: SalesView) => void
}) {
  const data = useSalesData()
  const now = useNow(60_000)
  const report = useSalesReporting(data.isDemo, now)
  const metrics = report.data

  const view = useMemo(() => {
    const today = new Date(now)
    const month =
      metrics?.stats[rep.id] ??
      (data.isDemo
        ? funnelStats(data, rep.id, startOfMonth(today), today)
        : emptySalesStats)
    const upcoming = data.bookings
      .filter(
        (booking) =>
          booking.salesRepId === rep.id &&
          booking.status === 'scheduled' &&
          new Date(booking.start).getTime() >= now,
      )
      .toSorted(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
      )
      .slice(0, 5)
    const recentSales = data.sales
      .filter((sale) => sale.salesRepId === rep.id)
      .toSorted(
        (a, b) =>
          new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime(),
      )
      .slice(0, 6)
    const bookingsById = new Map(data.bookings.map((b) => [b.id, b]))
    const waiting = visibleLeads(data.leads, rep.id).filter((lead) =>
      waitingForTrial(lead, bookingsById),
    )
    return {
      month,
      upcoming,
      waiting: waiting.length,
      notContacted: waiting.filter((lead) => lead.status === 'new').length,
      recentSales,
      weeks: metrics
        ? reportWeeks(metrics, rep.id, today)
        : weeklySales(data.sales, rep.id, today),
      badges: achievements(data, rep, today),
    }
  }, [data, metrics, rep, now])

  if (!data.isDemo && !metrics) {
    return report.isError ? (
      <div role="alert" className="space-y-2">
        <p>Sales totals could not load.</p>
        <button
          type="button"
          className="underline"
          onClick={() => void report.refetch()}
        >
          Try again
        </button>
      </div>
    ) : (
      <output>Loading sales totals…</output>
    )
  }

  const progress = Math.min(1, view.month.sales / rep.monthlyTarget)
  const monthName = new Date(now).toLocaleDateString([], { month: 'long' })

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi
          label="Successful sales"
          value={view.month.sales}
          hint={`of ${rep.monthlyTarget} target · ${monthName}`}
          icon={BadgeCheck}
        />
        <Kpi
          label="Revenue"
          value={formatMoney(view.month.revenue)}
          hint={monthName}
          icon={Wallet}
        />
        <Kpi
          label="Trials booked"
          value={view.month.booked}
          hint={`${view.month.held} held so far`}
          icon={CalendarCheck2}
        />
        <Kpi
          label="Show-up rate"
          value={percent(view.month.showUp)}
          hint={`${view.month.noShows} no-shows`}
          icon={UserCheck}
        />
        <Kpi
          label="Trial → sale"
          value={percent(view.month.conversion)}
          hint="of trials held"
          icon={Percent}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Panel title={`${monthName} target`} icon={TrendingUp}>
          <p className="text-4xl font-black text-slate-950 tabular-nums dark:text-white">
            {view.month.sales}
            <span className="text-lg font-bold text-slate-400">
              {' '}
              / {rep.monthlyTarget}
            </span>
          </p>
          <div
            className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"
            // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a styled bar; native <progress> can't be restyled consistently across browsers
            role="progressbar"
            aria-label="Progress to monthly target"
            aria-valuemin={0}
            aria-valuemax={rep.monthlyTarget}
            aria-valuenow={view.month.sales}
          >
            <div
              className="h-full rounded-full bg-purple-600 transition-[width] duration-500 dark:bg-purple-400"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            {view.month.sales >= rep.monthlyTarget
              ? 'Target reached. Everything from here is a bonus.'
              : `${rep.monthlyTarget - view.month.sales} more to hit target.`}
          </p>
          <div className="mt-4 rounded-xl bg-slate-50 p-3 dark:bg-white/5">
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              {view.waiting === 1
                ? '1 parent waiting for a trial'
                : `${view.waiting} parents waiting for a trial`}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {view.notContacted === 0
                ? 'You’ve reached out to all of them.'
                : `${view.notContacted} not contacted yet.`}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onNavigate('parents')}
                className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-3.5 py-2 text-sm font-extrabold text-white hover:bg-purple-700"
              >
                <Contact size={16} aria-hidden /> See parents
              </button>
              <button
                type="button"
                onClick={() => onNavigate('book')}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/5"
              >
                <CalendarPlus size={16} aria-hidden /> Book a trial
              </button>
            </div>
          </div>
        </Panel>

        <Panel
          title="Sales per week"
          icon={BarChart3}
          className="lg:col-span-2"
        >
          <SalesWeeklyChart data={view.weeks} />
        </Panel>
      </div>

      <Panel title="Achievements" icon={Award}>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {view.badges.map((badge) => (
            <li
              key={badge.id}
              className={`flex items-start gap-3 rounded-xl border p-3 ${
                badge.earned
                  ? 'border-purple-200 bg-purple-50 dark:border-purple-500/30 dark:bg-purple-500/10'
                  : 'border-dashed border-slate-200 opacity-70 dark:border-white/10'
              }`}
            >
              <Award
                size={20}
                aria-hidden
                className={
                  badge.earned
                    ? 'shrink-0 text-purple-600 dark:text-purple-300'
                    : 'shrink-0 text-slate-400'
                }
              />
              <span>
                <span className="block text-sm font-extrabold text-slate-900 dark:text-white">
                  {badge.title}
                  <span className="sr-only">
                    {badge.earned ? ' (earned)' : ' (not yet earned)'}
                  </span>
                </span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  {badge.earned ? 'Earned · ' : ''}
                  {badge.detail}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </Panel>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel title="Recent successful sales" icon={BadgeCheck}>
          {view.recentSales.length === 0 ? (
            <EmptyState>
              No sales yet. Your first one is a trial away.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-white/10">
              {view.recentSales.map((sale) => (
                <li
                  key={sale.id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-slate-900 dark:text-white">
                      {sale.studentName}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {sale.plan} ·{' '}
                      {new Date(sale.closedAt).toLocaleDateString([], {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-black text-emerald-600 tabular-nums dark:text-emerald-400">
                    {formatMoney(sale.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Your next trials" icon={CalendarCheck2}>
          {view.upcoming.length === 0 ? (
            <EmptyState>No upcoming trials booked by you.</EmptyState>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-white/10">
              {view.upcoming.map((booking) => (
                <li
                  key={booking.id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-slate-900 dark:text-white">
                      {booking.studentName}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {trialTime(booking.start)} ·{' '}
                      {gradeCategory(booking.category).label} ·{' '}
                      {data.mentors.find((m) => m.id === booking.mentorId)
                        ?.name ?? 'Mentor'}
                    </span>
                  </span>
                  <StatusBadge status={booking.status} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}
