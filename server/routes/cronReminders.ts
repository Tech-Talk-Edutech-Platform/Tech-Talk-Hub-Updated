import express, { type Request, type Response } from 'express'
import { sendReminders } from '../services/smsService'

/**
 * /api/cron/reminders: texts parents about classes starting in 10 minutes.
 *
 * On Vercel there is no long-running process for node-cron, so a scheduler
 * calls this every minute instead (Vercel Cron on Pro, or Supabase pg_cron).
 * It must send `Authorization: Bearer <CRON_SECRET>`; Vercel Cron does this
 * automatically when CRON_SECRET is set on the project.
 */
const router = express.Router()

async function run(req: Request, res: Response): Promise<void> {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    res.status(503).json({ error: 'CRON_SECRET is not configured.' })
    return
  }
  if (req.headers.authorization !== `Bearer ${secret}`) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  try {
    await sendReminders()
    res.json({ ok: true })
  } catch (error) {
    console.error('Reminder run failed:', error)
    res.status(500).json({ error: 'Reminder run failed.' })
  }
}

// Vercel Cron sends GET; other schedulers usually POST.
router.get('/', (req, res) => void run(req, res))
router.post('/', (req, res) => void run(req, res))

export default router
