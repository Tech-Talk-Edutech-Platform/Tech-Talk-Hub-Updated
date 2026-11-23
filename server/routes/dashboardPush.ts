import { asyncRoute } from '../middleware/asyncRoute'
import express from 'express'
import WebPush from 'web-push'
import { rateLimit } from '../middleware/rateLimit'
import { dashboardActor, dashboardAdmins } from '../services/dashboardActor'
import { supabase } from '../supabase'

const router = express.Router()
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i

function subscription(raw: unknown): WebPush.PushSubscription | null {
  let value = raw
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw)
    } catch {
      return null
    }
  }
  if (!value || typeof value !== 'object') return null
  const candidate = value as Partial<WebPush.PushSubscription>
  if (
    typeof candidate.endpoint !== 'string' ||
    typeof candidate.keys?.auth !== 'string' ||
    typeof candidate.keys.p256dh !== 'string'
  )
    return null
  try {
    const endpoint = new URL(candidate.endpoint)
    const host = endpoint.hostname
    const supported =
      host === 'fcm.googleapis.com' ||
      host === 'updates.push.services.mozilla.com' ||
      host === 'web.push.apple.com' ||
      host.endsWith('.notify.windows.com')
    if (
      !supported ||
      endpoint.protocol !== 'https:' ||
      endpoint.port ||
      endpoint.username ||
      endpoint.password
    )
      return null
    return { endpoint: endpoint.href, keys: candidate.keys }
  } catch {
    return null
  }
}

router.post(
  '/',
  rateLimit({ limit: 15, windowMs: 60_000 }),
  asyncRoute(async (req, res) => {
    res.set('Cache-Control', 'no-store')
    const actor = await dashboardActor(req)
    if (!actor) {
      res.status(401).json({ error: 'Sign in to send notifications.' })
      return
    }
    if (!dashboardAdmins.has(actor.role)) {
      res.status(403).json({ error: 'Only admins can notify tutors.' })
      return
    }

    const { tutor_id: tutorId, body } = req.body ?? {}
    if (
      typeof tutorId !== 'string' ||
      !uuid.test(tutorId) ||
      typeof body !== 'string' ||
      !body.trim() ||
      body.trim().length > 240
    ) {
      res
        .status(400)
        .json({ error: 'Choose a tutor and enter a short message.' })
      return
    }

    const publicKey = process.env.VAPID_PUBLIC_KEY
    const privateKey = process.env.VAPID_PRIVATE_KEY
    if (!publicKey || !privateKey) {
      res.status(503).json({ error: 'Tutor notifications are unavailable.' })
      return
    }

    const { data, error } = await supabase
      .from('users')
      .select('is_active, push_subscription')
      .eq('id', tutorId)
      .eq('role', 'tutor')
      .maybeSingle()
    if (error) throw error
    const stored =
      data?.is_active !== false ? subscription(data?.push_subscription) : null
    if (!stored) {
      res
        .status(404)
        .json({ error: 'This tutor has no supported push subscription.' })
      return
    }

    try {
      await WebPush.sendNotification(
        stored,
        JSON.stringify({
          title: 'Class Update',
          body: body.trim(),
          url: '/calendar',
        }),
        {
          vapidDetails: {
            subject: 'mailto:admin@techtalk-hub.com',
            publicKey,
            privateKey,
          },
          timeout: 8_000,
        },
      )
    } catch (pushError) {
      const status =
        pushError && typeof pushError === 'object' && 'statusCode' in pushError
          ? pushError.statusCode
          : undefined
      console.error('Tutor push rejected:', { status })
      res
        .status(502)
        .json({ error: 'The push service could not deliver the notification.' })
      return
    }
    res.json({ success: true })
  }),
)

export default router
