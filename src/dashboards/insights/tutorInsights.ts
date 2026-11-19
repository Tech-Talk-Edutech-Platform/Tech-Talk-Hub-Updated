import { supabase } from '../../supabase'
import {
  average,
  bucketSeries,
  type ChartPoint,
  percentChange,
  periodHalf,
  periodRange,
  type PeriodId,
} from '../../components/dashboard/period'
import { loadCourseLessons, studentCourseId } from './courseLessons'
import { optionalRows } from './optionalRows'

const DEFAULT_PASS_MARK = 70
const HOMEWORK_STATUSES = [
  { status: 'pending', label: 'Not started' },
  { status: 'submitted', label: 'To review' },
  { status: 'needs_revision', label: 'Needs revision' },
  { status: 'completed', label: 'Completed' },
] as const

export type TutorStudentRow = {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  course: string | null
  lastClassAt: string | null
  /** Share of the course's lessons completed, or null without a course. */
  progress: number | null
  quizAverage: number | null
  failedQuizzes: number
  needsHelp: boolean
}

export type StuckQuiz = {
  quizId: string
  title: string
  attempted: number
  passRate: number
}

export type TutorInsights = {
  kpis: {
    students: number
    classes: { current: number; change: number | null }
    quizAverage: { current: number | null; change: number | null }
    toReview: number
    needsRevision: number
  }
  classTrend: ChartPoint[]
  homework: Array<{ name: string; value: number }>
  students: TutorStudentRow[]
  stuckQuizzes: StuckQuiz[]
}

type Attempt = {
  student_id: string | null
  quiz_id: string | null
  score: number
  passed: boolean
  completed_at: string | null
}

/** Each student's most recent attempt at each quiz. */
function latestAttempts(attempts: readonly Attempt[]) {
  const latest = new Map<string, Attempt>()
  for (const attempt of attempts) {
    if (!attempt.student_id || !attempt.quiz_id) continue
    const key = `${attempt.student_id}:${attempt.quiz_id}`
    const current = latest.get(key)
    if (
      !current ||
      Date.parse(attempt.completed_at ?? '') >
        Date.parse(current.completed_at ?? '')
    ) {
      latest.set(key, attempt)
    }
  }
  return [...latest.values()]
}

