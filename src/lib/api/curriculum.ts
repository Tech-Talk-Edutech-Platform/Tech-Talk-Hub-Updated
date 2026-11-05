import type { CurriculumLevel } from '../../types/curriculum'
import { sanityQuery } from '../sanity'

const ALL_LEVELS_QUERY = `
  *[_type == "curriculum"] | order(orderRank asc) {
    "id": _id,
    title,
    description,
    difficultyLevel,
    duration,
    skills,
    activityCount,
    orderRank,
    levelImage
  }
`

function isCurriculumLevel(value: unknown): value is CurriculumLevel {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string'
  )
}

/** Curriculum levels from Sanity. Resolves to `[]` on failure so the page still renders. */
export async function fetchCurriculumLevels(): Promise<CurriculumLevel[]> {
  try {
    const result = await sanityQuery(ALL_LEVELS_QUERY)

    return Array.isArray(result) ? result.filter(isCurriculumLevel) : []
  } catch (error) {
    console.error('Failed to fetch levels from Sanity:', error)
    return []
  }
}
