import type { AboutSection, TeamMember } from '../../types/about'
import { sanityQuery } from '../sanity'

const ABOUT_SECTIONS_QUERY = `
  *[_type == "about"] | order(orderRank asc) {
    "id": _id,
    title,
    headline,
    text,
    orderRank
  }
`

const TEAM_QUERY = `
  *[_type == "teamMember"] | order(orderRank) {
    "id": _id,
    name,
    title,
    bio,
    image,
    linkedin,
    twitter,
    github
  }
`

function hasId(value: unknown): value is { id: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string'
  )
}

async function fetchDocuments(query: string): Promise<{ id: string }[]> {
  const result = await sanityQuery(query)

  return Array.isArray(result) ? result.filter(hasId) : []
}

/** About page cards from Sanity. Resolves to `[]` on failure. */
export async function fetchAboutSections(): Promise<AboutSection[]> {
  try {
    return await fetchDocuments(ABOUT_SECTIONS_QUERY)
  } catch (error) {
    console.error('Failed to fetch about content from Sanity:', error)
    return []
  }
}

/** Team members from Sanity. Resolves to `[]` on failure. */
export async function fetchTeamMembers(): Promise<TeamMember[]> {
  try {
    return await fetchDocuments(TEAM_QUERY)
  } catch (error) {
    console.error('Failed to fetch team members from Sanity:', error)
    return []
  }
}
