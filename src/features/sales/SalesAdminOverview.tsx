import { useMemo, useState } from 'react'
import {
  BadgeCheck,
  BarChart3,
  CalendarCheck2,
  CalendarDays,
  CalendarPlus,
  ClipboardList,
  Contact,
  LayoutDashboard,
  MessageCircle,
  Percent,
  Trophy,
  Users,
  Wallet,
} from 'lucide-react'
import { Toaster } from 'react-hot-toast'

import { useNow } from '../../hooks/useNow'
import { formatMoney } from '../../lib/money'
import { BookTrialWizard } from './BookTrialWizard'
import { gradeCategory, gradeLabel } from './gradeCategories'
import {
  MentorBookingsCalendar,
  type MentorCalendarItem,
} from './MentorBookingsCalendar'
import { funnelStats, percent, startOfMonth, weeklySales } from './metrics'
import { useSalesData } from './salesDataContext'
import { ParentsList } from './ParentsList'
import { SalesBookingsList } from './SalesBookingsList'
import { SalesWeeklyChart } from './SalesWeeklyChart'
import { TRIAL_STATUS_LABEL } from './types'
import { Initials, Kpi, Panel, TabBar } from './ui'
import { selectClass } from './styles'
import { WhatsAppFeed } from './WhatsAppFeed'

type AdminTab =
  'overview' | 'parents' | 'book' | 'bookings' | 'mentors' | 'whatsapp'

const ADMIN_TABS = [
  { id: 'overview', label: 'Team overview', icon: LayoutDashboard },
  { id: 'parents', label: 'Parents', icon: Contact },
  { id: 'book', label: 'Book a trial', icon: CalendarPlus },
  { id: 'bookings', label: 'All bookings', icon: ClipboardList },
  { id: 'mentors', label: 'Mentor calendars', icon: CalendarDays },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
] as const satisfies readonly {
  id: AdminTab
  label: string
  icon: typeof LayoutDashboard
}[]

/** Admins see every rep, every mentor and every message. */
export function SalesAdminOverview() {
  const [tab, setTab] = useState<AdminTab>('overview')
  // The parent picked in "Parents" when the admin chose "Book trial".
  const [bookingFor, setBookingFor] = useState<string | null>(null)
  const open = (next: AdminTab) => {
    setBookingFor(null)
    setTab(next)
  }
  return (
    <div className="space-y-5">
      <Toaster position="top-right" />
      <TabBar
        tabs={ADMIN_TABS}
        active={tab}
        onChange={open}
        label="Sales sections"
      />
      {tab === 'overview' && <TeamOverview />}
      {tab === 'parents' && (
        <ParentsList
          repId={null}
          onBook={(leadId) => {
            setBookingFor(leadId)
            setTab('book')
          }}
        />
      )}
      {tab === 'book' && (
        <BookTrialWizard
          key={bookingFor ?? 'new'}
          salesRepId={null}
          initialLeadId={bookingFor}
        />
      )}
      {tab === 'bookings' && (
        <SalesBookingsList repId={null} creditRepId={null} />
      )}
      {tab === 'mentors' && <MentorCalendars />}
      {tab === 'whatsapp' && <WhatsAppFeed repId={null} />}
    </div>
  )
}

