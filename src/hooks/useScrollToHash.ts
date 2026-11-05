import { useEffect } from 'react'
import {
  NavigationType,
  useLocation,
  useNavigationType,
} from 'react-router-dom'

/**
 * Restores the scroll behaviour Next.js links had: `/#pricing` scrolls to the
 * `#pricing` section, and other in-app navigations start at the top. Back/forward
 * and first page loads are left to the browser's own scroll restoration.
 */
export function useScrollToHash() {
  // A new `location` object is created on every navigation, even to the same URL.
  const location = useLocation()
  const navigationType = useNavigationType()

  useEffect(() => {
    if (location.hash) {
      document
        .getElementById(decodeURIComponent(location.hash.slice(1)))
        ?.scrollIntoView()
      return
    }

    if (navigationType !== NavigationType.Pop) {
      window.scrollTo(0, 0)
    }
  }, [location, navigationType])
}
