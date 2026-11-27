import type { User } from '@supabase/supabase-js'

import { supabase } from '../supabase'
import { apiUrl } from './apiUrl'

/** Whether what was typed in the login box is an email (else a username). */
export const looksLikeEmail = (value: string) => value.includes('@')

function errorText(body: unknown) {
  return typeof body === 'object' &&
    body !== null &&
    'error' in body &&
    typeof body.error === 'string'
    ? body.error
    : null
}

function isTokens(
  body: unknown,
): body is { access_token: string; refresh_token: string } {
  return (
    typeof body === 'object' &&
    body !== null &&
    'access_token' in body &&
    typeof body.access_token === 'string' &&
    'refresh_token' in body &&
    typeof body.refresh_token === 'string'
  )
}

/**
 * Signs in with a username and password. The server finds the account and
 * returns only the session (server/routes/usernameLogin.ts), so the person's
 * email address never reaches the browser.
 */
export async function signInWithUsername(
  username: string,
  password: string,
): Promise<User> {
  let response: Response
  try {
    response = await fetch(apiUrl('/api/auth/username-login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username.trim().toLowerCase(),
        password,
      }),
    })
  } catch {
    throw new Error(
      'Username sign-in isn’t reachable right now. Sign in with your email instead.',
    )
  }
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok || !isTokens(body)) {
    throw new Error(
      response.status === 404
        ? 'Username sign-in isn’t available yet. Sign in with your email instead.'
        : (errorText(body) ?? 'Couldn’t sign you in. Try again.'),
    )
  }
  const { data, error } = await supabase.auth.setSession(body)
  if (error || !data.user) {
    throw new Error(error?.message ?? 'Couldn’t start your session.')
  }
  return data.user
}
