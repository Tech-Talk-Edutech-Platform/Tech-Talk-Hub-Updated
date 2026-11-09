import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express'
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk'
import { rateLimit } from '../middleware/rateLimit'

const router = express.Router()
const ROOM_CAPACITY = 25
const IDENTIFIER_PATTERN = /^[A-Za-z0-9_-]{1,64}$/

type TokenRequestBody = {
  roomId?: unknown
  identity?: unknown
  name?: unknown
}

type TokenRequest = Request<Record<string, string>, unknown, TokenRequestBody>

function publicRoomUrl(value: string) {
  const url = new URL(value)
  if (url.protocol !== 'wss:' && url.protocol !== 'ws:') {
    throw new Error('LIVEKIT_URL must use ws:// or wss://.')
  }
  url.protocol = url.protocol === 'wss:' ? 'https:' : 'http:'
  return url.toString().replace(/\/$/, '')
}

function cleanName(value: unknown) {
  if (typeof value !== 'string') return null
  const name = value.replace(/[\u0000-\u001f\u007f]/g, '').trim()
  return name.length > 0 && name.length <= 80 ? name : null
}

async function issueToken(req: TokenRequest, res: Response): Promise<void> {
  const { roomId, identity } = req.body ?? {}
  const name = cleanName(req.body?.name)

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

  const serverUrl = process.env.LIVEKIT_URL?.trim()
  const apiKey = process.env.LIVEKIT_API_KEY?.trim()
  const apiSecret = process.env.LIVEKIT_API_SECRET?.trim()

  if (!serverUrl || !apiKey || !apiSecret) {
    res.status(503).json({
      error:
        'Live video is not configured. Add LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET to the server environment.',
    })
    return
  }

  let liveKitHttpUrl: string
  try {
    liveKitHttpUrl = publicRoomUrl(serverUrl)
  } catch (error) {
    console.error('Invalid LIVEKIT_URL configuration:', error)
    res.status(503).json({
      error: 'The live-video server URL is invalid. Check LIVEKIT_URL.',
    })
    return
  }

  const service = new RoomServiceClient(liveKitHttpUrl, apiKey, apiSecret)

  let room = (await service.listRooms([roomId])).find(
    (candidate) => candidate.name === roomId,
  )

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
  })
  token.addGrant({
    roomJoin: true,
    room: roomId,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  })

  res.json({ serverUrl, token: await token.toJwt() })
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
