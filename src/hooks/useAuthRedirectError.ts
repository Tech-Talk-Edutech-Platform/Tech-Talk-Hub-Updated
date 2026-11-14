import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import {
  AUTH_ERROR_STATE_KEY,
  authRedirectErrorMessage,
  readAuthRedirectError,
} from '../lib/authRedirectError'
import { RESET_PASSWORD_PATH } from '../lib/passwordRecovery'

/**
 * When Supabase sends the user back with a sign-in error (on any page, usually
 * `/` after Google), move them to the login page with a readable message and
 * drop the error parameters from the URL so a refresh doesn't repeat it.
 */
export function useAuthRedirectError() {
  const { pathname, search, hash } = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    // The reset page explains an expired or used reset link itself.
    if (pathname === RESET_PASSWORD_PATH) return

    const authError = readAuthRedirectError(search, hash)

    if (!authError) {
      return
    }

    void navigate('/login', {
      replace: true,
      state: { [AUTH_ERROR_STATE_KEY]: authRedirectErrorMessage(authError) },
    })
  }, [pathname, search, hash, navigate])
}
