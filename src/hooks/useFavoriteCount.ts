import { useEffect, useState } from 'react'

const FAVORITES_STORAGE_KEY = 'shop_favorites'

/** Favorites live in localStorage, so re-check regularly to catch changes made elsewhere. */
const POLL_INTERVAL_MS = 700

function readFavoriteCount(): number {
  try {
    const saved: unknown = JSON.parse(
      localStorage.getItem(FAVORITES_STORAGE_KEY) || '[]',
    )

    return Array.isArray(saved) ? saved.length : 0
  } catch {
    return 0
  }
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
