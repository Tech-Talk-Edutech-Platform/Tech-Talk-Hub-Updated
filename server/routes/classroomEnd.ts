import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express'
import { rateLimit } from '../middleware/rateLimit'
import {
  classroomAccess,
  liveKitConfig,
  LiveKitConfigError,
} from '../services/classroomAccess'

const router = express.Router()
const IDENTIFIER_PATTERN = /^[A-Za-z0-9_-]{1,64}$/

type EndRequest = Request<
  Record<string, string>,
  unknown,
  { roomId?: unknown }
>

/**
 * POST /api/classroom/end: a host ends the call for everyone. Deleting the
 * LiveKit room disconnects every participant.
 */
async function endRoom(req: EndRequest, res: Response): Promise<void> {
  const roomId = req.body?.roomId
  if (typeof roomId !== 'string' || !IDENTIFIER_PATTERN.test(roomId)) {
    res.status(400).json({ error: 'Enter a valid room.' })
    return
  }

  const access = await classroomAccess(req, roomId)
  if (!access.userId) {
    res.status(401).json({ error: 'Sign in to end this class.' })
    return
  }
  if (access.role !== 'host') {
    res.status(403).json({
      error: 'Only this class’s tutor or an admin can end it for everyone.',
    })
    return
  }

  let config
  try {
    config = liveKitConfig()
  } catch (error) {
    if (!(error instanceof LiveKitConfigError)) throw error
    res.status(503).json({ error: error.message })
    return
  }

  const rooms = await config.service.listRooms([roomId])
  if (rooms.some((room) => room.name === roomId)) {
    await config.service.deleteRoom(roomId)
  }
  res.json({ ended: true })
}

router.post(
  '/',
  rateLimit({ limit: 10, windowMs: 60 * 1000 }),
  (req: EndRequest, res: Response, next: NextFunction) => {
    endRoom(req, res).catch((error: unknown) => {
      console.error('Failed to end a classroom:', error)
      next(error)
    })
  },
)

export default router
