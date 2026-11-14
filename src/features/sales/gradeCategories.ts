import type { GradeCategory, GradeCategoryId } from './types'

/** Trial bookings are grouped by the three learning programs. */
export const GRADE_CATEGORIES: readonly GradeCategory[] = [
  {
    id: 'junior-coders',
    label: 'Junior Coders',
    grades: ['K', '1', '2', '3'],
    ages: 'Ages 5–8',
    focus: 'Block coding, games and storytelling',
  },
  {
    id: 'future-developers',
    label: 'Future Developers',
    grades: ['4', '5', '6', '7'],
    ages: 'Ages 9–12',
    focus: 'Scratch projects, Python basics, robotics',
  },
  {
    id: 'tech-professionals',
    label: 'Tech Professionals',
    grades: ['8', '9', '10', '11', '12'],
    ages: 'Ages 13–18',
    focus: 'Python, web development and AI',
  },
]

export function gradeCategory(id: GradeCategoryId): GradeCategory {
  const found = GRADE_CATEGORIES.find((category) => category.id === id)
  if (!found) throw new Error(`Unknown grade category: ${id}`)
  return found
}

/** The category a school grade belongs to, e.g. '5' → Future Developers. */
export function categoryForGrade(grade: string): GradeCategory | undefined {
  return GRADE_CATEGORIES.find((category) => category.grades.includes(grade))
}

export const gradeLabel = (grade: string) =>
  grade === 'K' ? 'Kindergarten' : `Grade ${grade}`
