import express, { type Request, type Response } from 'express'
import { DEFAULT_CORS_ORIGINS } from '../middleware/cors'
import { rateLimit } from '../middleware/rateLimit'
import { MailerConfigError, sendEmail } from '../services/mailer'
import { passwordResetEmail } from '../services/emailTemplates'
import { supabase } from '../supabase'

/**
 * POST /api/auth/password-reset { email }: emails a password-reset link in
 * Tech Talk Hub's own template, sent by our mailer instead of Supabase's
 * default email.
 *
 * The link comes from Supabase (auth.admin.generateLink, type "recovery") and
 * opens /reset-password on the site the request came from, signed in for
 * choosing a new password. That URL must be in Supabase › Authentication ›
 * URL Configuration › Redirect URLs.
 *
 * It answers the same whether or not the email has an account, so it can't
 * be used to find out who has one. 503 means email isn't set up on the
 * server; the app then falls back to Supabase's own reset email.
 */
const router = express.Router()

const RESET_PATH = '/reset-password'
const FALLBACK_SITE = 'https://www.techtalk-hub.com'
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** The site to send people back to: the caller's, when it's one of ours. */
function siteOrigin(req: Request) {
  const allowed = new Set([
    ...DEFAULT_CORS_ORIGINS,
    ...(process.env.CORS_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim().replace(/\/+$/, ''))
      .filter(Boolean),
  ])
  const origin = req.headers.origin
  return origin && allowed.has(origin) ? origin : FALLBACK_SITE
}

function requestedEmail(body: unknown) {
  if (typeof body !== 'object' || body === null || !('email' in body)) {
    return null
  }
  const email = body.email
  return typeof email === 'string' && EMAIL_PATTERN.test(email.trim())
    ? email.trim().toLowerCase()
    : null
}

async function sendReset(req: Request, res: Response): Promise<void> {
  const email = requestedEmail(req.body)
  if (!email) {
    res.status(400).json({ error: 'Enter a valid email address.' })
    return
  }

  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${siteOrigin(req)}${RESET_PATH}` },
  })
  if (error) {
    // No account with that email: say nothing different.
    if (error.status === 404 || /not found/i.test(error.message)) {
      res.json({ ok: true })
      return
    }
    console.error('Password reset: link failed:', error.message)
    res.status(502).json({ error: 'Couldn’t create a reset link.' })
    return
  }

  const { data: profile } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', data.user.id)
    .maybeSingle<{ full_name: string | null }>()
  const metadataName: unknown = data.user.user_metadata?.full_name
  const message = passwordResetEmail({
    name:
      profile?.full_name ??
      (typeof metadataName === 'string' ? metadataName : null),
    resetUrl: data.properties.action_link,
  })

  try {
    await sendEmail({ to: email, ...message })
  } catch (sendError) {
    if (sendError instanceof MailerConfigError) {
      res.status(503).json({ error: sendError.message })
      return
    }
    console.error('Password reset: sending failed:', sendError)
    res.status(502).json({ error: 'Couldn’t send the reset email.' })
    return
  }
  res.json({ ok: true })
}

router.post(
  '/',
  rateLimit({ limit: 5, windowMs: 15 * 60_000 }),
  (req, res) => void sendReset(req, res),
)

export default router
