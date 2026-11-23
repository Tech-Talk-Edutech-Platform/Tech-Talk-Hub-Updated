import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  Award,
  CalendarPlus,
  Lightbulb,
  PartyPopper,
  Trophy,
} from 'lucide-react'

import { ChartCard } from '../../components/dashboard/ui/ChartCard'
import { DashboardHeader } from '../../components/dashboard/ui/DashboardHeader'
import { percentChange } from '../../components/dashboard/period'
import { Button } from '../../components/ui/Button'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import {
  InsightsError,
  InsightsStale,
} from '../../dashboards/insights/InsightsError'
import { useNow } from '../../hooks/useNow'
import { formatMoney } from '../../lib/money'
import {
  achievements,
  funnelStats,
  leadFunnel,
  percent,
  salesPeriods,
  teamStanding,
  weeklySales,
  type Achievement,
  type FunnelStep,
  type SalesPeriod,
} from './metrics'
import type { SalesView } from './navigation'
import { RepToday } from './RepToday'
import { useSalesData } from './salesDataContext'
import { SalesWeeklyChart } from './SalesWeeklyChart'
import type { Sale, SalesRep } from './types'
import { EmptyState } from './ui'
import {
  emptySalesStats,
  reportWeeks,
  useSalesReport,
  useSalesReporting,
  useSalesStanding,
} from './useSalesReporting'
import { workQueue } from './workQueue'

const DAY = 86_400_000

const PERIOD_OPTIONS: { value: SalesPeriod; label: string }[] = [
  { value: 'this-month', label: 'This month' },
  { value: 'last-month', label: 'Last month' },
]

