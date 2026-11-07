import cron from 'node-cron'
import { sendReminders } from './services/smsService'

/** Checks for classes starting soon and texts reminders, every minute. */
export function startReminderScheduler(): void {
  cron.schedule('* * * * *', async () => {
    await sendReminders()
  })
}
