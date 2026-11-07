import { useEffect, useState } from 'react'
import {
  Globe,
  Users2,
  Plus,
  CheckCircle2,
  Activity,
  Settings,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../../../supabase'
import { notifyTutor } from '../../../Utils/adminActions'
import { StatCard } from '../../../components/dashboard/ui/StatCard'
import Messages from '../../../Utils/fetchMessage'
import { toast } from 'react-hot-toast'

interface TodayClass {
  id: string
  title: string
  tutorId: string | null
  tutorName: string | null
}

interface AdminStats {
  tutors: number
  students: number
  conversion: string
}

async function loadAdminDashboard(): Promise<{
  stats: AdminStats
  classes: TodayClass[]
}> {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const endOfToday = new Date()
  endOfToday.setHours(23, 59, 59, 999)

  const [
    { count: tutors },
    { count: students },
    { count: leads },
    { count: converted },
    { data: classes },
  ] = await Promise.all([
    supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'tutor'),
    supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'student'),
    supabase.from('leads').select('*', { count: 'exact', head: true }),
    supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'converted'),
    supabase
      .from('calendar_events')
      .select('id, title, tutor_id')
      .or(
        `and(start_time.gte.${startOfToday.toISOString()},start_time.lte.${endOfToday.toISOString()}),and(end_time.gte.${startOfToday.toISOString()},end_time.lte.${endOfToday.toISOString()})`,
      )
      .order('start_time'),
  ])

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

  return {
    stats: {
      tutors: tutors ?? 0,
      students: students ?? 0,
      conversion: leads ? (((converted ?? 0) / leads) * 100).toFixed(1) : '0',
    },
    classes: todayClasses.map((c) => ({
      id: c.id,
      title: c.title,
      tutorId: c.tutor_id,
      tutorName: (c.tutor_id && tutorNames.get(c.tutor_id)) || null,
    })),
  }
}

export default function AdminHomeView({ userId }: { userId: string }) {
  const [stats, setStats] = useState<AdminStats>({
    tutors: 0,
    students: 0,
    conversion: '0',
  })
  const [upcoming, setUpcoming] = useState<TodayClass[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    void loadAdminDashboard()
      .then((result) => {
        if (cancelled) return
        setStats(result.stats)
        setUpcoming(result.classes)
      })
      .catch((error: unknown) => {
        console.error(error)
        toast.error('Failed to fetch fresh dashboard data.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 p-28 text-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-500/20 border-t-purple-600" />
        <p className="animate-pulse text-xs font-black tracking-widest text-gray-400 uppercase dark:text-gray-500">
          Initializing Operations Center...
        </p>
      </div>
    )
  }

  return (
    <div className="animate-fade-in mx-auto max-w-7xl space-y-8 p-6 lg:p-8">
      {/* STATS GRID BAR */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          title="Active Tutors"
          value={stats.tutors}
          accent="blue"
          icon={Users2}
        />
        <StatCard
          title="Active Students"
          value={stats.students}
          accent="blue"
          icon={Globe}
        />
        {/*  {(role === "owner" || role === "tech_admin") && (
          <StatCard title="Lead Conv %" value={`${stats.conversion}%`} accent="amber" icon={TrendingUp} />
        )}*/}
      </div>

      <div className="grid grid-cols-12 gap-6 lg:gap-8">
        {/* MAIN COLUMN */}
        <div className="col-span-12 flex flex-col gap-6 xl:col-span-8">
          {/* INTERNAL CHAT / MESSAGING WIDGET */}
          <div className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-xs md:p-8 dark:border-white/10 dark:bg-white/5">
            <Messages receiverId={userId} />
          </div>
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
              {upcoming.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 px-4 py-8 text-center dark:border-white/10 dark:bg-white/5">
                  <p className="text-xs font-bold text-gray-400">
                    No classes scheduled for today.
                  </p>
                </div>
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
                        if (c.tutorId) {
                          void notifyTutor(c.tutorId, `Confirmed: ${c.title}`)
                        }
                        toast.success('Pinged tutor successfully!')
                      }}
                      className="shrink-0 rounded-xl border border-gray-100 bg-white p-2.5 text-emerald-600 shadow-2xs transition-all hover:bg-emerald-50 dark:border-white/10 dark:bg-white/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
                      title="Ping Tutor"
                    >
                      <CheckCircle2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
