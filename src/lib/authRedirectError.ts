/**
 * Supabase Auth reports failed OAuth (Google) and email-link sign-ins by
 * redirecting back with `error`, `error_code` and `error_description` in the
 * query string, the hash, or both. These helpers turn that into a message the
 * login page can show.
 */
export type AuthRedirectError = {
  error: string
  code: string
  description: string
}

/** Router state key the login page reads the message from. */
export const AUTH_ERROR_STATE_KEY = 'authError'

const GENERIC_MESSAGE = "We couldn't sign you in. Please try again."

/** Supabase error codes: https://supabase.com/docs/guides/auth/debugging/error-codes */
const MESSAGES_BY_CODE: Record<string, string> = {
  signup_disabled:
    "New accounts can't be created here. Sign in with the account your school set up for you.",
  user_banned:
    'This account has been suspended. Please contact the school for help.',
  otp_expired: 'That sign-in link has expired. Please request a new one.',
  bad_oauth_state:
    'Your sign-in took too long or was opened in another tab. Please try again.',
  bad_oauth_callback:
    'Your sign-in took too long or was opened in another tab. Please try again.',
  flow_state_expired:
    'Your sign-in took too long or was opened in another tab. Please try again.',
  flow_state_not_found:
    'Your sign-in took too long or was opened in another tab. Please try again.',
  provider_disabled:
    "Google sign-in isn't available right now. Please sign in with your email and password.",
  oauth_provider_not_supported:
    "Google sign-in isn't available right now. Please sign in with your email and password.",
  email_exists:
    'This email already belongs to an account. Sign in with your email and password instead.',
  identity_already_exists:
    'This Google account is already linked to another user.',
  provider_email_needs_verification:
    'Check your inbox and confirm your email address, then sign in again.',
}

export function readAuthRedirectError(
  search: string,
  hash: string,
): AuthRedirectError | null {
  const query = new URLSearchParams(search)
  const fragment = new URLSearchParams(hash.replace(/^#/, ''))
  const read = (key: string) => query.get(key) ?? fragment.get(key) ?? ''

  const description = read('error_description')
  const code = read('error_code')

  // A bare `?error=` could belong to another page; Supabase always sends one of these.
  if (!description && !code) {
    return null
  }

  return { error: read('error'), code, description }
}

export function authRedirectErrorMessage({
  error,
  code,
  description,
}: AuthRedirectError): string {
  // Google's "Cancel" on the consent screen.
  if (error === 'access_denied' && !MESSAGES_BY_CODE[code]) {
    return 'Google sign-in was cancelled.'
  }

  // A database trigger on auth.users failed while creating the account.
  if (/database error (saving|creating) new user/i.test(description)) {
    return "We couldn't finish setting up your account. Please try again in a few minutes, or sign in with your email and password. If this keeps happening, contact the school."
  }

  return MESSAGES_BY_CODE[code] ?? GENERIC_MESSAGE
}

/** The message the redirect handler put in router state, if any. */
export function authErrorFromState(state: unknown): string | null {
  if (typeof state !== 'object' || state === null) {
    return null
  }

  const value: unknown = Reflect.get(state, AUTH_ERROR_STATE_KEY)
  return typeof value === 'string' && value ? value : null
}
