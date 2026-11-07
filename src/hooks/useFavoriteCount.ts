import { useEffect, useState } from 'react'

import { readFavoriteIds } from '../lib/favorites'

/** Favorites live in localStorage, so re-check regularly to catch changes made elsewhere. */
const POLL_INTERVAL_MS = 700

function readFavoriteCount(): number {
  return readFavoriteIds().length
}

/** Number of products the visitor has saved to their shop favorites. */
export function useFavoriteCount(): number {
  const [favoriteCount, setFavoriteCount] = useState(readFavoriteCount)

  useEffect(() => {
    function syncFavoriteCount() {
      setFavoriteCount(readFavoriteCount())
    }

    window.addEventListener('storage', syncFavoriteCount)
    const interval = window.setInterval(syncFavoriteCount, POLL_INTERVAL_MS)

    return () => {
      window.removeEventListener('storage', syncFavoriteCount)
      window.clearInterval(interval)
    }
  }, [])

  return favoriteCount
}
