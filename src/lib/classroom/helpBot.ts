// Replies for the "Need help?" support chat. After a topic is picked, what the
// tutor types goes to the admins' Class alerts inbox (saveHelpRequest in
// repository.ts). "Ask AI" answers the common room questions itself and
// passes anything else on to the admins too.
import { CLASSROOM_BRAND } from '../../data/classroomBrand'
import type { HelpTopicId } from '../../types/classroom'

export const SUPPORT_WHATSAPP = {
  display: '+254 118 755 558',
  url: 'https://wa.me/254118755558',
}

export const GREETING = [
  `Hi! Welcome to ${CLASSROOM_BRAND.supportName}. What can we help you with today?`,
  'Please choose the option that best describes your request.',
]

const TO_ADMIN =
  'Describe it below and I’ll send it straight to the admin team.'

const TOPIC_REPLIES: Record<HelpTopicId, string> = {
  'ask-ai':
    'Ask me anything about running your class: camera, mic, screen share, recording, badges or submissions. If I can’t answer, I’ll pass it to the admin team.',
  trial: `Got it, a trial class issue. Tell us what is happening in the class. ${TO_ADMIN}`,
  paid: `Thanks. Share the student name and what went wrong in the class. ${TO_ADMIN}`,
  'teacher-request': `Sure. What would you like to request? ${TO_ADMIN}`,
  onboarding: `Happy to help with onboarding. What does the student need? ${TO_ADMIN}`,
  general: `Ask away. ${TO_ADMIN}`,
  ptm: `Tell us whether this is a PTM, a doubt session or a makeup class, and the preferred time. ${TO_ADMIN}`,
  leave: `Let us know the dates of your leave and any classes that need covering. ${TO_ADMIN}`,
  payout: `Sorry about that. Which payout period is affected? ${TO_ADMIN}`,
  strike: `Tell us which class the strike relates to and what happened. ${TO_ADMIN}`,
  mapping: `Which student and which course should we map? ${TO_ADMIN}`,
}

const FAQ: { pattern: RegExp; reply: string }[] = [
  {
    pattern: /cam|video/i,
    reply:
      'Press Cam at the bottom of the room. If nothing happens, allow camera access from the icon in the address bar.',
  },
  {
    pattern: /mic|audio|hear|sound/i,
    reply:
      'Press Mic to unmute. Choose a different microphone under Settings (the gear, top right of the room).',
  },
  {
    pattern: /share|screen/i,
    reply:
      'Press Share and pick a tab, window or your whole screen. Press it again to stop.',
  },
  {
    pattern: /record/i,
    reply:
      'Press Record, choose this tab in the picker, and the recording downloads as a .webm when you press Stop.',
  },
  {
    pattern: /badge/i,
    reply:
      'Use Give badge in the toolbar. Badges appear under “Badges given to students” in Class details.',
  },
  {
    pattern: /submit|project/i,
    reply:
      'Use Submit project in the toolbar to submit an activity on your student’s behalf.',
  },
  {
    pattern: /picture.in.picture|pip|float/i,
    reply:
      'Press the Picture in Picture button at the top of the room. In Chrome and Edge the class also pops out on its own when you switch to another tab.',
  },
]

export function replyForTopic(topicId: HelpTopicId) {
  return TOPIC_REPLIES[topicId]
}

/** Ask AI's own answer, or null when the admins should take it. */
export function faqReply(text: string): string | null {
  return FAQ.find(({ pattern }) => pattern.test(text))?.reply ?? null
}

export const SENT_TO_ADMIN =
  'Sent to the admin team. They’ll follow up with you shortly, so you can carry on with the class. Add anything else here and it goes to them too.'

export const PASSED_TO_ADMIN =
  'I don’t have an answer for that, so I’ve passed your question to the admin team. They’ll follow up with you shortly.'

export const NOT_SAVED = `This room isn’t a saved class, so I can’t reach the admin team from here. Message us on WhatsApp at ${SUPPORT_WHATSAPP.display}.`

export const sendFailed = (reason: string) =>
  `That didn’t send: ${reason} Try again, or message us on WhatsApp at ${SUPPORT_WHATSAPP.display}.`
