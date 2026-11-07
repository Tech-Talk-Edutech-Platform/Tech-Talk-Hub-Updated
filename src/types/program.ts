import type { Tables } from './database'

export type Program = Tables<'programs'>

export type CoursePhase = Pick<
  Tables<'course_phases'>,
  'id' | 'course_id' | 'phase_number' | 'title' | 'focus'
>

export type ProgramCourse = Pick<
  Tables<'courses'>,
  'id' | 'title' | 'description' | 'thumbnail_url' | 'duration_lessons'
> & {
  phases: CoursePhase[]
}

/** A program with its active courses, each with its phases. */
export type PublicProgram = {
  program: Program
  courses: ProgramCourse[]
}
