import type { PublicProgram } from '../../types/program'
import { getSupabase } from '../supabase'

/**
 * An active program by slug with its active courses (in program order) and
 * their phases. Resolves to `null` when the program doesn't exist; failing to
 * load courses or phases still returns what loaded.
 */
export async function fetchPublicProgram(
  slug: string,
): Promise<PublicProgram | null> {
  const supabase = getSupabase()

  const { data: program, error: programError } = await supabase
    .from('programs')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  if (programError) {
    throw programError
  }

  if (!program) {
    return null
  }

  const { data: links, error: linksError } = await supabase
    .from('program_courses')
    .select(
      `
        id,
        display_order,
        course:courses (
          id,
          title,
          description,
          thumbnail_url,
          duration_lessons,
          is_active
        )
      `,
    )
    .eq('program_id', program.id)
    .order('display_order', { ascending: true })

  if (linksError) {
    console.error('Failed to load program courses:', linksError)
    return { program, courses: [] }
  }

  const activeCourses = links
    .map((link) => link.course)
    .filter((course) => course?.is_active === true)

  if (activeCourses.length === 0) {
    return { program, courses: [] }
  }

  const { data: phases, error: phasesError } = await supabase
    .from('course_phases')
    .select('id, course_id, phase_number, title, focus')
    .in(
      'course_id',
      activeCourses.map((course) => course.id),
    )
    .order('phase_number', { ascending: true })

  if (phasesError) {
    console.error('Failed to load phases:', phasesError)
  }

  return {
    program,
    courses: activeCourses.map((course) =>
      Object.assign(course, {
        phases: (phases ?? []).filter((phase) => phase.course_id === course.id),
      }),
    ),
  }
}
