import cron from 'node-cron'
import { sendReminders } from './services/smsService'
import { sendPendingTrialInvites } from './services/trialInvites'

/**
 * Every minute: texts reminders for classes starting soon, and emails trial
 * invites that haven't gone out yet (see services/trialInvites.ts).
 */
export function startReminderScheduler(): void {
  cron.schedule('* * * * *', async () => {
    const results = await Promise.allSettled([
      sendReminders(),
      sendPendingTrialInvites(),
    ])
    for (const result of results) {
      if (result.status === 'rejected') {
        console.error('Scheduled job failed:', result.reason)
      }
    }
  })
}
