/** Maps a Sanity curriculum level to its program page, by title. */
export function getLevelHref(title: string | null): string {
  const normalizedTitle = (title || '').toLowerCase()

  if (normalizedTitle.includes('junior')) {
    return '/courses/junior-coders'
  }

  if (normalizedTitle.includes('future')) {
    return '/courses/future-developers'
  }

  if (normalizedTitle.includes('tech professional')) {
    return '/courses/tech-professionals'
  }

  return '/book'
}
