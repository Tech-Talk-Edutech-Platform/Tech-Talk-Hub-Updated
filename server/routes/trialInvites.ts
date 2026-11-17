import express, { type Request, type Response } from 'express'
import { rateLimit } from '../middleware/rateLimit'
import { supabase } from '../supabase'
import { mailerReady } from '../services/mailer'
import {
  loadBooking,
  sendPendingTrialInvites,
  sendTrialInvite,
  TrialInviteError,
} from '../services/trialInvites'

/**
 * /api/trials
 *   GET  /email-status          is email configured? (staff)
 *   POST /:bookingId/invite     email the family their classroom link
 *                               body: { resend?: boolean }
 *   POST /send-pending          public: sends invites already waiting, e.g.
 *                               right after a family books on the website
 *                               (the every-minute sweep doesn't run on Vercel
 *                               unless something calls /api/cron/reminders)
 *
 * Callers send their Supabase session as `Authorization: Bearer <token>`.
 * Admins and the sales team may send any trial's invite; a tutor only their
 * own trials'.
 */
const router = express.Router()

const ADMIN_ROLES: ReadonlySet<string> = new Set([
  'owner',
  'operations_admin',
  'tech_admin',
])
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function caller(req: Request) {
  const match = /^Bearer\s+(.+)$/i.exec(req.headers.authorization ?? '')
  const jwt = match?.[1]?.trim()
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

const isSalesOrAdmin = (role: string) =>
  ADMIN_ROLES.has(role) || role === 'marketer'

async function emailStatus(req: Request, res: Response) {
  const user = await caller(req)
  if (!user || !(isSalesOrAdmin(user.role) || user.role === 'tutor')) {
    res.status(401).json({ error: 'Sign in as staff to check email.' })
    return
  }
  const ready = mailerReady()
  res.json(
    ready.ready ? { ready: true } : { ready: false, reason: ready.reason },
  )
}

type InviteRequest = Request<
  { bookingId: string },
  unknown,
  { resend?: unknown }
>

async function invite(req: InviteRequest, res: Response) {
  const { bookingId } = req.params
  if (!UUID_PATTERN.test(bookingId)) {
    res.status(400).json({ error: 'That isn’t a booking id.' })
    return
  }
  const user = await caller(req)
  if (!user) {
    res.status(401).json({ error: 'Your session has expired. Sign in again.' })
    return
  }

  try {
    if (!isSalesOrAdmin(user.role)) {
      const booking = await loadBooking(bookingId)
      if (user.role !== 'tutor' || booking.mentor_id !== user.id) {
        res.status(403).json({ error: 'You can only email your own trials.' })
        return
      }
    }
    const result = await sendTrialInvite(bookingId, {
      resend: req.body?.resend === true,
    })
    res.json(result)
  } catch (error) {
    if (error instanceof TrialInviteError) {
      res.status(error.status).json({ error: error.message })
      return
    }
    console.error('Trial invite failed:', error)
    res.status(500).json({ error: 'The invite couldn’t be sent. Try again.' })
  }
}

/**
 * Only sends what's already queued, to the address on each booking, once; so
 * calling it early or often changes nothing but the timing.
 */
async function sendPending(_req: Request, res: Response) {
  try {
    await sendPendingTrialInvites()
  } catch (error) {
    console.error('Sending pending trial invites failed:', error)
  }
  res.status(202).json({ ok: true })
}

router.get('/email-status', (req, res) => void emailStatus(req, res))
router.post(
  '/send-pending',
  rateLimit({ limit: 6, windowMs: 60 * 1000 }),
  (req, res) => void sendPending(req, res),
)
router.post(
  '/:bookingId/invite',
  rateLimit({ limit: 20, windowMs: 60 * 1000 }),
  (req: InviteRequest, res: Response) => void invite(req, res),
)

export default router
