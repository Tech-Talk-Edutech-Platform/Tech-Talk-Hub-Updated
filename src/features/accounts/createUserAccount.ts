import { apiUrl } from '../../lib/apiUrl'
import { supabase } from '../../supabase'
import type { AppRole } from '../../types/roles'

export type NewUserAccount = {
  email: string
  fullName: string
  role: AppRole
  /** Tutors only. */
  meetLink?: string
  /** Students only. */
  subscriptionTier?: string
  totalClasses?: number | null
  classesRemaining?: number | null
}

export type CreatedUserAccount = {
  id: string
  email: string
  role: AppRole
  /** Shown once, for the admin to pass on; the person changes it after signing in. */
  temporaryPassword: string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

/**
 * Creates someone's account on the server (server/routes/adminUsers.ts), which
 * checks the caller is an admin. Signing up from the browser would switch the
 * admin's own session to the new account, and couldn't safely set a role.
 */
export async function createUserAccount(
  input: NewUserAccount,
): Promise<CreatedUserAccount> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Your session has ended. Sign in again.')

  let response: Response
  try {
    response = await fetch(apiUrl('/api/admin/users'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(input),
    })
  } catch {
    throw new Error(
      'The server isn’t reachable. Check your connection, or start the API server (npm --prefix server run dev).',
    )
  }

  const raw = await response.text()
  let body: unknown = null
  try {
    body = raw ? JSON.parse(raw) : null
  } catch {
    body = null
  }

  if (!response.ok) {
    if (isRecord(body) && typeof body.error === 'string') {
      throw new Error(body.error)
    }
    throw new Error(
      `The server couldn’t create the account (${response.status}).`,
    )
  }
  if (
    !isRecord(body) ||
    typeof body.id !== 'string' ||
    typeof body.temporaryPassword !== 'string'
  ) {
    throw new Error('The server sent back an unexpected reply.')
  }
  return {
    id: body.id,
    email: typeof body.email === 'string' ? body.email : input.email,
    role: input.role,
    temporaryPassword: body.temporaryPassword,
  }
}
