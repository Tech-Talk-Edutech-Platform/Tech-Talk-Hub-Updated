import { supabase } from '../supabase'

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
 * Emails a password-reset link. The link opens {@link RESET_PASSWORD_PATH},
 * which must be listed under Supabase Auth → URL Configuration → Redirect URLs.
 */
export async function sendPasswordResetEmail(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}${RESET_PASSWORD_PATH}`,
  })
  if (error) throw error
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
