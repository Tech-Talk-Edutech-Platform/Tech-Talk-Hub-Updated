import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express'
import { Resend } from 'resend'

import { rateLimit } from '../middleware/rateLimit'

const router = express.Router()

const DEFAULT_FROM = 'Tech Talk Hub <admin@techtalk-hub.com>'
const MAX_EMAIL_LENGTH = 254
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface CurriculumRequestBody {
  email?: unknown
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function parseEmail(body: CurriculumRequestBody | undefined): string | null {
  const email = typeof body?.email === 'string' ? body.email.trim() : ''

  if (email.length === 0 || email.length > MAX_EMAIL_LENGTH) {
    return null
  }

  return EMAIL_PATTERN.test(email) ? email : null
}

type CurriculumRequest = Request<
  Record<string, string>,
  unknown,
  CurriculumRequestBody
>

/**
 * Emails a parent the curriculum roadmap PDF and, when
 * `LEAD_NOTIFICATION_EMAIL` is set, tells the team about the new lead.
 */
async function sendCurriculum(
  req: CurriculumRequest,
  res: Response,
): Promise<void> {
  const email = parseEmail(req.body)

  if (!email) {
    res.status(400).json({ error: 'Enter a valid email address.' })
    return
  }

  const apiKey = process.env.RESEND_API_KEY
  const pdfUrl = process.env.CURRICULUM_PDF_URL

  if (!apiKey || !pdfUrl) {
    console.error(
      'send-curriculum is not configured: set RESEND_API_KEY and CURRICULUM_PDF_URL.',
    )
    res.status(503).json({ error: 'Roadmap emails are unavailable right now.' })
    return
  }

  const resend = new Resend(apiKey)
  const from = process.env.CURRICULUM_FROM_EMAIL || DEFAULT_FROM

  const { error } = await resend.emails.send({
    from,
    to: email,
    subject: 'Your Coding Roadmap from Tech Talk Hub',
    html: `<p>Hi there! Thanks for your interest in Tech Talk Hub.</p>
             <p>Here is your PDF Roadmap: <a href="${escapeHtml(pdfUrl)}">Download Now</a></p>`,
  })

  if (error) {
    console.error('Failed to send curriculum roadmap:', error)
    res
      .status(502)
      .json({ error: 'We could not send the roadmap. Please try again.' })
    return
  }

  const notifyTo = process.env.LEAD_NOTIFICATION_EMAIL

  if (notifyTo) {
    // The parent already has their email; a failed notification is only logged.
    const { error: notifyError } = await resend.emails.send({
      from,
      to: notifyTo,
      subject: 'New Lead: Curriculum Download',
      text: `New lead signed up for the curriculum roadmap: ${email}`,
    })

    if (notifyError) {
      console.error('Failed to send lead notification:', notifyError)
    }
  }

  res.json({ success: true })
}

router.post(
  '/',
  rateLimit({ limit: 5, windowMs: 15 * 60 * 1000 }),
  (req: CurriculumRequest, res: Response, next: NextFunction) => {
    sendCurriculum(req, res).catch(next)
  },
)

export default router
