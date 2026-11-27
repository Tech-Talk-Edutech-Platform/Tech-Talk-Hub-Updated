import { useEffect } from 'react'
import { supabase } from '../supabase'
import { forgetStoredTheme } from '../lib/theme'
import { syncDashboardSession } from './dashboardSession'

/** Keep the SSR session in sync while a role dashboard is open. */
export function DashboardSessionSync() {
  useEffect(() => {
    let recovering = false
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Recovery links are handled by the browser's shared auth routes.
      if (event === 'PASSWORD_RECOVERY') recovering = true
      if (event === 'USER_UPDATED') recovering = false
      syncDashboardSession(recovering ? null : (session?.access_token ?? null))
    })

    return () => subscription.unsubscribe()
  }, [])

  return null
}

/**
 * Clear the SSR session cookie on sign-out from any page. Signing in only
 * sets the cookie once a role dashboard opens, so public pages make no
 * session requests otherwise. Also forgets this browser's copy of the
 * dashboard theme, so the next account signed in here opens in its own.
 */
export function DashboardSignOutSync() {
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event !== 'SIGNED_OUT') return
      syncDashboardSession(null)
      forgetStoredTheme()
    })

    return () => subscription.unsubscribe()
  }, [])

  return null
}
