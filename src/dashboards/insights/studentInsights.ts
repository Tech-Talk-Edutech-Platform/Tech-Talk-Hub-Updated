import type { ClassInvite } from '../../types/classroom'
import { supabase } from '../../supabase'
import { inviteJoinPath } from '../../lib/classroom/invites'
import {
  isStillJoinable,
  joinWindow,
  type ClassSchedule,
} from '../../lib/classroom/schedule'
import { loadCourseLessons } from './courseLessons'
import { optionalRows } from './optionalRows'

const DAY_MS = 86_400_000
/** How far back and ahead the class calendar looks. */
const CALENDAR_PAST_DAYS = 31
const CALENDAR_AHEAD_DAYS = 120

export type HomeworkDue = {
  id: string
  task: string
  status: 'pending' | 'needs_revision'
  createdAt: string | null
}

export type StudentClass = {
  id: string
  title: string
  startsAt: string
  endsAt: string | null
  tutorName: string | null
  /** 1:1 class from the schedule, or a live classroom session. */
  kind: 'class' | 'classroom'
  /** External meeting link for scheduled classes. */
  meetLink: string | null
  /** In-app classroom path for classroom sessions. */
  joinPath: string | null
  /** Classroom schedule, so joining follows the classroom's own rules. */
  schedule: ClassSchedule | null
  live: boolean
}

export type StudentCourse = {
  id: string
  title: string
  lessonsTotal: number
  lessonsDone: number
  progress: number | null
}

export type StudentInsights = {
  course: { id: string; title: string } | null
  lessonsTotal: number
  lessonsDone: number
  /** Whole-number share of lessons completed, or null without a course. */
  progress: number | null
  nextLesson: { id: string; title: string } | null
  courses: StudentCourse[]
  quizzesPassed: number
  quizzesToRetake: number
  certificates: number | null
  badges: number | null
  homework: HomeworkDue[]
}

/** Booked classes from `event_attendance`, as the schedule page reads them. */
export async function loadScheduledClasses(studentId: string) {
  const attendance = await optionalRows(
    'class bookings',
    supabase
      .from('event_attendance')
      .select('event_id')
      .eq('student_id', studentId),
  )
  const eventIds = [
    ...new Set(
      attendance.flatMap((row) => (row.event_id ? [row.event_id] : [])),
    ),
  ]
  if (eventIds.length === 0) return []

  const now = Date.now()
  const events = await optionalRows(
    'classes',
    supabase
      .from('calendar_events')
      .select('id, title, start_time, end_time, meet_link, tutor_id')
      .in('id', eventIds)
      .neq('title', 'Free Slot')
      .neq('booking_status', 'cancelled')
      .gte(
        'start_time',
        new Date(now - CALENDAR_PAST_DAYS * DAY_MS).toISOString(),
      )
      .lte(
        'start_time',
        new Date(now + CALENDAR_AHEAD_DAYS * DAY_MS).toISOString(),
      ),
  )

  const tutorIds = [
    ...new Set(
      events.flatMap((event) => (event.tutor_id ? [event.tutor_id] : [])),
    ),
  ]
  const tutors = tutorIds.length
    ? await optionalRows(
        'tutor names',
        supabase.from('users').select('id, full_name').in('id', tutorIds),
      )
    : []
  const tutorName = new Map(tutors.map((tutor) => [tutor.id, tutor.full_name]))

  return events.map((event): StudentClass => ({
    id: `class-${event.id}`,
    title: event.title,
    startsAt: event.start_time,
    endsAt: event.end_time,
    tutorName: (event.tutor_id && tutorName.get(event.tutor_id)) || null,
    kind: 'class',
    meetLink:
      event.meet_link && /^https?:\/\//i.test(event.meet_link)
        ? event.meet_link
        : null,
    joinPath: null,
    schedule: null,
    live: false,
  }))
}

/** Scheduled or live classroom sessions the student was invited to. */
export function studentClassroomSessions(
  invites: readonly ClassInvite[],
): StudentClass[] {
  return invites.flatMap((invite) => {
    if (invite.status !== 'scheduled' && invite.status !== 'live') return []
    const startsAt =
      invite.schedule.startedAt ?? invite.schedule.scheduledAt ?? null
    if (!startsAt) return []
    const minutes = invite.schedule.durationMinutes
    return [
      {
        id: `classroom-${invite.sessionId}`,
        title: invite.title,
        startsAt,
        endsAt: minutes
          ? new Date(Date.parse(startsAt) + minutes * 60_000).toISOString()
          : null,
        tutorName: invite.tutorName,
        kind: 'classroom' as const,
        meetLink: null,
        joinPath: inviteJoinPath(invite.roomCode),
        schedule: invite.schedule,
        live: invite.status === 'live',
      },
    ]
  })
}

