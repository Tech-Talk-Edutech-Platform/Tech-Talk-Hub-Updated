import { useLayoutEffect, type ReactNode } from 'react'
import { Outlet } from 'react-router-dom'

type SiteLayoutProps = {
  /** Render these instead of the matched child route (for site pages outside the layout route). */
  children?: ReactNode
}

/**
 * Shell for every public website route. Marks <html> so the dashboards'
 * Tailwind v3 compatibility styles in index.css (gray-200 default borders,
 * gray-50 body) stay off the website pages, which were built for v4 defaults.
 */
export function SiteLayout({ children }: SiteLayoutProps) {
  useLayoutEffect(() => {
    const root = document.documentElement
    root.dataset.app = 'site'
    return () => {
      root.removeAttribute('data-app')
    }
  }, [])

  return children ?? <Outlet />
}
