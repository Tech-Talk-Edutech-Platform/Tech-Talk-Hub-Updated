import { useEffect, useState } from 'react'
import { Calendar as CalendarIcon } from 'lucide-react'
import { supabase } from '../../../supabase'
import UpcomingClasses from '../../../components/UpcomingClasses'

interface TutorScheduleViewProps {
  userId?: string | null
}

interface TutorScheduleItem {
  id: string
  start_time: string
  end_time: string
  title: string
  meet_link: string | null
  student_name: string
}

async function loadTutorSchedule(
  tutorId: string,
): Promise<TutorScheduleItem[]> {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('id, start_time, end_time, title, meet_link, classes(student_id)')
    .eq('tutor_id', tutorId)
    .order('start_time', { ascending: true })

  if (error) throw error

  const studentIds = [
    ...new Set(
      data.flatMap((event) =>
        event.classes?.student_id ? [event.classes.student_id] : [],
      ),
    ),
  ]
  const names = new Map<string, string>()

  if (studentIds.length > 0) {
    const { data: students, error: studentsError } = await supabase
      .from('users')
      .select('id, full_name')
      .in('id', studentIds)

    if (studentsError) throw studentsError
    for (const student of students) names.set(student.id, student.full_name)
  }

  return data.map((event) => ({
    id: event.id,
    start_time: event.start_time,
    end_time: event.end_time,
    title: event.title,
    meet_link: event.meet_link,
    student_name:
      (event.classes?.student_id && names.get(event.classes.student_id)) ||
      'N/A',
  }))
}

export default function TutorScheduleView({ userId }: TutorScheduleViewProps) {
  const [classes, setClasses] = useState<TutorScheduleItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return undefined

    let cancelled = false
    loadTutorSchedule(userId).then(
      (rows) => {
        if (cancelled) return
        setClasses(rows)
        setLoading(false)
      },
      (err: unknown) => {
        if (cancelled) return
        console.error('Error fetching schedule:', err)
        setLoading(false)
      },
    )
    return () => {
      cancelled = true
    }
  }, [userId])

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 text-gray-900 md:p-8 dark:text-white">
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-lg backdrop-blur-xl md:p-8 dark:border-white/8 dark:bg-[#131b31]/60">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-purple-500/10 px-3.5 py-1.5 text-xs font-bold tracking-wider text-purple-600 dark:text-purple-300">
          <CalendarIcon size={14} />
          CALENDAR & SESSIONS
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">
          Class Schedule
        </h1>
        <p className="mt-1.5 text-sm text-gray-600 md:text-base dark:text-gray-400">
          Review all scheduled upcoming virtual tutorial sessions and student
          time slots.
        </p>
      </div>

      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-lg backdrop-blur-xl md:p-8 dark:border-white/8 dark:bg-[#131b31]/60">
        <UpcomingClasses classes={classes} loading={loading} />
      </div>
    </div>
  )
}
