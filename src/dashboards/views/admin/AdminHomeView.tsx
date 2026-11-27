import { useQuery } from '@tanstack/react-query'
import type { DashboardNavigation } from '../../navigation'
import { DashboardViewBoundary } from '../../DashboardViewBoundary'
import { InsightsError, InsightsStale } from '../../insights/InsightsError'
import { Plus, CheckCircle2, Activity, Settings, CalendarX } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../../../supabase'
import { notifyDashboardTutor } from '../../notifyDashboardTutor'
import { AdminInsights } from '../../insights/AdminInsights'
import { EmptyState } from '../../../components/ui/EmptyState'
import Messages from '../../../Utils/fetchMessage'
import { toast } from 'react-hot-toast'
import { RecentRecordingsCard } from '../../../components/recordings/RecentRecordingsCard'

interface TodayClass {
  id: string
  title: string
  tutorId: string | null
  tutorName: string | null
}

/** Today's booked classes for the Live Class Monitor. */
async function loadTodayClasses(): Promise<TodayClass[]> {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const endOfToday = new Date()
  endOfToday.setHours(23, 59, 59, 999)

  const { data: classes, error } = await supabase
    .from('calendar_events')
    .select('id, title, tutor_id')
    // Open availability and cancelled bookings are not classes.
    .neq('title', 'Free Slot')
    .neq('booking_status', 'cancelled')
    .or(
      `and(start_time.gte.${startOfToday.toISOString()},start_time.lte.${endOfToday.toISOString()}),and(end_time.gte.${startOfToday.toISOString()},end_time.lte.${endOfToday.toISOString()})`,
    )
    .order('start_time')
  if (error) throw error

  // `calendar_events` has no foreign key to `users`, so look the tutors up separately.
  const todayClasses = classes ?? []
  const tutorIds = [
    ...new Set(todayClasses.flatMap((c) => (c.tutor_id ? [c.tutor_id] : []))),
  ]
  const tutorNames = new Map<string, string>()
  if (tutorIds.length > 0) {
    const { data: tutorRows } = await supabase
      .from('users')
      .select('id, full_name')
      .in('id', tutorIds)
    for (const tutor of tutorRows ?? []) {
      tutorNames.set(tutor.id, tutor.full_name)
    }
  }

  return todayClasses.map((c) => ({
    id: c.id,
    title: c.title,
    tutorId: c.tutor_id,
    tutorName: (c.tutor_id && tutorNames.get(c.tutor_id)) || null,
  }))
}

export default function AdminHomeView({
  userId,
  onNavigate,
  onOpenRecordings,
}: {
  userId: string
  onNavigate?: DashboardNavigation
  onOpenRecordings: () => void
}) {
  const classes = useQuery({
    queryKey: ['dashboard', 'today-classes', userId],
    queryFn: loadTodayClasses,
  })
  const upcoming = classes.data ?? []

  return (
    <div className="animate-fade-in mx-auto max-w-7xl space-y-8 p-6 lg:p-8">
      <DashboardViewBoundary>
        <AdminInsights onNavigate={onNavigate} />
      </DashboardViewBoundary>

      <div className="grid grid-cols-12 gap-6 lg:gap-8">
        {/* MAIN COLUMN */}
        <div className="col-span-12 flex flex-col gap-6 xl:col-span-8">
          {/* INTERNAL CHAT / MESSAGING WIDGET */}
          <div className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-xs md:p-8 dark:border-white/10 dark:bg-white/5">
            <Messages receiverId={userId} />
          </div>

          <RecentRecordingsCard onViewAll={onOpenRecordings} />
        </div>

        {/* SIDEBAR COMMAND CENTER */}
        <div className="col-span-12 flex flex-col gap-6 xl:col-span-4">
          {/* QUICK LINKS PANEL */}
          <div className="relative overflow-hidden rounded-[32px] border border-gray-800 bg-gray-900 p-6 text-white shadow-xl md:p-8 dark:border-white/10 dark:bg-white/5">
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-purple-500/10 blur-2xl" />

            <div className="mb-6 flex items-center gap-2 text-[10px] font-black tracking-widest text-purple-400 uppercase">
              <Settings size={16} className="text-purple-500" /> Administrative
              Links
            </div>

            <div className="relative z-10 space-y-3">
              <Link
                to="/calendar"
                className="flex w-full items-center justify-between rounded-2xl border border-purple-500/30 bg-linear-to-r from-purple-600 to-indigo-600 p-4 text-xs font-black tracking-wider uppercase shadow-md shadow-purple-950/40 transition-all hover:from-purple-700 hover:to-indigo-700 active:scale-[0.99]"
              >
                <span>📅 Open Global Calendar</span>
                <Plus size={14} />
              </Link>
            </div>
          </div>

          {/* LIVE CLASS MONITOR */}
          <div className="space-y-4 rounded-[32px] border border-gray-100 bg-white p-6 shadow-xs dark:border-white/10 dark:bg-white/5">
            <h3 className="flex items-center gap-2 text-sm font-black text-gray-900 dark:text-white">
              <Activity
                size={16}
                className="animate-pulse text-purple-600 dark:text-purple-400"
              />{' '}
              Live Class Monitor
            </h3>

            <div className="max-h-[320px] space-y-3 overflow-y-auto pr-1">
              {classes.isPending ? (
                <output>Loading today’s classes…</output>
              ) : classes.isError && !classes.data ? (
                <InsightsError
                  title="Today’s classes could not load"
                  error={classes.error}
                  onRetry={() => void classes.refetch()}
                />
              ) : null}
              {classes.isError && classes.data && (
                <InsightsStale onRetry={() => void classes.refetch()} />
              )}
              {classes.data &&
                (upcoming.length === 0 ? (
                  <EmptyState
                    size="sm"
                    icon={CalendarX}
                    title="No classes scheduled for today"
                    description="Classes booked in Global Schedule appear here."
                  />
                ) : (
                  upcoming.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-gray-50/30 p-4 dark:border-white/10 dark:bg-white/5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-black text-gray-900 dark:text-white">
                          {c.title}
                        </p>
                        <p className="mt-0.5 truncate text-[10px] font-bold text-purple-600 dark:text-purple-400">
                          {c.tutorName || 'Assigned Tutor'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (!c.tutorId) return
                          void toast.promise(
                            notifyDashboardTutor(
                              c.tutorId,
                              `Confirmed: ${c.title}`,
                            ),
                            {
                              loading: 'Notifying tutor…',
                              success: 'Notification request sent.',
                              error: (error: unknown) =>
                                error instanceof Error
                                  ? error.message
                                  : 'Could not notify the tutor.',
                            },
                          )
                        }}
                        className="shrink-0 rounded-xl border border-gray-100 bg-white p-2.5 text-emerald-600 shadow-2xs transition-all hover:bg-emerald-50 dark:border-white/10 dark:bg-white/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
                        disabled={!c.tutorId}
                        title="Ping Tutor"
                      >
                        <CheckCircle2 size={14} />
                      </button>
                    </div>
                  ))
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
