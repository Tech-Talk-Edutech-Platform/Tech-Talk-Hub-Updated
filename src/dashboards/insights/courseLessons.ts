import { supabase } from '../../supabase'

export type CourseLesson = { id: string; title: string; courseId: string }

/**
 * Lessons of the given courses in syllabus order (phase, then position),
 * read with the caller's own permissions.
 */
export async function loadCourseLessons(
  courseIds: readonly string[],
): Promise<CourseLesson[]> {
  if (courseIds.length === 0) return []

  const { data: phases, error: phaseError } = await supabase
    .from('course_phases')
    .select('id, course_id, phase_number')
    .in('course_id', [...courseIds])
  if (phaseError) throw phaseError

  const phaseIds = phases.map((phase) => phase.id)
  if (phaseIds.length === 0) return []

  const { data: lessons, error: lessonError } = await supabase
    .from('course_lessons')
    .select('id, title, phase_id, position')
    .in('phase_id', phaseIds)
  if (lessonError) throw lessonError

  const phaseById = new Map(phases.map((phase) => [phase.id, phase]))
  return lessons
    .flatMap((lesson) => {
      const phase = lesson.phase_id ? phaseById.get(lesson.phase_id) : null
      return phase?.course_id
        ? [
            {
              id: lesson.id,
              title: lesson.title,
              courseId: phase.course_id,
              order: [phase.phase_number ?? 0, lesson.position ?? 0],
            },
          ]
        : []
    })
    .toSorted((a, b) => a.order[0] - b.order[0] || a.order[1] - b.order[1])
    .map(({ id, title, courseId }) => ({ id, title, courseId }))
}

/** A student's course: an enrollment wins over the legacy assigned course. */
export function studentCourseId(
  enrolledCourseIds: readonly string[],
  assignedCourseId: string | null | undefined,
) {
  return enrolledCourseIds[0] ?? assignedCourseId ?? null
}
