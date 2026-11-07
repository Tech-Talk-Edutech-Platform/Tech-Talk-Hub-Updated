/**
 * The three learning programs. Each slug is a Supabase `programs.slug` and
 * `shop_products.program` value, and appears in `/courses/<slug>` (the
 * program's courses) and `/<slug>` (its learning resources).
 */
export const PROGRAM_SLUGS = [
  'junior-coders',
  'future-developers',
  'tech-professionals',
] as const

export type ProgramSlug = (typeof PROGRAM_SLUGS)[number]
