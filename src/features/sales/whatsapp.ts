import { gradeCategory } from './gradeCategories'
import type { Mentor, TrialBooking, WhatsAppTemplate } from './types'

/** "Sat 21 Nov, 4:00 PM" in the viewer's time zone. */
export function trialTime(iso: string) {
  return new Date(iso).toLocaleString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] || name

/**
 * The text of each automatic message. These become WhatsApp Business message
 * templates (Meta approves them before they can be sent automatically), so
 * keep the wording and the {{placeholders}} in step with the approved ones.
 */
export function whatsappMessage(
  template: WhatsAppTemplate,
  booking: TrialBooking,
  mentor: Mentor | undefined,
): string {
  const parent = firstName(booking.parentName)
  const student = firstName(booking.studentName)
  const program = gradeCategory(booking.category).label
  const when = trialTime(booking.start)
  const tutor = mentor?.name ?? 'your tutor'

  const messages: Record<WhatsAppTemplate, () => string> = {
    trial_confirmation: () =>
      [
        `Hi ${parent}, thank you for booking a free coding trial with Tech Talk Hub! 🚀`,
        ``,
        `👦 Student: ${booking.studentName} (${program})`,
        `📅 When: ${when}`,
        `👩‍🏫 Tutor: ${tutor}`,
        `🔗 Join link: ${booking.meetLink}`,
        ``,
        `Please join from a laptop or desktop with a working camera and microphone. Reply to this message if you need to change the time.`,
      ].join('\n'),
    trial_reminder: () =>
      `Hi ${parent}, a reminder that ${student}'s free coding trial with ${tutor} starts at ${when}. Join here: ${booking.meetLink} 🎉`,
    trial_follow_up: () =>
      `Hi ${parent}, thank you for joining today's trial! ${tutor} enjoyed working with ${student}. Would you like us to share the class plan and fees for ${program}?`,
  }
  return messages[template]()
}

/**
 * Sent by hand when a booking the parent was already told about is removed
 * (booked by mistake, duplicate, wrong time).
 */
export function correctionMessage(booking: TrialBooking) {
  return `Hi ${firstName(booking.parentName)}, apologies: the free trial for ${firstName(booking.studentName)} on ${trialTime(booking.start)} was booked by mistake and has been removed. Please ignore that confirmation. We'll be in touch shortly to agree the right time 🙏`
}

/**
 * The first message to a parent, sent by hand from the rep's WhatsApp. It
 * asks for what the booking needs: the child's name, grade and interests.
 */
export function introMessage(parentName: string, repName: string | null) {
  const from = repName
    ? `${firstName(repName)} from Tech Talk Hub`
    : 'Tech Talk Hub'
  return [
    `Hi ${firstName(parentName)}, this is ${from} 👋 Thank you for your interest in coding classes for your child!`,
    ``,
    `To book a free trial class with the right tutor, could you share:`,
    `• Your child's name`,
    `• Their grade (or age)`,
    `• Anything they enjoy or have tried before (games, Scratch, Python…)`,
  ].join('\n')
}

/** Digits only, with the country code: what wa.me and the Cloud API expect. */
export function whatsappNumber(phone: string) {
  return phone.replace(/\D/g, '')
}

/**
 * A click-to-chat link with the message filled in. Until the WhatsApp Business
 * API is connected, this is how a sales rep sends a message in one tap.
 */
export function whatsappLink(phone: string, message: string) {
  return `https://wa.me/${whatsappNumber(phone)}?text=${encodeURIComponent(message)}`
}