const monthName = (date: Date) => date.toLocaleDateString([], { month: 'long' })
const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`

/** Where the rep stands against the target spread evenly over the month. */
function targetPace(
  sales: number,
  target: number,
  period: SalesPeriod,
  from: Date,
  to: Date,
) {
  const monthEnd = new Date(from.getFullYear(), from.getMonth() + 1, 1)
  const elapsed =
    period === 'this-month'
      ? (to.getTime() - from.getTime()) / (monthEnd.getTime() - from.getTime())
      : 1
  const pace = Math.floor(target * Math.min(1, elapsed))
  const daysLeft = Math.max(
    0,
    Math.ceil((monthEnd.getTime() - to.getTime()) / DAY),
  )
  const remaining = Math.max(0, target - sales)
  const tone: 'good' | 'behind' =
    sales >= target || sales >= pace ? 'good' : 'behind'
  let headline: string
  let detail: string
  if (sales >= target) {
    headline = 'Target reached'
    detail = 'Everything from here is a bonus.'
  } else if (period === 'last-month') {
    headline = `Finished ${remaining} short`
    detail = `${sales} of ${target} sales.`
  } else if (sales >= pace) {
    headline = 'On pace'
    detail = `${remaining} more in ${plural(daysLeft, 'day')} hits target.`
  } else {
    headline = `${pace - sales} behind pace`
    detail = `${remaining} more in ${plural(daysLeft, 'day')} hits target.`
  }
  return { pace, tone, headline, detail }
}

/**
 * A rep's dashboard in three zones, in the order a rep thinks: "how am I
 * doing?" (one card), "what do I do now?" (the to-do list beside recent wins),
 * then "why?" (trend and where parents drop off).
 */
export function RepOverview({
  rep,
  title,
  banner,
  onNavigate,
}: {
  rep: SalesRep
  title: string
  intro?: string
  banner?: ReactNode
  onNavigate: (view: SalesView) => void
}) {
  const data = useSalesData()
  const now = useNow(60_000)
  const [period, setPeriod] = useState<SalesPeriod>('this-month')
  const range = useMemo(
    () => salesPeriods(period, new Date(now)),
    [period, now],
  )

  // Live report: this month so far, plus the six-week chart.
  const live = useSalesReporting(data.isDemo, now)
  // On "This month" this is the same request as `live`, so it's shared.
  const endOfToday = new Date(now)
  endOfToday.setHours(23, 59, 59, 999)
  const current = useSalesReport(
    data.isDemo,
    range.from,
    range.to,
    period === 'this-month' ? endOfToday : range.to,
  )
  const previous = useSalesReport(
    data.isDemo,
    range.previousFrom,
    range.previousTo,
  )
  const standing = useSalesStanding(!data.isDemo, range.from, range.to)

  const view = useMemo(() => {
    const today = new Date(now)
    const stats = (report: typeof current, from: Date, to: Date) =>
      data.isDemo
        ? funnelStats(data, rep.id, from, to)
        : (report.data?.stats[rep.id] ?? emptySalesStats)
    return {
      month: stats(current, range.from, range.to),
      before: stats(previous, range.previousFrom, range.previousTo),
      place: data.isDemo
        ? teamStanding(data, rep.id, range.from, range.to)
        : (standing.data ?? null),
      queue: workQueue(data, rep.id, now),
      funnel: leadFunnel(data, rep.id, range.from, range.to),
      weeks: live.data
        ? reportWeeks(live.data, rep.id, today)
        : weeklySales(data.sales, rep.id, today),
      recentSales: data.sales
        .filter((sale) => sale.salesRepId === rep.id)
        .toSorted(
          (a, b) =>
            new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime(),
        )
        .slice(0, 5),
      badges: achievements(
        data,
        rep,
        today,
        // Week counts are "the 7 days before now" only on the live period.
        period === 'this-month' && standing.data
          ? { mine: standing.data.weekMine, top: standing.data.weekTop }
          : undefined,
      ),
    }
  }, [
    data,
    rep,
    now,
    range,
    period,
    current,
    previous,
    live.data,
    standing.data,
  ])

  const loading = !data.isDemo && current.isPending
  const failed = !data.isDemo && current.isError && !current.data
  const stale = !data.isDemo && current.isError && Boolean(current.data)
  const pace = targetPace(
    view.month.sales,
    rep.monthlyTarget,
    period,
    range.from,
    range.to,
  )
  const waiting = view.queue.notContacted.length + view.queue.followUps.length

  // One sentence that says what matters most right now.
  const status = [
    !loading && !failed && period === 'this-month' ? pace.headline : null,
    waiting > 0
      ? `${plural(waiting, 'parent')} waiting to hear from you`
      : view.queue.soon.length > 0
        ? `${plural(view.queue.soon.length, 'trial')} today or tomorrow`
        : 'Nothing waiting on you right now',
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <DashboardHeader
          title={title}
          subtitle={status}
          actions={
            <>
              <SegmentedControl
                options={PERIOD_OPTIONS}
                value={period}
                onChange={setPeriod}
                className="dark:border-white/10 dark:bg-white/5"
                buttonClassName="px-3 text-sm"
                activeClassName="bg-purple-600 text-white shadow-sm hover:bg-purple-600"
              />
              <Button onClick={() => onNavigate('book')}>
                <CalendarPlus size={16} aria-hidden="true" /> Book a trial
              </Button>
            </>
          }
        />
        {banner}

        {failed ? (
          <InsightsError
            title="Your sales totals could not load"
            onRetry={() => void current.refetch()}
          />
        ) : (
          <>
            {stale && <InsightsStale onRetry={() => void current.refetch()} />}
            <ProgressCard
              rep={rep}
              period={period}
              from={range.from}
              month={view.month}
              before={view.before}
              comparing={!data.isDemo && previous.isPending}
              pace={pace}
              place={view.place}
              badges={view.badges}
              loading={loading}
            />
          </>
        )}
      </div>

      <Zone title="Today">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="min-w-0 lg:col-span-2">
            <RepToday
              data={data}
              rep={rep}
              now={now}
              queue={view.queue}
              onNavigate={onNavigate}
            />
          </div>
          <RecentWins sales={view.recentSales} />
        </div>
      </Zone>

      <Zone title="How you're doing">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <ChartCard
            title="Sales per week"
            subtitle="Your last six weeks"
            loading={!data.isDemo && live.isPending}
            className="lg:col-span-2"
          >
            <SalesWeeklyChart data={view.weeks} />
          </ChartCard>
          <ChartCard
            title="Where parents drop off"
            subtitle={`Parents you took on in ${monthName(range.from)}`}
            size="auto"
          >
            <Funnel steps={view.funnel} />
          </ChartCard>
        </div>
      </Zone>
    </div>
  )
}

function Zone({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="space-y-3">
      <h2 className="text-xs font-extrabold tracking-wider text-slate-500 uppercase dark:text-slate-400">
        {title}
      </h2>
      {children}
    </section>
  )
}

type MonthStats = {
  sales: number
  revenue: number
  booked: number
  held: number
  conversion: number | null
  showUp: number | null
}

/**
 * The one card that stands out: progress to target (the goal the rep works
 * towards), with the supporting numbers kept small beside it.
 */
function ProgressCard({
  rep,
  period,
  from,
  month,
  before,
  comparing,
  pace,
  place,
  badges,
  loading,
}: {
  rep: SalesRep
  period: SalesPeriod
  from: Date
  month: MonthStats
  before: MonthStats
  comparing: boolean
  pace: ReturnType<typeof targetPace>
  place: { rank: number; reps: number } | null
  badges: readonly Achievement[]
  loading: boolean
}) {
  const target = rep.monthlyTarget
  const progress = Math.min(1, month.sales / target)
  const earned = badges.filter((badge) => badge.earned)
  const compare =
    period === 'this-month' ? 'vs same days last month' : 'vs month before'

  if (loading) {
    return (
      <div
        aria-busy="true"
        className="h-56 animate-pulse rounded-3xl bg-slate-100 dark:bg-white/5"
      />
    )
  }

  return (
    <section
      aria-label={`${monthName(from)} progress`}
      className="grid gap-6 rounded-3xl border border-purple-100 bg-linear-to-br from-purple-50 via-white to-white p-5 shadow-xs sm:p-6 lg:grid-cols-12 dark:border-purple-500/20 dark:from-purple-500/10 dark:via-slate-900 dark:to-slate-900"
    >
      <div className="lg:col-span-5">
        <p className="text-sm font-bold text-purple-700 dark:text-purple-300">
          {monthName(from)} target
        </p>
        <p className="mt-1 text-5xl font-black tracking-tight text-slate-950 tabular-nums dark:text-white">
          {month.sales}
          <span className="text-2xl font-bold text-slate-400">
            {' '}
            / {target} sales
          </span>
        </p>
        <div
          className="relative mt-4 h-3 overflow-hidden rounded-full bg-white ring-1 ring-purple-100 dark:bg-white/10 dark:ring-white/10"
          // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a styled bar; native <progress> can't be restyled consistently across browsers
          role="progressbar"
          aria-label="Progress to monthly target"
          aria-valuemin={0}
          aria-valuemax={target}
          aria-valuenow={month.sales}
        >
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${
              pace.tone === 'good'
                ? 'bg-purple-600 dark:bg-purple-400'
                : 'bg-amber-500'
            }`}
            style={{ width: `${progress * 100}%` }}
          />
          {period === 'this-month' && pace.pace > 0 && pace.pace < target && (
            <span
              aria-hidden="true"
              title={`On pace: ${pace.pace} by today`}
              className="absolute inset-y-0 w-0.5 bg-slate-900/50 dark:bg-white/70"
              style={{ left: `${(pace.pace / target) * 100}%` }}
            />
          )}
        </div>
        <p className="mt-3 text-sm">
          <span
            className={`font-extrabold ${
              pace.tone === 'good'
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-amber-700 dark:text-amber-400'
            }`}
          >
            {pace.headline}.
          </span>{' '}
          <span className="text-slate-600 dark:text-slate-300">
            {pace.detail}
          </span>
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {place && place.reps > 1 && (
            <Chip icon={<Trophy size={14} className="text-amber-500" />}>
              {place.rank === 1
                ? `Top of the team`
                : `#${place.rank} of ${place.reps} reps`}
            </Chip>
          )}
          <Chip
            icon={<Award size={14} className="text-purple-500" />}
            title={badges
              .map((b) => `${b.earned ? '✓' : '○'} ${b.title}`)
              .join('\n')}
          >
            {earned.length} of {badges.length} badges
          </Chip>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 self-center border-purple-100 sm:grid-cols-3 lg:col-span-7 lg:border-l lg:pl-6 dark:border-white/10">
        <Stat
          className="col-span-2 sm:col-span-1"
          label="Revenue"
          value={formatMoney(month.revenue)}
          change={
            comparing ? undefined : percentChange(month.revenue, before.revenue)
          }
          compare={compare}
        />
        <Stat
          label="Trials booked"
          value={month.booked}
          change={
            comparing ? undefined : percentChange(month.booked, before.booked)
          }
          compare={compare}
        />
        <Stat
          label="Trial → sale"
          value={percent(month.conversion)}
          note={
            month.held === 0
              ? 'No trials held yet'
              : `${month.held} held · ${percent(month.showUp)} showed up`
          }
        />
      </dl>
    </section>
  )
}

