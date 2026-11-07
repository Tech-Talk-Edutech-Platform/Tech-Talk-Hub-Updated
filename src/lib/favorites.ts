/** Shop favorites are product ids stored in localStorage (same key as the old site). */
export const FAVORITES_STORAGE_KEY = 'shop_favorites'

export function readFavoriteIds(): string[] {
  try {
    const saved: unknown = JSON.parse(
      localStorage.getItem(FAVORITES_STORAGE_KEY) || '[]',
    )

    return Array.isArray(saved)
      ? saved.filter((id): id is string => typeof id === 'string')
      : []
  } catch {
    return []
  }
}

export function writeFavoriteIds(ids: string[]): void {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(ids))
  } catch (error) {
    console.error('Failed to save favorites:', error)
  }
}
