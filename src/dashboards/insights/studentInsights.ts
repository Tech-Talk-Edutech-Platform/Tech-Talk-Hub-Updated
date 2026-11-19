import { supabase } from '../../supabase'
import { loadCourseLessons, studentCourseId } from './courseLessons'
import { optionalRows } from './optionalRows'

export type HomeworkDue = {
  id: string
  task: string
  status: 'pending' | 'needs_revision'
  createdAt: string | null
}

export type StudentInsights = {
  course: { id: string; title: string } | null
  lessonsTotal: number
  lessonsDone: number
  /** Whole-number share of lessons completed, or null without a course. */
  progress: number | null
  nextLesson: { id: string; title: string } | null
  quizzesPassed: number
  quizzesToRetake: number
  badges: number
  homework: HomeworkDue[]
}

export async function loadStudentInsights(
  studentId: string,
): Promise<StudentInsights> {
  const [profile, enrollments, completed, attempts, badges, homework] =
    await Promise.all([
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

  const courseId = studentCourseId(
    enrollments.flatMap((row) => (row.course_id ? [row.course_id] : [])),
    profile.data?.assigned_course_id,
  )

  const [lessons, courseRows] = courseId
    ? await Promise.all([
        loadCourseLessons([courseId]).catch((error: unknown) => {
          console.warn('Dashboard lessons unavailable:', error)
          return []
        }),
        optionalRows(
          'course',
          supabase.from('courses').select('id, title').eq('id', courseId),
        ),
      ])
    : [[], []]

  const done = new Set(
    completed.flatMap((row) => (row.lesson_id ? [row.lesson_id] : [])),
  )
  const lessonsDone = lessons.filter((lesson) => done.has(lesson.id)).length
  const next = lessons.find((lesson) => !done.has(lesson.id))

  const passed = new Set<string>()
  const attempted = new Set<string>()
  for (const attempt of attempts) {
    if (!attempt.quiz_id) continue
    attempted.add(attempt.quiz_id)
    if (attempt.passed) passed.add(attempt.quiz_id)
  }

  if (badges.error) console.warn('Dashboard badges unavailable:', badges.error)

  return {
    course: courseRows[0] ?? null,
    lessonsTotal: lessons.length,
    lessonsDone,
    progress: lessons.length
      ? Math.round((lessonsDone / lessons.length) * 100)
      : null,
    nextLesson: next ? { id: next.id, title: next.title } : null,
    quizzesPassed: passed.size,
    quizzesToRetake: [...attempted].filter((id) => !passed.has(id)).length,
    badges: badges.count ?? 0,
    homework: homework.map((row) => ({
      id: row.id,
      task: row.task_name,
      status: row.status === 'needs_revision' ? 'needs_revision' : 'pending',
      createdAt: row.created_at,
    })),
  }
}
