import { useLayoutEffect } from 'react'
import { Outlet } from 'react-router-dom'
import '@fontsource-variable/figtree/wght.css'
import '@fontsource-variable/figtree/wght-italic.css'

/** Matches --color-stage, so the mobile browser bar blends into the room. */
const THEME_COLOR = '#172554'

/**
 * Shell for every /classroom route. Marks <html> so the classroom's base styles
 * (Figtree, ink text, white ground, focus rings, scrollbars) apply here and to
 * popovers portalled into <body>, without touching the rest of the site.
 */
export function ClassroomLayout() {
  useLayoutEffect(() => {
    const root = document.documentElement
    root.dataset.app = 'classroom'
    return () => {
      root.removeAttribute('data-app')
    }
  }, [])

  return (
    <>
      <meta name="theme-color" content={THEME_COLOR} />
      <Outlet />
    </>
  )
}
