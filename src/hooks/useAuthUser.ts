import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'

import { supabase } from '../supabase'

/**
 * True when this browser has a saved Supabase session. supabase-js stores it
 * under `sb-<project-ref>-auth-token`. Reading it is synchronous, so pages can
 * render straight away for visitors who were never signed in instead of
 * waiting for the session check.
 */
export function hasStoredSession(): boolean {
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (key && /^sb-.+-auth-token$/.test(key)) return true
    }
  } catch {
    // Storage blocked (private mode, sandboxed iframe): assume signed out.
  }
  return false
}

type AuthUserState = { user: User | null; loading: boolean }

/**
 * The signed-in Supabase user. `loading` is only true while a saved session is
 * being restored, so public visitors never see a loading screen.
 */
export function useAuthUser(): AuthUserState {
  const [state, setState] = useState<AuthUserState>(() => ({
    user: null,
    loading: hasStoredSession(),
  }))

  useEffect(() => {
    let active = true

    void supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (active) setState({ user: session?.user ?? null, loading: false })
      })
      .catch((error: unknown) => {
        console.error('Could not restore the saved session:', error)
        if (active) setState({ user: null, loading: false })
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setState({ user: session?.user ?? null, loading: false })
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  return state
}
