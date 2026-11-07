import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import {
  AUTH_ERROR_STATE_KEY,
  authRedirectErrorMessage,
  readAuthRedirectError,
} from '../lib/authRedirectError'

/**
 * When Supabase sends the user back with a sign-in error (on any page, usually
 * `/` after Google), move them to the login page with a readable message and
 * drop the error parameters from the URL so a refresh doesn't repeat it.
 */
export function useAuthRedirectError() {
  const { search, hash } = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const authError = readAuthRedirectError(search, hash)

    if (!authError) {
      return
    }

    void navigate('/login', {
      replace: true,
      state: { [AUTH_ERROR_STATE_KEY]: authRedirectErrorMessage(authError) },
    })
  }, [search, hash, navigate])
}
