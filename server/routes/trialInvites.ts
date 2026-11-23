import { asyncRoute } from '../middleware/asyncRoute'
import express, { type Request, type Response } from 'express'
import { dashboardActor, dashboardAdmins } from '../services/dashboardActor'
import { rateLimit } from '../middleware/rateLimit'
import { mailerReady } from '../services/mailer'
import {
  loadBooking,
  trialGuestLink,
  sendPendingTrialInvites,
  sendTrialInvite,
  TrialInviteError,
} from '../services/trialInvites'

/**
 * /api/trials
 *   GET  /email-status          is email configured? (staff)
 *   POST /:bookingId/invite     email the family their classroom link
 *                               body: { resend?: boolean }
 *   POST /send-pending          admin or sales action to process queued invites
 *   POST /:bookingId/guest-link  create a family link for a scheduled trial
 *
 * Callers send their Supabase session as `Authorization: Bearer <token>`.
 * Admins and the sales team may send any trial's invite; a tutor only their
 * own trials'.
 */
const router = express.Router()

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const isSalesOrAdmin = (role: string) =>
  dashboardAdmins.has(role) || role === 'marketer'

async function emailStatus(req: Request, res: Response) {
  const user = await dashboardActor(req)
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
  const user = await dashboardActor(req)
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
async function sendPending(req: Request, res: Response) {
  const actor = await dashboardActor(req)
  if (!actor || !isSalesOrAdmin(actor.role)) {
    res.status(actor ? 403 : 401).json({ error: 'Staff access is required.' })
    return
  }
  try {
    await sendPendingTrialInvites()
  } catch (error) {
    console.error('Sending pending trial invites failed:', error)
    res.status(503).json({ error: 'The invite queue could not be processed.' })
    return
  }
  res.json({ ok: true })
}

router.get('/email-status', asyncRoute(emailStatus))
router.post(
  '/send-pending',
  rateLimit({ limit: 6, windowMs: 60 * 1000 }),
  asyncRoute(sendPending),
)
router.post(
  '/:bookingId/guest-link',
  rateLimit({ limit: 20, windowMs: 60_000 }),
  asyncRoute<{ bookingId: string }>(async (req, res) => {
    res.set('Cache-Control', 'no-store')
    const actor = await dashboardActor(req)
    if (!actor || !(isSalesOrAdmin(actor.role) || actor.role === 'tutor')) {
      res.status(actor ? 403 : 401).json({ error: 'Staff access is required.' })
      return
    }
    if (!UUID_PATTERN.test(req.params.bookingId)) {
      res.status(400).json({ error: 'Choose a trial booking.' })
      return
    }
    try {
      const booking = await loadBooking(req.params.bookingId)
      if (!isSalesOrAdmin(actor.role) && booking.mentor_id !== actor.id) {
        res.status(403).json({ error: 'You can only share your own trials.' })
        return
      }
      res.json({ url: await trialGuestLink(booking) })
    } catch (error) {
      if (!(error instanceof TrialInviteError)) throw error
      res.status(error.status).json({ error: error.message })
    }
  }),
)
router.post(
  '/:bookingId/invite',
  rateLimit({ limit: 20, windowMs: 60 * 1000 }),
  asyncRoute(invite),
)

export default router