export async function loadStudentInsights(
  studentId: string,
): Promise<StudentInsights> {
  const [
    profile,
    enrollments,
    completed,
    attempts,
    badges,
    certificates,
    homework,
  ] = await Promise.all([
    supabase
      .from('users')
      .select('assigned_course_id')
      .eq('id', studentId)
      .maybeSingle(),
    optionalRows(
      'enrollments',
      supabase
        .from('student_enrollments')
        .select('course_id, enrolled_at')
        .eq('student_id', studentId)
        .order('enrolled_at', { ascending: false }),
    ),
    optionalRows(
      'lesson progress',
      supabase
        .from('student_lesson_progress')
        .select('lesson_id')
        .eq('student_id', studentId)
        .eq('status', 'completed'),
    ),
    optionalRows(
      'quiz attempts',
      supabase
        .from('student_quiz_attempts')
        .select('quiz_id, passed')
        .eq('student_id', studentId),
    ),
    supabase
      .from('classroom_badge_awards')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', studentId),
    supabase
      .from('student_results')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .eq('is_passed', true),
    optionalRows(
      'homework',
      supabase
        .from('student_assignments')
        .select('id, task_name, status, created_at')
        .eq('student_id', studentId)
        .in('status', ['pending', 'needs_revision'])
        .order('created_at', { ascending: true })
        .limit(5),
    ),
  ])
  if (profile.error) throw profile.error
  if (badges.error) console.warn('Dashboard badges unavailable:', badges.error)
  if (certificates.error)
    console.warn('Dashboard certificates unavailable:', certificates.error)

  // Most recent enrollment first; the legacy assigned course only applies
  // when the student has no enrollments.
  const enrolledIds = [
    ...new Set(
      enrollments.flatMap((row) => (row.course_id ? [row.course_id] : [])),
    ),
  ]
  const courseIds = enrolledIds.length
    ? enrolledIds
    : profile.data?.assigned_course_id
      ? [profile.data.assigned_course_id]
      : []

  const [lessons, courseRows] = courseIds.length
    ? await Promise.all([
        loadCourseLessons(courseIds),
        optionalRows(
          'courses',
          supabase.from('courses').select('id, title').in('id', courseIds),
        ),
      ])
    : [[], []]

  const done = new Set(
    completed.flatMap((row) => (row.lesson_id ? [row.lesson_id] : [])),
  )
  const titleById = new Map(courseRows.map((row) => [row.id, row.title]))
  const courses: StudentCourse[] = courseIds.flatMap((id) => {
    const title = titleById.get(id)
    if (!title) return []
    const courseLessons = lessons.filter((lesson) => lesson.courseId === id)
    const lessonsDone = courseLessons.filter((lesson) =>
      done.has(lesson.id),
    ).length
    return [
      {
        id,
        title,
        lessonsTotal: courseLessons.length,
        lessonsDone,
        progress: courseLessons.length
          ? Math.round((lessonsDone / courseLessons.length) * 100)
          : null,
      },
    ]
  })
  const current = courses[0] ?? null
  const next = current
    ? lessons.find(
        (lesson) => lesson.courseId === current.id && !done.has(lesson.id),
      )
    : undefined

  const passed = new Set<string>()
  const attempted = new Set<string>()
  for (const attempt of attempts) {
    if (!attempt.quiz_id) continue
    attempted.add(attempt.quiz_id)
    if (attempt.passed) passed.add(attempt.quiz_id)
  }

  return {
    course: current ? { id: current.id, title: current.title } : null,
    lessonsTotal: current?.lessonsTotal ?? 0,
    lessonsDone: current?.lessonsDone ?? 0,
    progress: current?.progress ?? null,
    nextLesson: next ? { id: next.id, title: next.title } : null,
    courses,
    quizzesPassed: passed.size,
    quizzesToRetake: [...attempted].filter((id) => !passed.has(id)).length,
    certificates: certificates.error ? null : certificates.count,
    badges: badges.error ? null : badges.count,
    homework: homework.map((row) => ({
      id: row.id,
      task: row.task_name,
      status: row.status === 'needs_revision' ? 'needs_revision' : 'pending',
      createdAt: row.created_at,
    })),
  }
}

const MEET_EARLY_JOIN_MINUTES = 15

/**
 * Whether the Join button shows. Classroom sessions use the classroom's own
 * join window; booked classes open 15 minutes early and close at the end.
 */
export function joinableNow(item: StudentClass, now = Date.now()) {
  if (item.schedule) {
    return (
      item.live ||
      (joinWindow(item.schedule, now).state !== 'early' &&
        isStillJoinable(item.schedule, now))
    )
  }
  if (!item.meetLink) return false
  const start = Date.parse(item.startsAt)
  const end = item.endsAt ? Date.parse(item.endsAt) : start + 90 * 60_000
  return now >= start - MEET_EARLY_JOIN_MINUTES * 60_000 && now <= end
}
