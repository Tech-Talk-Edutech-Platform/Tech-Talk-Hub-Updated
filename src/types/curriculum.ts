import type { SanityImageSource } from '@sanity/image-url'

/** A `curriculum` document from Sanity (GROQ returns `null` for unset fields). */
export type CurriculumLevel = {
  id: string
  title: string | null
  description: string | null
  difficultyLevel: string | null
  duration: string | null
  skills: string[] | null
  activityCount: number | null
  orderRank: number | null
  levelImage: SanityImageSource | null
}
