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
const STAFF_ROLES = new Set([...ADMIN_ROLES, 'tutor'])
const ENDED_STATUSES = new Set(['completed', 'not_completed', 'cancelled'])

export type ClassroomAccess = {
  role: ClassroomRole
  /** The signed-in user, when the request carried a valid Supabase token. */
  userId: string | null
  /** True when the room has a session row that has been ended or cancelled. */
  ended: boolean
}

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
    // Before the classroom migration is applied every room is "unlinked".
    if (error.code === '42P01' || error.code === 'PGRST205') return null
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

  let role: ClassroomRole = 'participant'
  if (user) {
    if (ADMIN_ROLES.has(user.role)) role = 'host'
    else if (session && session.tutor_id === user.id) role = 'host'
    // A room with no session row (an ad-hoc code) is hosted by any staff member.
    else if (!session && STAFF_ROLES.has(user.role)) role = 'host'
  }
  return { role, userId: user?.id ?? null, ended }
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
