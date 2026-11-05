import AfricasTalking from 'africastalking'
import { supabase } from '../supabase'

const africasTalking = AfricasTalking({
  username: process.env.AT_USERNAME,
  apiKey: process.env.AT_API_KEY,
})

const sms = africasTalking.SMS

export async function sendReminders(): Promise<void> {
  const now = new Date()

  const tenMinLater = new Date(now.getTime() + 10 * 60 * 1000)
  const elevenMinLater = new Date(now.getTime() + 11 * 60 * 1000)

  const { data: classes } = await supabase
    .from('classes')
    .select('*')
    .gte('class_time', tenMinLater.toISOString())
    .lt('class_time', elevenMinLater.toISOString())
    .eq('status', 'scheduled')

  if (!classes || classes.length === 0) return

  for (const cls of classes) {
    try {
      await sms.send({
        to: cls.parent_phone,
        message: `Hi! Reminder: ${cls.student_name}'s coding class starts in 10 minutes 🚀 - Tech Talk Hub`,
        from: 'TechTalk',
      })

      console.log('SMS sent to', cls.parent_phone)
    } catch (err) {
      console.error(
        'SMS failed',
        err instanceof Error ? err.message : 'Unknown SMS error',
      )
    }
  }
}
