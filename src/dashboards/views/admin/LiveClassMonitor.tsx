import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../supabase'
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  Users,
  AlertCircle,
  Video,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import type { Tables } from '../../../types/database'

type MonitorTutor = Pick<Tables<'users'>, 'id' | 'full_name' | 'email' | 'role'>

type MonitorEvent = Pick<
  Tables<'calendar_events'>,
  | 'id'
  | 'title'
  | 'meet_link'
  | 'start_time'
  | 'end_time'
  | 'tutor_id'
  | 'class_id'
  | 'class_type'
  | 'booking_status'
  | 'session_status'
>

type MonitorClass = Tables<'classes'> & {
  calendar_event: MonitorEvent | null
}

interface LiveClassMonitorProps {
  notifyTutor?: (tutorId: string, message: string) => unknown
}

const LiveClassMonitor = ({ notifyTutor }: LiveClassMonitorProps) => {
  const [classes, setClasses] = useState<MonitorClass[]>([])
  const [tutors, setTutors] = useState<MonitorTutor[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [pingingTutorId, setPingingTutorId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [today] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  })

  const fetchClasses = useCallback(
    async (isRefresh = false) => {
      isRefresh ? setRefreshing(true) : setLoading(true)
      setError('')
      try {
        // Your schema uses classes.scheduled_at, not class_date/class_time.
        const start = new Date(`${today}T00:00:00`)
        const end = new Date(start)
        end.setDate(end.getDate() + 1)

        const { data: classData, error: classError } = await supabase
          .from('classes')
          .select('*')
          .gte('scheduled_at', start.toISOString())
          .lt('scheduled_at', end.toISOString())
          .order('scheduled_at', { ascending: true })
        if (classError) throw classError

        const classIds = (classData || [])
          .map((item) => item.id)
          .filter(Boolean)
        const tutorIds = [
          ...new Set(
            (classData || []).map((item) => item.tutor_id).filter(Boolean),
          ),
        ]
        let tutorData: MonitorTutor[] = []
        let eventData: MonitorEvent[] = []

        if (tutorIds.length) {
          const { data, error: tutorError } = await supabase
            .from('users')
            .select('id, full_name, name, email, role')
            .in('id', tutorIds)
          if (tutorError) throw tutorError
          tutorData = data || []
        }

        // calendar_events contains meet_link and references classes through class_id.
        if (classIds.length) {
          const { data, error: eventError } = await supabase
            .from('calendar_events')
            .select(
              'id, title, meet_link, start_time, end_time, tutor_id, class_id, class_type, booking_status, session_status',
            )
            .in('class_id', classIds)
            .order('start_time', { ascending: true })
          if (eventError) throw eventError
          eventData = data || []
        }

        const eventMap = new Map<string, MonitorEvent>()
        for (const event of eventData) {
          const key = String(event.class_id)
          const previous = eventMap.get(key)
          if (!previous || (!previous.meet_link && event.meet_link))
            eventMap.set(key, event)
        }
        setClasses(
          (classData || []).map((item) => ({
            ...item,
            calendar_event: eventMap.get(String(item.id)) || null,
          })),
        )
        setTutors(tutorData)
      } catch (err) {
        console.error("Failed to load today's classes:", err)
        setError(
          err?.message ||
            "Unable to load today's classes. Check your database configuration and permissions.",
        )
        toast.error("Could not load today's classes.")
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [today],
  )

  useEffect(() => {
    fetchClasses()
  }, [fetchClasses])

  const getTutor = (id: string | null) =>
    tutors.find((t) => String(t.id) === String(id))
  const getTutorName = (id: string | null) => {
    if (!id) return 'Unassigned Tutor'
    const tutor = getTutor(id)
    return tutor?.full_name || tutor?.name || tutor?.email || 'Assigned Tutor'
  }
  const getClassTitle = (item: MonitorClass) =>
    item.title ||
    item.class_name ||
    item.name ||
    item.calendar_event?.title ||
    `${item.class_type || 'Scheduled'} Class`
  const getScheduledDate = (item: MonitorClass) => {
    const value = item.scheduled_at || item.calendar_event?.start_time
    if (!value) return null
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }
  const getClassTime = (item: MonitorClass) => {
    const date = getScheduledDate(item)
    return date
      ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      : 'Time not specified'
  }
  const getMeetLink = (item: MonitorClass) => {
    const value = item.calendar_event?.meet_link || item.meet_link || ''
    return typeof value === 'string' ? value.trim() : ''
  }
  const hasValidMeetLink = (value: string) => {
    try {
      const url = new URL(value)
      return url.protocol === 'https:' || url.protocol === 'http:'
    } catch {
      return false
    }
  }

  const handleJoinClass = (item: MonitorClass) => {
    const link = getMeetLink(item)
    if (!hasValidMeetLink(link)) {
      toast.error('No valid meeting link is saved for this class yet.')
      return
    }
    // Opens the saved meeting link. Google Meet may still require the admin to sign in or be admitted.
    window.open(link, '_blank', 'noopener,noreferrer')
  }

  const handlePingTutor = async (item: MonitorClass) => {
    if (!item.tutor_id)
      return toast.error('Assign a tutor to this class first.')
    if (typeof notifyTutor !== 'function')
      return toast.error(
        'Tutor notifications are not connected to this page yet.',
      )
    setPingingTutorId(item.id)
    try {
      await notifyTutor(
        item.tutor_id,
        `Reminder: ${getClassTitle(item)} at ${getClassTime(item)}`,
      )
      toast.success(`Notification sent to ${getTutorName(item.tutor_id)}.`)
    } catch (err) {
      console.error('Failed to notify tutor:', err)
      toast.error('Could not notify the tutor.')
    } finally {
      setPingingTutorId(null)
    }
  }

  const filteredClasses = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return classes
    return classes.filter((item) =>
      [
        getClassTitle(item),
        getTutorName(item.tutor_id),
        getClassTime(item),
        item.class_type || '',
      ].some((value) => String(value).toLowerCase().includes(query)),
    )
  }, [classes, search, tutors])

  const assignedCount = classes.filter((item) => item.tutor_id).length
  const unassignedCount = classes.length - assignedCount
  const formattedToday = new Date(`${today}T12:00:00`).toLocaleDateString(
    'en-KE',
    {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    },
  )

  return (
    <div className="min-h-screen space-y-7 bg-gray-50 p-4 dark:bg-[#0b0b12] sm:p-6 lg:p-8">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-100 dark:bg-purple-500/15">
              <Activity
                size={20}
                className="text-purple-600 dark:text-purple-400"
              />
            </div>
            <span className="text-xs font-black uppercase tracking-[0.2em] text-purple-600 dark:text-purple-400">
              Operations Centre
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white sm:text-3xl">
            Live Class Monitor
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Monitor today's classes, join meetings, and contact assigned tutors.
          </p>
          <div className="mt-3 flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400">
            <CalendarDays size={14} />
            {formattedToday}
          </div>
        </div>
        <button
          type="button"
          onClick={() => fetchClasses(true)}
          disabled={refreshing || loading}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-700 shadow-xs hover:bg-gray-100 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-white"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing...' : 'Refresh Classes'}
        </button>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            label: "Today's Classes",
            value: classes.length,
            Icon: CalendarDays,
            color: 'text-purple-600 dark:text-purple-400',
            bg: 'bg-purple-100 dark:bg-purple-500/15',
          },
          {
            label: 'Tutors Assigned',
            value: assignedCount,
            Icon: Users,
            color: 'text-emerald-600 dark:text-emerald-400',
            bg: 'bg-emerald-100 dark:bg-emerald-500/10',
          },
          {
            label: 'Unassigned Classes',
            value: unassignedCount,
            Icon: AlertCircle,
            color: 'text-amber-600 dark:text-amber-400',
            bg: 'bg-amber-100 dark:bg-amber-500/10',
          },
        ].map(({ label, value, Icon, color, bg }) => (
          <div
            key={label}
            className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-white/5"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                  {label}
                </p>
                <p className="mt-2 text-3xl font-black text-gray-900 dark:text-white">
                  {loading ? '—' : value}
                </p>
              </div>
              <div className={`rounded-2xl p-3 ${bg}`}>
                <Icon size={22} className={color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-[32px] border border-gray-100 bg-white shadow-xs dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-col gap-4 border-b border-gray-100 p-5 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="text-lg font-black text-gray-900 dark:text-white">
              Today's Schedule
            </h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Admins can join any class with a saved meeting link.
            </p>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search classes or tutors..."
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm text-gray-900 outline-hidden focus:border-purple-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>
        </div>

        <div className="space-y-3 p-4 sm:p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <RefreshCw size={28} className="animate-spin text-purple-600" />
              <p className="mt-4 text-sm font-bold text-gray-500">
                Loading today's classes...
              </p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-500/20 dark:bg-red-500/10">
              <div className="flex gap-3">
                <AlertCircle size={20} className="shrink-0 text-red-600" />
                <div>
                  <p className="font-bold text-red-700 dark:text-red-400">
                    Could not load the schedule
                  </p>
                  <p className="mt-1 text-sm text-red-600 dark:text-red-300">
                    {error}
                  </p>
                  <button
                    type="button"
                    onClick={() => fetchClasses()}
                    className="mt-3 text-sm font-black underline"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 px-5 py-14 text-center dark:border-white/10">
              <CalendarDays size={28} className="mx-auto text-gray-400" />
              <h3 className="mt-4 text-sm font-black text-gray-800 dark:text-white">
                {search
                  ? 'No matching classes'
                  : 'No classes scheduled for today'}
              </h3>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {search
                  ? 'Try another search.'
                  : "Today's scheduled classes will appear here."}
              </p>
            </div>
          ) : (
            filteredClasses.map((item) => {
              const assigned = Boolean(item.tutor_id)
              const link = getMeetLink(item)
              const status =
                item.calendar_event?.session_status ||
                (item.completed ? 'completed' : 'scheduled')
              const statusClass =
                status === 'ongoing'
                  ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'
                  : status === 'completed'
                    ? 'bg-gray-200 text-gray-700 dark:bg-white/10 dark:text-gray-300'
                    : 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
              return (
                <article
                  key={item.id}
                  className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-gray-50/60 p-4 hover:border-purple-200 dark:border-white/10 dark:bg-white/2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-purple-100 dark:bg-purple-500/15">
                      <Activity
                        size={20}
                        className="text-purple-600 dark:text-purple-400"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-black text-gray-900 dark:text-white">
                        {getClassTitle(item)}
                      </h3>
                      <p className="mt-1 truncate text-xs font-bold text-purple-600 dark:text-purple-400">
                        {getTutorName(item.tutor_id)}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-bold text-gray-600 ring-1 ring-gray-200 dark:bg-white/5 dark:text-gray-300 dark:ring-white/10">
                          <Clock size={12} />
                          {getClassTime(item)}
                        </span>
                        <span
                          className={`rounded-lg px-2.5 py-1.5 text-[10px] font-black ${assigned ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'}`}
                        >
                          {assigned ? 'Tutor Assigned' : 'Needs Tutor'}
                        </span>
                        <span
                          className={`rounded-lg px-2.5 py-1.5 text-[10px] font-black ${statusClass}`}
                        >
                          {status === 'ongoing'
                            ? 'Live now'
                            : status === 'completed'
                              ? 'Completed'
                              : status === 'cancelled'
                                ? 'Cancelled'
                                : 'Scheduled'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleJoinClass(item)}
                      disabled={!hasValidMeetLink(link)}
                      title={
                        link
                          ? 'Join this class as an admin'
                          : 'No meeting link saved for this class'
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3 text-xs font-black text-white shadow-xs hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Video size={14} />
                      Join Class{link && <ExternalLink size={12} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePingTutor(item)}
                      disabled={!assigned || pingingTutorId === item.id}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs font-black text-emerald-700 shadow-xs hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-emerald-400"
                    >
                      {pingingTutorId === item.id ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={14} />
                      )}
                      {pingingTutorId === item.id ? 'Sending...' : 'Ping Tutor'}
                    </button>
                  </div>
                </article>
              )
            })
          )}
        </div>
        {!loading && !error && filteredClasses.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-4 dark:border-white/10">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
              Showing {filteredClasses.length} of {classes.length} classes
              scheduled today.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}

export default LiveClassMonitor
