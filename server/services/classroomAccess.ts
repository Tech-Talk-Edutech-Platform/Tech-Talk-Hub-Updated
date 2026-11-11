import type { Request } from 'express'
import { RoomServiceClient } from 'livekit-server-sdk'
import { supabase } from '../supabase'

/**
 * Classroom roles, decided here on the server so a browser can't promote itself.
 *   host:        admins, and the tutor the session belongs to. Can end the
 *                call for everyone.
 *   participant: everyone else, signed in or not. Can only leave.
 */
export type ClassroomRole = 'host' | 'participant'

const ADMIN_ROLES = new Set(['owner', 'operations_admin', 'tech_admin'])
/** Nobody joins a class in these states until an admin reopens it. */
const ENDED_STATUSES = new Set(['completed', 'not_completed', 'cancelled'])

export type ClassroomAccess = {
  role: ClassroomRole
  /** The signed-in user, when the request carried a valid Supabase token. */
  userId: string | null
  /**
   * The class this room code belongs to, or null when no class uses it.
   * A room code is only joinable once a class (classroom_sessions row) has it.
   */
  status: string | null
  /** The class has ended or was cancelled: closed to everyone, hosts included. */
  ended: boolean
}

/** The classroom tables are missing, so no room code can be checked. */
export class ClassroomSetupError extends Error {}

function bearerToken(req: Request) {
  const header = req.headers.authorization ?? ''
  const match = /^Bearer\s+(.+)$/i.exec(header)
  return match?.[1]?.trim() || null
}

type SessionRow = { tutor_id: string | null; status: string }

async function findSession(roomCode: string): Promise<SessionRow | null> {
  const { data, error } = await supabase
    .from('classroom_sessions')
    .select('tutor_id, status')
    .eq('room_code', roomCode)
    .maybeSingle()
  if (error) {
    // Fail closed: without the table there is no way to tell a real class
    // from a made-up code, and made-up codes must not open LiveKit rooms.
    if (error.code === '42P01' || error.code === 'PGRST205') {
      throw new ClassroomSetupError(
        'Live classes aren’t set up yet: the classroom database migration hasn’t been applied.',
      )
    }
    throw new Error(`Couldn’t look up the class: ${error.message}`)
  }
  return data
}

async function findUser(req: Request) {
  const jwt = bearerToken(req)
  if (!jwt) return null
  const { data, error } = await supabase.auth.getUser(jwt)
  if (error || !data.user) return null
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle()
  const role = (profile as { role?: string } | null)?.role ?? ''
  return { id: data.user.id, role }
}

/**
 * The caller's role in a room. Same rules as the client
 * (src/lib/classroom/repository.ts), but this is the one that counts.
 */
export async function classroomAccess(
  req: Request,
  roomCode: string,
): Promise<ClassroomAccess> {
  const [session, user] = await Promise.all([
    findSession(roomCode),
    findUser(req),
  ])
  const ended = !!session && ENDED_STATUSES.has(session.status)

  // Only a real class has a host. Room codes no class uses aren't joinable,
  // so there are no ad-hoc rooms to host.
  const role: ClassroomRole =
    session &&
    user &&
    (ADMIN_ROLES.has(user.role) || session.tutor_id === user.id)
      ? 'host'
      : 'participant'
  return {
    role,
    userId: user?.id ?? null,
    status: session?.status ?? null,
    ended,
  }
}

/**
 * Why nobody may join this room right now, as an HTTP status and message, or
 * null when it's open. Checked before any LiveKit call, so a wrong or old
 * class ID never creates a room or a token.
 */
export function closedRoomReason(
  access: ClassroomAccess,
): { status: 404 | 410; error: string } | null {
  if (access.status === null) {
    return {
      status: 404,
      error:
        'No class uses this class ID. Check the link your tutor sent and try again.',
    }
  }
  if (access.ended) {
    return {
      status: 410,
      error:
        access.status === 'cancelled'
          ? 'This class was cancelled.'
          : 'This class has ended.',
    }
  }
  return null
}

export type LiveKitConfig = {
  serverUrl: string
  apiKey: string
  apiSecret: string
  service: RoomServiceClient
}

export class LiveKitConfigError extends Error {}

function httpUrl(value: string) {
  const url = new URL(value)
  if (url.protocol !== 'wss:' && url.protocol !== 'ws:') {
    throw new LiveKitConfigError('LIVEKIT_URL must use ws:// or wss://.')
  }
  url.protocol = url.protocol === 'wss:' ? 'https:' : 'http:'
  return url.toString().replace(/\/$/, '')
}

/** LiveKit settings from the server environment, or a LiveKitConfigError. */
export function liveKitConfig(): LiveKitConfig {
  const serverUrl = process.env.LIVEKIT_URL?.trim()
  const apiKey = process.env.LIVEKIT_API_KEY?.trim()
  const apiSecret = process.env.LIVEKIT_API_SECRET?.trim()
  if (!serverUrl || !apiKey || !apiSecret) {
    throw new LiveKitConfigError(
      'Live video is not configured. Add LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET to the server environment.',
    )
  }
  return {
    serverUrl,
    apiKey,
    apiSecret,
    service: new RoomServiceClient(httpUrl(serverUrl), apiKey, apiSecret),
  }
}
