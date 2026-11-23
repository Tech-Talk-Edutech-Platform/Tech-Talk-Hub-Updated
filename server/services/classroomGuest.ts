import { createHmac, timingSafeEqual } from 'node:crypto'
import { requireServerEnv } from '../env'

/** Signs only room-scoped guest capabilities. Keeping the capability in the
 * fragment avoids sending it to the page host or in a Referer header. */
export function guestJoinPath(roomCode: string, expiresAt: number): string {
  const expiry = Math.floor(expiresAt / 1000)
  return `/classroom/${encodeURIComponent(roomCode)}?join=1#guest=${expiry}.${signature(roomCode, expiry)}`
}

function signature(roomCode: string, expiry: number) {
  const secret =
    process.env.CLASSROOM_INVITE_SECRET ||
    requireServerEnv('SUPABASE_SERVICE_ROLE_KEY')
  return createHmac('sha256', secret)
    .update(`classroom-guest-v1:${roomCode}:${expiry}`)
    .digest('base64url')
}

export function validGuestInvite(
  roomCode: string,
  grant: unknown,
  now = Date.now(),
) {
  if (typeof grant !== 'string') return false
  const match = /^(\d{1,12})\.([\w-]{43})$/.exec(grant)
  if (!match) return false
  const expiry = Number(match[1])
  if (expiry * 1000 <= now) return false
  return timingSafeEqual(
    Buffer.from(match[2]),
    Buffer.from(signature(roomCode, expiry)),
  )
}
