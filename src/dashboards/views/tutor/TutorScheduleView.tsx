import React, { useEffect, useState, useCallback } from 'react'
import { Calendar as CalendarIcon, Clock } from 'lucide-react'
import { supabase } from '../../../supabase'
import UpcomingClasses from '../../../components/UpcomingClasses'

interface TutorScheduleViewProps {
  userId?: string | null
}

interface TutorScheduleItem {
  id: string
  start_time: string
  end_time: string
  student_name: string
  grade: string
}

export default function TutorScheduleView({ userId }: TutorScheduleViewProps) {
  const [classes, setClasses] = useState<TutorScheduleItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSchedule = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
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
        .order('start_time', { ascending: true })

      if (error) throw error

      const formatted = (data || []).map(
        (e: {
          id: string
          start_time: string
          end_time: string
          student_name?: string | null
          grade?: string | null
          classes?: {
            student_name?: string | null
            students?: {
              full_name?: string | null
              grade?: string | null
            } | null
          } | null
        }) => ({
          ...e,
          student_name:
            e.classes?.students?.full_name || e.classes?.student_name || 'N/A',
          grade: e.classes?.students?.grade || 'N/A',
        }),
      )

      setClasses(formatted)
    } catch (err) {
      console.error('Error fetching schedule:', err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchSchedule()
  }, [fetchSchedule])

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 text-gray-900 dark:text-white md:p-8">
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-lg backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#131b31]/60 md:p-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-purple-500/10 px-3.5 py-1.5 text-xs font-bold tracking-wider text-purple-600 dark:text-purple-300">
          <CalendarIcon size={14} />
          CALENDAR & SESSIONS
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">
          Class Schedule
        </h1>
        <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400 md:text-base">
          Review all scheduled upcoming virtual tutorial sessions and student
          time slots.
        </p>
      </div>

      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-lg backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#131b31]/60 md:p-8">
        <UpcomingClasses classes={classes} loading={loading} />
      </div>
    </div>
  )
}