function TeamOverview() {
  const data = useSalesData()
  const now = useNow(60_000)

  const view = useMemo(() => {
    const today = new Date(now)
    const from = startOfMonth(today)
    const twoWeeks = now + 14 * 86_400_000
    return {
      team: funnelStats(data, null, from, today),
      weeks: weeklySales(data.sales, null, today),
      reps: data.reps
        .map((rep) => ({ rep, stats: funnelStats(data, rep.id, from, today) }))
        .toSorted((a, b) => b.stats.sales - a.stats.sales),
      mentors: data.mentors.map((mentor) => {
        const upcoming = data.slots.filter((slot) => {
          const start = new Date(slot.start).getTime()
          return slot.mentorId === mentor.id && start >= now && start < twoWeeks
        })
        const booked = upcoming.filter((slot) => slot.bookingId).length
        const theirs = data.bookings.filter(
          (booking) =>
            booking.mentorId === mentor.id &&
            new Date(booking.start).getTime() >= from.getTime() &&
            new Date(booking.start).getTime() < now,
        )
        return {
          mentor,
          open: upcoming.length - booked,
          booked,
          held: theirs.filter((b) =>
            ['attended', 'converted', 'lost'].includes(b.status),
          ).length,
          converted: theirs.filter((b) => b.status === 'converted').length,
        }
      }),
      website: data.bookings.filter(
        (booking) =>
          booking.source === 'website' &&
          new Date(booking.createdAt).getTime() >= from.getTime(),
      ).length,
    }
  }, [data, now])

  const monthName = new Date(now).toLocaleDateString([], { month: 'long' })
  const teamTarget = data.reps.reduce((sum, rep) => sum + rep.monthlyTarget, 0)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi
          label="Team sales"
          value={view.team.sales}
          hint={`of ${teamTarget} target · ${monthName}`}
          icon={BadgeCheck}
        />
        <Kpi
          label="Revenue"
          value={formatMoney(view.team.revenue)}
          hint={monthName}
          icon={Wallet}
        />
        <Kpi
          label="Trials booked"
          value={view.team.booked}
          hint={`${view.website} from the website form`}
          icon={CalendarCheck2}
        />
        <Kpi
          label="Show-up rate"
          value={percent(view.team.showUp)}
          hint={`${view.team.noShows} no-shows`}
          icon={Users}
        />
        <Kpi
          label="Trial → sale"
          value={percent(view.team.conversion)}
          hint="of trials held"
          icon={Percent}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <Panel
          title={`Sales leaderboard · ${monthName}`}
          icon={Trophy}
          className="lg:col-span-3"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="text-xs text-slate-500">
                  <th className="pb-2 font-bold">Rep</th>
                  <th className="pb-2 text-right font-bold">Trials</th>
                  <th className="pb-2 text-right font-bold">Sales</th>
                  <th className="pb-2 text-right font-bold">Conversion</th>
                  <th className="pb-2 text-right font-bold">Revenue</th>
                  <th className="pb-2 pl-4 font-bold">Target</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                {view.reps.map(({ rep, stats }) => (
                  <tr key={rep.id}>
                    <td className="py-2.5">
                      <span className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                        <Initials name={rep.name} size={28} /> {rep.name}
                      </span>
                    </td>
                    <td className="py-2.5 text-right tabular-nums">
                      {stats.booked}
                    </td>
                    <td className="py-2.5 text-right font-black tabular-nums">
                      {stats.sales}
                    </td>
                    <td className="py-2.5 text-right tabular-nums">
                      {percent(stats.conversion)}
                    </td>
                    <td className="py-2.5 text-right tabular-nums">
                      {formatMoney(stats.revenue)}
                    </td>
                    <td className="py-2.5 pl-4 text-xs whitespace-nowrap text-slate-500 tabular-nums">
                      <span
                        aria-hidden
                        className="mr-2 inline-block h-2 w-20 overflow-hidden rounded-full bg-slate-100 align-middle dark:bg-white/10"
                      >
                        <span
                          className="block h-full rounded-full bg-purple-600 dark:bg-purple-400"
                          style={{
                            width: `${Math.min(100, (stats.sales / rep.monthlyTarget) * 100)}%`,
                          }}
                        />
                      </span>
                      {stats.sales}/{rep.monthlyTarget}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel
          title="Team sales per week"
          icon={BarChart3}
          className="lg:col-span-2"
        >
          <SalesWeeklyChart data={view.weeks} />
        </Panel>
      </div>

      <Panel title="Mentors · next 14 days" icon={CalendarDays}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="text-xs text-slate-500">
                <th className="pb-2 font-bold">Mentor</th>
                <th className="pb-2 font-bold">Programs</th>
                <th className="pb-2 text-right font-bold">Open slots</th>
                <th className="pb-2 text-right font-bold">Booked</th>
                <th className="pb-2 text-right font-bold">
                  Held · {monthName}
                </th>
                <th className="pb-2 text-right font-bold">Enrolled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/10">
              {view.mentors.map((row) => (
                <tr key={row.mentor.id}>
                  <td className="py-2.5 font-bold text-slate-900 dark:text-white">
                    {row.mentor.name}
                  </td>
                  <td className="py-2.5 text-xs text-slate-500">
                    {row.mentor.categories
                      .map((id) => gradeCategory(id).label)
                      .join(', ')}
                  </td>
                  <td
                    className={`py-2.5 text-right tabular-nums ${row.open === 0 ? 'font-bold text-amber-600' : ''}`}
                  >
                    {row.open}
                  </td>
                  <td className="py-2.5 text-right tabular-nums">
                    {row.booked}
                  </td>
                  <td className="py-2.5 text-right tabular-nums">{row.held}</td>
                  <td className="py-2.5 text-right tabular-nums">
                    {row.converted}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}

/** Any mentor's calendar, exactly as that mentor sees it. */
export function MentorCalendars({
  initialMentorId,
}: {
  initialMentorId?: string
}) {
  const data = useSalesData()
  const [mentorId, setMentorId] = useState(
    initialMentorId ?? data.mentors[0]?.id ?? '',
  )
  const items = useMemo<MentorCalendarItem[]>(
    () =>
      data.bookings
        .filter((booking) => booking.mentorId === mentorId)
        .map((booking) => ({
          id: booking.id,
          title: `Trial: ${booking.studentName}`,
          start: booking.start,
          end: booking.end,
          meetLink: booking.meetLink,
          studentName: booking.studentName,
          parentName: booking.parentName,
          detail: `${gradeCategory(booking.category).label}, ${gradeLabel(booking.studentGrade)}`,
          notes: booking.notes || null,
          statusLabel: TRIAL_STATUS_LABEL[booking.status],
          cancelled: booking.status === 'cancelled',
        })),
    [data.bookings, mentorId],
  )

  return (
    <div className="space-y-4">
      {!initialMentorId && (
        <label className="flex max-w-sm items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-200">
          Mentor
          <select
            value={mentorId}
            onChange={(event) => setMentorId(event.target.value)}
            className={selectClass}
          >
            {data.mentors.map((mentor) => (
              <option key={mentor.id} value={mentor.id}>
                {mentor.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <MentorBookingsCalendar items={items} />
    </div>
  )
}
