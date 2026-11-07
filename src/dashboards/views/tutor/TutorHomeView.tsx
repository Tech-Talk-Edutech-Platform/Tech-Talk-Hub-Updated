import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Calendar,
  Clock,
  Users,
  AlertCircle,
  User as UserIcon,
} from 'lucide-react'
import { supabase } from '../../../supabase'
import UpcomingClasses from '../../../components/UpcomingClasses'
import type { DashboardIdentity } from '../../../types/dashboardIdentity'

const DAY_MS = 86_400_000

interface TutorHomeViewProps {
  userId: string
  user: DashboardIdentity
}

interface TutorClass {
  id: string
  start_time: string
  title: string
  meet_link: string | null
  student_name: string
}

interface TutorStats {
  classesToday: number
  upcoming: number
  activeStudents: number
  pendingReviews: number
}

async function loadTutorDashboard(
  userId: string,
): Promise<{ stats: TutorStats; classes: TutorClass[] }> {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  // 1. Fetch calendar events
  const calendarPromise = supabase
    .from('calendar_events')
    .select('*, classes (student_id)')
    .eq('tutor_id', userId)
    .gte('start_time', todayStart.toISOString())
    .order('start_time', { ascending: true })

  // 2. Fetch assigned students
  const studentsPromise = supabase
    .from('users')
    .select('id')
    .eq('assigned_tutor_id', userId)
    .eq('role', 'student')

  // 3. Fetch submissions across the whole table without pre-filtered restriction to compute reliably client-side
  const assignmentsPromise = supabase
    .from('student_assignments')
    .select('id, student_id, tutor_id, status')

  const [calendarRes, studentRes, assignmentRes] = await Promise.all([
    calendarPromise,
    studentsPromise,
    assignmentsPromise,
  ])

  if (calendarRes.error) throw calendarRes.error

  const events = calendarRes.data
  const studentList = studentRes.data ?? []
  const studentIds = new Set(studentList.map((s) => s.id))

  // Match pending submissions for this specific tutor's students or direct tutor assignment
  const allAssignments = assignmentRes.data ?? []
  const pendingReviewsCount = allAssignments.filter((a) => {
    const isSubmittedOrPending =
      a.status === 'submitted' || a.status === 'pending'
    const isMyStudent = studentIds.has(a.student_id) || a.tutor_id === userId
    return isSubmittedOrPending && isMyStudent
  }).length

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
    for (const student of students ?? []) {
      studentNames.set(student.id, student.full_name)
    }
  }

  const tomorrowStart = todayStart.getTime() + DAY_MS

  return {
    stats: {
      classesToday: events.filter(
        (e) => new Date(e.start_time).getTime() < tomorrowStart,
      ).length,
      upcoming: events.length,
      activeStudents: studentList.length,
      pendingReviews: pendingReviewsCount,
    },
    classes: events.map((e) => ({
      id: e.id,
      start_time: e.start_time,
      title: e.title,
      meet_link: e.meet_link,
      student_name:
        (e.classes?.student_id && studentNames.get(e.classes.student_id)) ||
        'N/A',
    })),
  }
}

export default function TutorHomeView({ userId, user }: TutorHomeViewProps) {
  const [loading, setLoading] = useState(true)
  const [upcomingClasses, setUpcomingClasses] = useState<TutorClass[]>([])
  const [stats, setStats] = useState<TutorStats>({
    classesToday: 0,
    upcoming: 0,
    activeStudents: 0,
    pendingReviews: 0,
  })

  useEffect(() => {
    let cancelled = false

    void loadTutorDashboard(userId)
      .then((result) => {
        if (cancelled) return
        setStats(result.stats)
        setUpcomingClasses(result.classes)
      })
      .catch((err: unknown) => {
        console.error('Dashboard Sync Error:', err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [userId])

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-4">
        <StatCard
          title="Today's Classes"
          value={stats.classesToday}
          color="blue"
          icon={<Calendar size={20} />}
        />
        <StatCard
          title="Upcoming Classes"
          value={stats.upcoming}
          color="purple"
          icon={<Clock size={20} />}
        />
        <StatCard
          title="My Students"
          value={stats.activeStudents}
          color="amber"
          icon={<Users size={20} />}
        />
        <StatCard
          title="Pending Reviews"
          value={stats.pendingReviews}
          color="green"
          icon={<AlertCircle size={20} />}
        />
      </div>

      <div className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-lg backdrop-blur-xl dark:border-white/8 dark:bg-[#131b31]/60">
        <UpcomingClasses classes={upcomingClasses} loading={loading} />
      </div>
    </div>
  )
}

const STAT_COLORS = {
  blue: 'bg-blue-600 shadow-blue-500/20',
  purple: 'bg-purple-600 shadow-purple-500/20',
  amber: 'bg-amber-600 shadow-amber-500/20',
  green: 'bg-emerald-600 shadow-emerald-500/20',
} as const

interface StatCardProps {
  icon: ReactNode
  title: string
  value: number
  color: keyof typeof STAT_COLORS
}

function StatCard({ icon, title, value, color }: StatCardProps) {
  return (
    <div
      className={`${STAT_COLORS[color]} flex items-center justify-between rounded-[24px] p-5 text-white shadow-lg`}
    >
      <div>
        <p className="text-[10px] font-bold tracking-wider text-white/80 uppercase">
          {title}
        </p>
        <h3 className="mt-1 text-2xl font-black">{value}</h3>
      </div>
      <div className="rounded-2xl bg-white/10 p-3 opacity-80">{icon}</div>
    </div>
  )
}
