import { supabase } from '../supabase'
import { apiUrl } from './apiUrl'

/** Where password-reset emails send people to choose a new password. */
export const RESET_PASSWORD_PATH = '/reset-password'

/**
 * Whether this page load came from a password-reset email link. Read when the
 * module first loads, before supabase-js swaps the link's tokens for a session
 * and clears them from the address bar.
 */
export const openedFromRecoveryLink =
  typeof window !== 'undefined' &&
  /(?:^|[#&?])type=recovery(?:&|$)/.test(
    `${window.location.hash}&${window.location.search}`,
  )

/**
 * Emails a password-reset link in Tech Talk Hub's own branded email, sent by
 * our server (POST /api/auth/password-reset). If the server can't send it
 * (not deployed yet, email not set up, unreachable), Supabase sends its plain
 * default email instead, so the reset always goes out.
 *
 * The link opens {@link RESET_PASSWORD_PATH}, which must be listed under
 * Supabase Auth → URL Configuration → Redirect URLs.
 */
export async function sendPasswordResetEmail(email: string) {
  const address = email.trim()
  try {
    const response = await fetch(apiUrl('/api/auth/password-reset'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: address }),
    })
    if (response.ok) return
    if (response.status === 400 || response.status === 429) {
      const body: unknown = await response.json().catch(() => null)
      throw new PasswordResetRequestError(
        response.status === 429
          ? 'Too many reset requests. Wait a few minutes and try again.'
          : (errorText(body) ?? 'Enter a valid email address.'),
      )
    }
  } catch (error) {
    if (error instanceof PasswordResetRequestError) throw error
    // Network trouble: fall through to Supabase's own email.
  }
  const { error } = await supabase.auth.resetPasswordForEmail(address, {
    redirectTo: `${window.location.origin}${RESET_PASSWORD_PATH}`,
  })
  if (error) throw error
}

/** A reset request the server turned down; shown as is, no fallback. */
class PasswordResetRequestError extends Error {}

function errorText(body: unknown) {
  return typeof body === 'object' &&
    body !== null &&
    'error' in body &&
    typeof body.error === 'string'
    ? body.error
    : null
}

/** Minimum length enforced on every new password in the app. */
export const MIN_PASSWORD_LENGTH = 8

/** Why a new password can't be used, or null when it's fine. */
export function newPasswordProblem(
  password: string,
  confirmation: string,
): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'Use a mix of letters and numbers.'
  }
  if (password !== confirmation) {
    return 'The two passwords don’t match.'
  }
  return null
}