function Chip({
  icon,
  title,
  children,
}: {
  icon: ReactNode
  title?: string
  children: ReactNode
}) {
  return (
    <span
      title={title}
      className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10"
    >
      <span aria-hidden="true">{icon}</span>
      {children}
    </span>
  )
}

function Stat({
  label,
  value,
  change,
  compare,
  note,
  className = '',
}: {
  label: string
  value: ReactNode
  change?: number | null
  compare?: string
  note?: string
  className?: string
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <dt className="text-xs font-semibold text-slate-500 dark:text-slate-400">
        {label}
      </dt>
      <dd className="mt-1 truncate text-2xl font-black text-slate-900 tabular-nums dark:text-white">
        {value}
      </dd>
      <dd className="mt-0.5 min-h-4 text-xs text-slate-500 dark:text-slate-400">
        {note ??
          (change === undefined ? null : change === null || change === 0 ? (
            change === null ? (
              'Nothing to compare yet'
            ) : (
              `Same as last time`
            )
          ) : (
            <>
              <span
                className={`inline-flex items-center font-bold ${
                  change > 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {change > 0 ? (
                  <ArrowUpRight size={13} aria-hidden="true" />
                ) : (
                  <ArrowDownRight size={13} aria-hidden="true" />
                )}
                {change > 0 ? '+' : ''}
                {change}%
              </span>{' '}
              {compare}
            </>
          ))}
      </dd>
    </div>
  )
}

/** Recent sales, kept beside the work so wins stay in view. */
function RecentWins({ sales }: { sales: readonly Sale[] }) {
  return (
    <ChartCard title="Recent wins" size="auto">
      {sales.length === 0 ? (
        <EmptyState>
          Your first sale is one good trial away. Start with the oldest parent
          on your list.
        </EmptyState>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-white/10">
          {sales.map((sale) => (
            <li
              key={sale.id}
              className="flex items-center justify-between gap-3 py-2.5"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <PartyPopper
                  size={16}
                  aria-hidden="true"
                  className="shrink-0 text-emerald-500"
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-slate-900 dark:text-white">
                    {sale.studentName}
                  </span>
                  <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                    {sale.plan} ·{' '}
                    {new Date(sale.closedAt).toLocaleDateString([], {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </span>
              </span>
              <span className="shrink-0 text-sm font-black text-emerald-600 tabular-nums dark:text-emerald-400">
                {formatMoney(sale.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </ChartCard>
  )
}

/** What to try when most parents are lost at a step. */
const FUNNEL_TIPS: Record<string, string> = {
  reached: 'Reach new parents within a day. Interest cools fast.',
  booked:
    'Offer two trial times in your first message so it’s easy to say yes.',
  came: 'Send the WhatsApp reminder the day before and an hour before.',
  enrolled:
    'Follow up within 24 hours of the trial with the class plan and fees.',
}

/**
 * Steps as bars against the first. Drops are shown in neutral grey; only the
 * biggest one is highlighted, with a tip, so the rep knows the one thing to fix.
 */
function Funnel({ steps }: { steps: readonly FunnelStep[] }) {
  const first = steps[0]?.count ?? 0
  if (first === 0) {
    return (
      <EmptyState>
        No parents taken on in this period yet. Pick up a new parent from your
        to-do list.
      </EmptyState>
    )
  }
  const lost = steps.map((step, index) => {
    const before = steps[index - 1]
    return before && before.count > 0
      ? Math.round(((before.count - step.count) / before.count) * 100)
      : 0
  })
  const worst = lost.reduce(
    (best, value, index) => (value > lost[best] ? index : best),
    0,
  )
  const tip = lost[worst] > 0 ? FUNNEL_TIPS[steps[worst].id] : undefined

  return (
    <div className="space-y-4">
      <ol className="space-y-2.5">
        {steps.map((step, index) => {
          const highlight = tip && index === worst
          return (
            <li key={step.id}>
              <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {step.label}
                </span>
                <span className="tabular-nums">
                  {lost[index] > 0 && (
                    <span
                      className={`mr-2 text-xs font-semibold ${
                        highlight
                          ? 'text-amber-700 dark:text-amber-400'
                          : 'text-slate-400'
                      }`}
                    >
                      −{lost[index]}%
                    </span>
                  )}
                  <span className="font-black text-slate-900 dark:text-white">
                    {step.count}
                  </span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                <div
                  className={`h-full rounded-full ${
                    highlight
                      ? 'bg-amber-500'
                      : 'bg-purple-600 dark:bg-purple-400'
                  }`}
                  style={{ width: `${(step.count / first) * 100}%` }}
                />
              </div>
            </li>
          )
        })}
      </ol>
      {tip && (
        <p className="flex gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
          <Lightbulb size={16} aria-hidden="true" className="shrink-0" />
          <span>
            <span className="font-bold">
              Most parents are lost at “{steps[worst].label.toLowerCase()}”.
            </span>{' '}
            {tip}
          </span>
        </p>
      )}
    </div>
  )
}
