import React, { useEffect, useState, useCallback } from 'react'
import {
  Calendar,
  Clock,
  Users,
  AlertCircle,
  ShieldAlert,
  User as UserIcon,
} from 'lucide-react'
import { supabase } from '../../../supabase'
import UpcomingClasses from '../../../components/UpcomingClasses'
import RaiseIssue from './../RaiseIssue'

export default function TutorHomeView({ userId, courseId, user }) {
  const [loading, setLoading] = useState(true)
  const [upcomingClasses, setUpcomingClasses] = useState([])
  const [activeIssue, setActiveIssue] = useState(null)
  const [stats, setStats] = useState({
    classesToday: 0,
    upcoming: 0,
    activeStudents: 0,
    pendingReviews: 0,
  })

  const fetchData = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const { data: issues } = await supabase
        .from('issues')
        .select('status')
        .eq('reported_by', userId)
        .order('created_at', { ascending: false })
        .limit(1)

      setActiveIssue(issues?.[0])

      // 1. Fetch calendar events
      const calendarPromise = supabase
        .from('calendar_events')
        .select(
          `
          *,
          classes (
            student_name,
            students (full_name, grade)
          )
        `,
        )
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

      const events = calendarRes.data || []
      const studentList = studentRes.data || []
      const studentCount = studentList.length
      const studentIds = new Set(studentList.map((s) => s.id))

      // Match pending submissions for this specific tutor's students or direct tutor assignment
      const allAssignments = assignmentRes.data || []
      const pendingReviewsCount = allAssignments.filter((a) => {
        const isSubmittedOrPending =
          a.status === 'submitted' || a.status === 'pending'
        const isMyStudent =
          studentIds.has(a.student_id) || a.tutor_id === userId
        return isSubmittedOrPending && isMyStudent
      }).length

      const formattedEvents = events.map((e) => ({
        ...e,
        student_name:
          e.classes?.students?.full_name || e.classes?.student_name || 'N/A',
        grade: e.classes?.students?.grade || 'N/A',
      }))

      setStats({
        classesToday: events.filter(
          (e) =>
            new Date(e.start_time) < new Date(todayStart.getTime() + 86400000),
        ).length,
        upcoming: events.length,
        activeStudents: studentCount,
        pendingReviews: pendingReviewsCount,
      })

      setUpcomingClasses(formattedEvents)
    } catch (err) {
      console.error('Dashboard Sync Error:', err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const tutorAvatar =
    user?.avatar_url ||
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture
  const tutorName =
    user?.full_name ||
    user?.user_metadata?.full_name ||
    user?.name ||
    'Instructor'

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 text-gray-900 dark:text-white md:p-8">
      <div className="relative overflow-hidden rounded-[32px] border border-gray-100 bg-white p-6 shadow-lg backdrop-blur-xl dark:border-white/8 dark:bg-[#131b31]/65 md:p-8">
        <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 bg-purple-500/10 blur-[100px]" />
        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-purple-500/10 px-3.5 py-1.5 text-xs font-bold tracking-wider text-purple-600 dark:text-purple-300">
              <Users size={14} />
              TUTOR DASHBOARD
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">
              Welcome back, {tutorName}! 👋
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-gray-600 dark:text-gray-400 md:text-base">
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
              <span className="inline-block rounded-full bg-purple-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-purple-600 dark:bg-purple-500/10 dark:text-purple-300">
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-lg backdrop-blur-xl dark:border-white/8 dark:bg-[#131b31]/60 lg:col-span-8">
          <UpcomingClasses classes={upcomingClasses} loading={loading} />
        </div>

        <div className="flex flex-col justify-between rounded-[32px] border border-gray-100 bg-white p-6 shadow-lg backdrop-blur-xl dark:border-white/8 dark:bg-[#131b31]/60 lg:col-span-4">
          <div>
            <div className="mb-3 flex items-center gap-2 text-red-500">
              <ShieldAlert size={20} />
              <h2 className="text-lg font-black">Support Ticket</h2>
            </div>
            <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
              Having technical trouble? Send a ticket.
            </p>
          </div>
          <div>
            {!user ? (
              <p className="text-xs text-red-500">
                Please log in to send a ticket.
              </p>
            ) : (
              <RaiseIssue
                user={user}
                fetchAll={fetchData}
                isLocked={
                  activeIssue?.status === 'in_progress' ||
                  activeIssue?.status === 'resolved'
                }
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const StatCard = ({ icon, title, value, color }) => {
  const colors = {
    blue: 'bg-blue-600 shadow-blue-500/20',
    purple: 'bg-purple-600 shadow-purple-500/20',
    amber: 'bg-amber-600 shadow-amber-500/20',
    green: 'bg-emerald-600 shadow-emerald-500/20',
  }
  return (
    <div
      className={`${colors[color]} flex items-center justify-between rounded-[24px] p-5 text-white shadow-lg`}
    >
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/80">
          {title}
        </p>
        <h3 className="mt-1 text-2xl font-black">{value}</h3>
      </div>
      <div className="rounded-2xl bg-white/10 p-3 opacity-80">{icon}</div>
    </div>
  )
}