export async function loadTutorInsights(
  tutorId: string,
  periodId: PeriodId,
): Promise<TutorInsights> {
  const range = periodRange(periodId)

  const [studentsResult, eventsResult] = await Promise.all([
    supabase
      .from('users')
      .select('id, full_name, email, avatar_url, assigned_course_id')
      .eq('assigned_tutor_id', tutorId)
      .eq('role', 'student'),
    supabase
      .from('calendar_events')
      .select('id, start_time, ended_at, session_status, classes (student_id)')
      .eq('tutor_id', tutorId)
      .neq('title', 'Free Slot')
      .neq('booking_status', 'cancelled')
      .gte('start_time', range.previousStart.toISOString())
      .lte('start_time', range.end.toISOString()),
  ])
  if (studentsResult.error) throw studentsResult.error
  if (eventsResult.error) throw eventsResult.error

  const students = studentsResult.data
  const events = eventsResult.data
  const studentIds = students.map((student) => student.id)
  const hasStudents = studentIds.length > 0

  const [enrollments, progress, attempts, assignments] = await Promise.all([
    hasStudents
      ? optionalRows(
          'enrollments',
          supabase
            .from('student_enrollments')
            .select('student_id, course_id')
            .in('student_id', studentIds),
        )
      : [],
    hasStudents
      ? optionalRows(
          'lesson progress',
          supabase
            .from('student_lesson_progress')
            .select('student_id, lesson_id')
            .eq('status', 'completed')
            .in('student_id', studentIds),
        )
      : [],
    hasStudents
      ? optionalRows(
          'quiz attempts',
          supabase
            .from('student_quiz_attempts')
            .select('student_id, quiz_id, score, passed, completed_at')
            .in('student_id', studentIds),
        )
      : [],
    optionalRows(
      'homework',
      supabase
        .from('student_assignments')
        .select('status')
        .or(
          hasStudents
            ? `tutor_id.eq.${tutorId},student_id.in.(${studentIds.join(',')})`
            : `tutor_id.eq.${tutorId}`,
        ),
    ),
  ])

  // Courses and their lessons, for progress and course names.
  const enrolledByStudent = new Map<string, string[]>()
  for (const enrollment of enrollments) {
    if (!enrollment.student_id || !enrollment.course_id) continue
    const list = enrolledByStudent.get(enrollment.student_id) ?? []
    list.push(enrollment.course_id)
    enrolledByStudent.set(enrollment.student_id, list)
  }
  const courseByStudent = new Map(
    students.map((student) => [
      student.id,
      studentCourseId(
        enrolledByStudent.get(student.id) ?? [],
        student.assigned_course_id,
      ),
    ]),
  )
  const courseIds = [
    ...new Set(
      [...courseByStudent.values()].filter((id): id is string => Boolean(id)),
    ),
  ]
  const quizIds = [
    ...new Set(
      attempts.flatMap((attempt) => (attempt.quiz_id ? [attempt.quiz_id] : [])),
    ),
  ]

  const [lessons, courses, quizzes] = await Promise.all([
    loadCourseLessons(courseIds).catch((error: unknown) => {
      console.warn('Dashboard lessons unavailable:', error)
      return []
    }),
    courseIds.length
      ? optionalRows(
          'courses',
          supabase.from('courses').select('id, title').in('id', courseIds),
        )
      : [],
    quizIds.length
      ? optionalRows(
          'quizzes',
          supabase
            .from('quizzes')
            .select('id, title, passing_score')
            .in('id', quizIds),
        )
      : [],
  ])

  const lessonsPerCourse = new Map<string, Set<string>>()
  for (const lesson of lessons) {
    const set = lessonsPerCourse.get(lesson.courseId) ?? new Set<string>()
    set.add(lesson.id)
    lessonsPerCourse.set(lesson.courseId, set)
  }
  const courseTitle = new Map(
    courses.map((course) => [course.id, course.title]),
  )
  const quizById = new Map(quizzes.map((quiz) => [quiz.id, quiz]))

  const completedByStudent = new Map<string, Set<string>>()
  for (const row of progress) {
    if (!row.student_id || !row.lesson_id) continue
    const set = completedByStudent.get(row.student_id) ?? new Set<string>()
    set.add(row.lesson_id)
    completedByStudent.set(row.student_id, set)
  }

  const latest = latestAttempts(attempts)
  const latestByStudent = new Map<string, Attempt[]>()
  for (const attempt of latest) {
    if (!attempt.student_id) continue
    const list = latestByStudent.get(attempt.student_id) ?? []
    list.push(attempt)
    latestByStudent.set(attempt.student_id, list)
  }

  const now = Date.now()
  const lastClassByStudent = new Map<string, string>()
  for (const event of events) {
    const studentId = event.classes?.student_id
    if (!studentId || Date.parse(event.start_time) > now) continue
    const previous = lastClassByStudent.get(studentId)
    if (!previous || event.start_time > previous)
      lastClassByStudent.set(studentId, event.start_time)
  }

  const studentRows: TutorStudentRow[] = students.map((student) => {
    const courseId = courseByStudent.get(student.id) ?? null
    const courseLessons = courseId ? lessonsPerCourse.get(courseId) : undefined
    const completed = completedByStudent.get(student.id) ?? new Set<string>()
    const done = courseLessons
      ? [...completed].filter((id) => courseLessons.has(id)).length
      : 0
    const studentAttempts = latestByStudent.get(student.id) ?? []
    const quizAverage = average(studentAttempts.map((a) => a.score))
    const failedQuizzes = studentAttempts.filter((a) => !a.passed).length

    return {
      id: student.id,
      name: student.full_name,
      email: student.email,
      avatarUrl: student.avatar_url,
      course: courseId ? (courseTitle.get(courseId) ?? null) : null,
      lastClassAt: lastClassByStudent.get(student.id) ?? null,
      progress:
        courseLessons && courseLessons.size > 0
          ? Math.round((done / courseLessons.size) * 100)
          : null,
      quizAverage: quizAverage === null ? null : Math.round(quizAverage),
      failedQuizzes,
      needsHelp:
        failedQuizzes > 0 ||
        (quizAverage !== null && quizAverage < DEFAULT_PASS_MARK),
    }
  })

  // Quizzes with the lowest pass rate among this tutor's students.
  const byQuiz = new Map<string, { attempted: number; passed: number }>()
  for (const attempt of latest) {
    if (!attempt.quiz_id) continue
    const entry = byQuiz.get(attempt.quiz_id) ?? { attempted: 0, passed: 0 }
    entry.attempted += 1
    if (attempt.passed) entry.passed += 1
    byQuiz.set(attempt.quiz_id, entry)
  }
  const stuckQuizzes = [...byQuiz.entries()]
    .map(([quizId, entry]) => ({
      quizId,
      title: quizById.get(quizId)?.title ?? 'Lesson quiz',
      attempted: entry.attempted,
      passRate: Math.round((entry.passed / entry.attempted) * 100),
    }))
    .filter((quiz) => quiz.passRate < 100)
    .toSorted((a, b) => a.passRate - b.passRate || b.attempted - a.attempted)
    .slice(0, 5)

  // Classes held this period versus the previous one.
  const pastEvents = events.filter(
    (event) => Date.parse(event.start_time) <= now,
  )
  const classesCurrent = pastEvents.filter(
    (event) => periodHalf(range, event.start_time) === 'current',
  ).length
  const classesPrevious = pastEvents.filter(
    (event) => periodHalf(range, event.start_time) === 'previous',
  ).length

  const scores = { current: [] as number[], previous: [] as number[] }
  for (const attempt of attempts) {
    const half = periodHalf(range, attempt.completed_at)
    if (half) scores[half].push(attempt.score)
  }
  const quizCurrent = average(scores.current)
  const quizPrevious = average(scores.previous)

  const classTrend = bucketSeries(
    range,
    pastEvents
      .filter((event) => periodHalf(range, event.start_time) === 'current')
      .flatMap((event) => {
        const completed =
          event.session_status === 'completed' || event.ended_at !== null
        const rows: Array<{ at: string; key: 'scheduled' | 'completed' }> = [
          { at: event.start_time, key: 'scheduled' },
        ]
        if (completed) rows.push({ at: event.start_time, key: 'completed' })
        return rows
      }),
    ['scheduled', 'completed'],
  )

  const homeworkCounts = new Map<string, number>()
  for (const row of assignments) {
    const status = row.status ?? 'pending'
    homeworkCounts.set(status, (homeworkCounts.get(status) ?? 0) + 1)
  }

  return {
    kpis: {
      students: students.length,
      classes: {
        current: classesCurrent,
        change: percentChange(classesCurrent, classesPrevious),
      },
      quizAverage: {
        current: quizCurrent === null ? null : Math.round(quizCurrent),
        change:
          quizCurrent === null || quizPrevious === null
            ? null
            : percentChange(quizCurrent, quizPrevious),
      },
      toReview: homeworkCounts.get('submitted') ?? 0,
      needsRevision: homeworkCounts.get('needs_revision') ?? 0,
    },
    classTrend,
    homework: HOMEWORK_STATUSES.map(({ status, label }) => ({
      name: label,
      value: homeworkCounts.get(status) ?? 0,
    })).filter((slice) => slice.value > 0),
    students: studentRows,
    stuckQuizzes,
  }
}
