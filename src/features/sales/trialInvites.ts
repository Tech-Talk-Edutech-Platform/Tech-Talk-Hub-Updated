import { apiUrl } from '../../lib/apiUrl'
import { inviteJoinPath } from '../../lib/classroom/invites'
import { supabase } from '../../supabase'
import type { InviteEmailStatus, InviteResult, TrialInviteEmail } from './types'

/**
 * Trials run in their own classroom (migration 20261117150000). The slot's
 * meet_link is '/classroom/<room code>'; the family joins as a guest from
 * '/classroom/<room code>?join=1' with no account, and the server emails them
 * that link (server/routes/trialInvites.ts).
 */

const CLASSROOM_LINK = /^\/classroom\/([A-Za-z0-9_-]{4,64})$/

/** The room code in a slot's meet_link, or null for a Meet link. */
export function classroomCodeOf(
  link: string | null | undefined,
): string | null {
  return CLASSROOM_LINK.exec(link?.trim() ?? '')?.[1] ?? null
}

const siteOrigin = () =>
  typeof window === 'undefined'
    ? 'https://www.techtalk-hub.com'
    : window.location.origin

/** The link the family opens; it joins as a guest, no sign-in. */
export const familyJoinUrl = (roomCode: string) =>
  `${siteOrigin()}${inviteJoinPath(roomCode)}`

/** A made-up room code for the preview's bookings (/preview/sales). */
export const demoRoomCode = (seed: number) =>
  String(10_000_000 + ((seed * 7_919_311) % 90_000_000))

/** Where staff open the classroom to host it. */
export const classroomHostPath = (roomCode: string) =>
  `/classroom/${encodeURIComponent(roomCode)}`

const INVITE_STATUSES: readonly InviteEmailStatus[] = [
  'pending',
  'sent',
  'failed',
  'skipped',
]

export function toInviteEmail(row: {
  invite_email_status: string
  invite_email_sent_at: string | null
  invite_email_error: string | null
}): TrialInviteEmail {
  return {
    status:
      INVITE_STATUSES.find((status) => status === row.invite_email_status) ??
      'pending',
    sentAt: row.invite_email_sent_at,
    error: row.invite_email_error,
  }
}

/** A failed request to the invite endpoint, with its HTTP status. */
export class InviteRequestError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const RESULT_STATUSES: readonly InviteResult['status'][] = [
  'sent',
  'failed',
  'skipped',
]

/**
 * Asks the server to email the parent their classroom link. The server checks
 * the caller is an admin, on the sales team, or the trial's tutor.
 */
export async function requestTrialInvite(
  bookingId: string,
  resend: boolean,
): Promise<InviteResult> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) {
    throw new InviteRequestError('Your session has ended. Sign in again.', 401)
  }

  let response: Response
  try {
    response = await fetch(
      apiUrl(`/api/trials/${encodeURIComponent(bookingId)}/invite`),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ resend }),
      },
    )
  } catch {
    throw new InviteRequestError(
      'The server isn’t reachable, so the email wasn’t sent. Try again in a moment.',
      0,
    )
  }

  let body: unknown = null
  try {
    body = await response.json()
  } catch {
    body = null
  }
  if (!response.ok) {
    throw new InviteRequestError(
      isRecord(body) && typeof body.error === 'string'
        ? body.error
        : `The email couldn’t be sent (${response.status}).`,
      response.status,
    )
  }
  const status = isRecord(body)
    ? RESULT_STATUSES.find((candidate) => candidate === body.status)
    : undefined
  if (!status || !isRecord(body)) {
    throw new InviteRequestError('The server sent back an unexpected reply.', 0)
  }
  return {
    status,
    to: typeof body.to === 'string' ? body.to : null,
    error: typeof body.error === 'string' ? body.error : null,
  }
}
