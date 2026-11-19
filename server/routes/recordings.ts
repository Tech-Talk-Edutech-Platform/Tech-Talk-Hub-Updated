import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express'
import { rateLimit } from '../middleware/rateLimit'
import { supabase } from '../supabase'

const router = express.Router()

const RECORDINGS_BUCKET = 'class-recordings'
/** How long a played link stays valid; the page asks again before then. */
const SIGNED_URL_SECONDS = 6 * 60 * 60
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const isWebUrl = (value: string) => /^https?:\/\//i.test(value)

type RecordingRow = {
  id: string
  title: string
  recording_url: string
  created_at: string | null
  tutor: { full_name: string | null } | null
}

/**
 * GET /api/recordings/:id: a shared recording, for anyone with its link.
 *
 * The recording's id (a random UUID) is what makes the link private to the
 * people it was sent to; nothing lists recordings publicly. Classroom
 * recordings live in a private bucket, so the video comes back as a signed
 * URL that expires; pasted links (YouTube, Drive, Loom) come back as they are.
 * Deleting a recording turns its shared link off.
 */
async function sharedRecording(req: Request, res: Response): Promise<void> {
  // A fresh signed URL each time; never let a cache hand out an old one.
  res.setHeader('Cache-Control', 'no-store')

  const id = req.params.id
  if (typeof id !== 'string' || !UUID_PATTERN.test(id)) {
    res.status(404).json({ error: 'This recording link isn’t valid.' })
    return
  }

  const { data, error } = await supabase
    .from('class_recordings')
    .select(
      'id, title, recording_url, created_at, tutor:users!tutor_id(full_name)',
    )
    .eq('id', id)
    .maybeSingle<RecordingRow>()
  if (error) throw error
  if (!data) {
    res.status(404).json({ error: 'This recording was removed.' })
    return
  }

  let url = data.recording_url
  const external = isWebUrl(url)
  if (!external) {
    const signed = await supabase.storage
      .from(RECORDINGS_BUCKET)
      .createSignedUrl(url, SIGNED_URL_SECONDS)
    if (signed.error) throw signed.error
    url = signed.data.signedUrl
  }

  // Only what the share page shows: no student details.
  res.json({
    id: data.id,
    title: data.title,
    createdAt: data.created_at,
    tutorName: data.tutor?.full_name ?? null,
    url,
    external,
    expiresInSeconds: external ? null : SIGNED_URL_SECONDS,
  })
}

router.get(
  '/:id',
  rateLimit({ limit: 60, windowMs: 60 * 1000 }),
  (req: Request, res: Response, next: NextFunction) => {
    sharedRecording(req, res).catch((error: unknown) => {
      console.error('Failed to load a shared recording:', error)
      next(error)
    })
  },
)

export default router
