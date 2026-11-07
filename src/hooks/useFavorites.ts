import { useCallback, useState } from 'react'

import { readFavoriteIds, writeFavoriteIds } from '../lib/favorites'

/** The visitor's saved shop products, persisted to localStorage. */
export function useFavorites() {
  const [favoriteIds, setFavoriteIds] = useState(readFavoriteIds)

  const save = useCallback((ids: string[]) => {
    writeFavoriteIds(ids)
    setFavoriteIds(ids)
  }, [])

  const toggleFavorite = useCallback(
    (productId: string) => {
      // Re-read storage so changes made in another tab aren't overwritten.
      const current = readFavoriteIds()
      save(
        current.includes(productId)
          ? current.filter((id) => id !== productId)
          : [...current, productId],
      )
    },
    [save],
  )

  const removeFavorite = useCallback(
    (productId: string) => {
      save(readFavoriteIds().filter((id) => id !== productId))
    },
    [save],
  )

  return {
    favoriteIds,
    isFavorite: (productId: string) => favoriteIds.includes(productId),
    toggleFavorite,
    removeFavorite,
  }
}
