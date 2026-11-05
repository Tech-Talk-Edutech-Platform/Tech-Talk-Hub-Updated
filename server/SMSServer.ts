import cron from 'node-cron'
import { sendReminders } from './services/smsService'

// run every minute
cron.schedule('* * * * *', async () => {
  console.log('Checking upcoming classes...')
  await sendReminders()
})
