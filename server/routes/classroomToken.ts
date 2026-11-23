import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express'
import { AccessToken } from 'livekit-server-sdk'
import { rateLimit } from '../middleware/rateLimit'
import {
  classroomAccess,
  ClassroomSetupError,
  closedRoomReason,
  liveKitConfig,
  LiveKitConfigError,
  recordFirstJoin,
  roomHasPeople,
  type ClassroomAccess,
  type ClassroomRole,
} from '../services/classroomAccess'

const router = express.Router()
const ROOM_CAPACITY = 25
const IDENTIFIER_PATTERN = /^[A-Za-z0-9_-]{1,64}$/

type TokenRequestBody = {
  roomId?: unknown
  identity?: unknown
  name?: unknown
  /**
   * What the browser asks to join as. 'host' is only granted if allowed;
   * 'viewer' (the parent link) is granted to anyone, since it can do less
   * than a participant.
   */
  role?: unknown
}

/** viewer: sees and hears the class, publishes nothing (no cam, mic or chat). */
type TokenRole = ClassroomRole | 'viewer'

type TokenRequest = Request<Record<string, string>, unknown, TokenRequestBody>

function cleanName(value: unknown) {
  if (typeof value !== 'string') return null
  // Strips control characters from the display name, on purpose.
  // oxlint-disable-next-line eslint/no-control-regex -- see above
  const name = value.replace(/[\u0000-\u001f\u007f]/g, '').trim()
  return name.length > 0 && name.length <= 80 ? name : null
}

async function issueToken(req: TokenRequest, res: Response): Promise<void> {
  const { roomId, identity } = req.body ?? {}
  const name = cleanName(req.body?.name)
  const wantsHost = req.body?.role === 'host'
  const wantsViewer = req.body?.role === 'viewer'

  if (
    typeof roomId !== 'string' ||
    !IDENTIFIER_PATTERN.test(roomId) ||
    typeof identity !== 'string' ||
    !IDENTIFIER_PATTERN.test(identity) ||
    !name
  ) {
    res.status(400).json({ error: 'Enter a valid room, identity, and name.' })
    return
  }

  let config
  try {
    config = liveKitConfig()
  } catch (error) {
    if (!(error instanceof LiveKitConfigError)) throw error
    console.error('LiveKit configuration:', error.message)
    res.status(503).json({ error: error.message })
    return
  }

  let access: ClassroomAccess
  try {
    access = await classroomAccess(req, roomId)
  } catch (error) {
    if (!(error instanceof ClassroomSetupError)) throw error
    console.error('Classroom setup:', error.message)
    res.status(503).json({ error: error.message })
    return
  }

  // No class with this ID, or it's over: refuse before touching LiveKit, so
  // made-up or old IDs never create rooms or use up minutes. This applies to
  // hosts too; an admin has to reopen an ended class first.
  const closed = closedRoomReason(access)
  if (closed) {
    res
      .status(closed.status)
      .json({ error: closed.error, opensAt: closed.opensAt })
    return
  }

  if (wantsHost && access.role !== 'host') {
    res.status(403).json({
      error:
        'Only this class’s tutor or an admin can host it. Open the student link to join as a participant.',
    })
    return
  }
  // Staff opening the student link join as a participant, and anyone opening
  // the parent link as a viewer.
  const role: TokenRole = wantsHost
    ? 'host'
    : wantsViewer
      ? 'viewer'
      : 'participant'
  const canPublish = role !== 'viewer'

  const { service, serverUrl, apiKey, apiSecret } = config
  let room = (await service.listRooms([roomId])).find(
    (candidate) => candidate.name === roomId,
  )

  // Past the link expiry (an hour after the start, or the end of a longer
  // class), a call stays joinable only while people are in it. Once it's
  // empty the link is revoked for everyone, hosts included.
  if (
    access.window.state === 'overtime' &&
    !(room && (await roomHasPeople(service, roomId)))
  ) {
    res.status(410).json({
      error:
        'This class link has expired: the class time is over and nobody is in the call any more.',
    })
    return
  }

  if (!room) {
    try {
      room = await service.createRoom({
        name: roomId,
        emptyTimeout: 300,
        maxParticipants: ROOM_CAPACITY,
      })
    } catch (error) {
      room = (await service.listRooms([roomId])).find(
        (candidate) => candidate.name === roomId,
      )
      if (!room) throw error
    }
  }

  if (room.maxParticipants !== ROOM_CAPACITY) {
    res.status(409).json({
      error: `This room is not configured for the ${ROOM_CAPACITY}-person classroom limit.`,
    })
    return
  }

  const token = new AccessToken(apiKey, apiSecret, {
    identity,
    name,
    ttl: '2h',
    // Everyone in the room can read this; the client trusts "end class"
    // messages only from a host.
    attributes: { role },
  })
  token.addGrant({
    roomJoin: true,
    room: roomId,
    roomAdmin: role === 'host',
    canPublish,
    canSubscribe: true,
    canPublishData: canPublish,
    // Participants must not be able to rewrite their own role attribute.
    canUpdateOwnMetadata: false,
  })

  // Someone joined: from now on the class can run past its end time.
  if (access.firstJoin) await recordFirstJoin(roomId)

  res.json({ serverUrl, token: await token.toJwt(), role })
}

router.post(
  '/',
  rateLimit({ limit: 30, windowMs: 60 * 1000 }),
  (req: TokenRequest, res: Response, next: NextFunction) => {
    issueToken(req, res).catch((error: unknown) => {
      console.error('Failed to issue a classroom token:', error)
      next(error)
    })
  },
)

export default router
