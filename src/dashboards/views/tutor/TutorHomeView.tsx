import { useQuery } from '@tanstack/react-query'
import { InsightsError, InsightsStale } from '../../insights/InsightsError'
import { DashboardViewBoundary } from '../../DashboardViewBoundary'
import { Users, User as UserIcon } from 'lucide-react'
import { supabase } from '../../../supabase'
import UpcomingClasses from '../../../components/UpcomingClasses'
import { TutorInsights } from '../../insights/TutorInsights'
import type { DashboardIdentity } from '../../../types/dashboardIdentity'
import { RecentRecordingsCard } from '../../../components/recordings/RecentRecordingsCard'

interface TutorHomeViewProps {
  userId: string
  user: DashboardIdentity
  onNavigate?: (view: string) => void
  onOpenRecordings: () => void
}

interface TutorClass {
  id: string
  start_time: string
  title: string
  meet_link: string | null
  student_name: string
}

/** The tutor's booked classes from today on, for the upcoming list. */
async function loadUpcomingClasses(
  userId: string,
  signal: AbortSignal,
): Promise<TutorClass[]> {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  // Open (free) slots and cancelled bookings aren't classes.
  const { data: events, error } = await supabase
    .from('calendar_events')
    .select(
      '*, classes (student_id), trial_bookings (student_name, removed_at, status)',
    )
    .eq('tutor_id', userId)
    .neq('title', 'Free Slot')
    .neq('booking_status', 'cancelled')
    .gte('start_time', todayStart.toISOString())
    .order('start_time', { ascending: true })
    .abortSignal(signal)
  if (error) throw error

  // `classes` has no foreign key to `users`, so look the names up separately.
  const classStudentIds = [
    ...new Set(
      events.flatMap((e) =>
        e.classes?.student_id ? [e.classes.student_id] : [],
      ),
    ),
  ]
  const studentNames = new Map<string, string>()
  if (classStudentIds.length > 0) {
    const { data: students } = await supabase
      .from('users')
      .select('id, full_name')
      .in('id', classStudentIds)
      .abortSignal(signal)
    for (const student of students ?? []) {
      studentNames.set(student.id, student.full_name)
    }
  }

  return events.map((e) => ({
    id: e.id,
    start_time: e.start_time,
    title: e.title,
    meet_link: e.meet_link,
    student_name:
      (e.classes?.student_id && studentNames.get(e.classes.student_id)) ||
      // Trial students are leads, named on their booking.
      e.trial_bookings.find(
        (b) => b.removed_at === null && b.status !== 'cancelled',
      )?.student_name ||
      'N/A',
  }))
}

export default function TutorHomeView({
  userId,
  user,
  onNavigate,
  onOpenRecordings,
}: TutorHomeViewProps) {
  const classes = useQuery({
    queryKey: ['dashboard', 'tutor-upcoming-classes', userId],
    queryFn: ({ signal }) => loadUpcomingClasses(userId, signal),
  })

  const metadata = user.user_metadata
  const tutorAvatar =
    typeof metadata.avatar_url === 'string'
      ? metadata.avatar_url
      : typeof metadata.picture === 'string'
        ? metadata.picture
        : null
  const tutorName =
    user.full_name ||
    (typeof metadata.full_name === 'string' ? metadata.full_name : '') ||
    'Instructor'

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 text-gray-900 md:p-8 dark:text-white">
      <div className="relative overflow-hidden rounded-[32px] border border-gray-100 bg-white p-6 shadow-lg backdrop-blur-xl md:p-8 dark:border-white/8 dark:bg-[#131b31]/65">
        <div className="pointer-events-none absolute top-0 right-0 h-80 w-80 bg-purple-500/10 blur-[100px]" />
        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-purple-500/10 px-3.5 py-1.5 text-xs font-bold tracking-wider text-purple-600 dark:text-purple-300">
              <Users size={14} />
              TUTOR DASHBOARD
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">
              Welcome back, {tutorName}! 👋
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-gray-600 md:text-base dark:text-gray-400">
              Manage your scheduled student sessions, evaluate performance
              metrics, and track active course modules.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-4 rounded-full border border-gray-100 bg-gray-50/80 p-3.5 shadow-xs dark:border-white/10 dark:bg-white/5">
            {tutorAvatar ? (
              <img
                src={tutorAvatar}
                alt={tutorName}
                className="h-12 w-12 rounded-full border-2 border-purple-500/30 object-cover shadow-inner"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-purple-500/20 bg-purple-600/10 text-purple-600 shadow-inner dark:bg-purple-500/20 dark:text-purple-300">
                <UserIcon size={22} />
              </div>
            )}
            <div className="pr-3">
              <span className="inline-block rounded-full bg-purple-50 px-2.5 py-0.5 text-[10px] font-black tracking-wider text-purple-600 uppercase dark:bg-purple-500/10 dark:text-purple-300">
                Active Tutor
              </span>
              <p className="mt-0.5 text-xs font-medium text-gray-400 dark:text-gray-500">
                Online session ready
              </p>
            </div>
          </div>
        </div>
      </div>

      <DashboardViewBoundary>
        <TutorInsights tutorId={userId} onNavigate={onNavigate} />
      </DashboardViewBoundary>

      <div className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-lg backdrop-blur-xl dark:border-white/8 dark:bg-[#131b31]/60">
        {classes.isError && classes.data && (
          <InsightsStale onRetry={() => void classes.refetch()} />
        )}
        {classes.isError && !classes.data ? (
          <InsightsError
            title="Upcoming classes could not load"
            onRetry={() => void classes.refetch()}
          />
        ) : (
          <UpcomingClasses
            classes={classes.data ?? []}
            loading={classes.isPending}
          />
        )}
      </div>

      <RecentRecordingsCard onViewAll={onOpenRecordings} showTutor={false} />
    </div>
  )
}
