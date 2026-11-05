// Canned replies for the "Need help?" support chat. A real build would hand the
// conversation to a support desk after the topic is picked. Until then the bot
// says so plainly rather than promising that an agent will read the message.
import { CLASSROOM_BRAND } from '../../data/classroomBrand'
import type { HelpTopicId } from '../../types/classroom'

const NOT_CONNECTED =
  'This help chat isn’t connected to a support desk yet, so no one else will see this message. I can help with camera, mic, sharing, recording, badges and projects.'

export const GREETING = [
  `Hi! Welcome to ${CLASSROOM_BRAND.supportName}. What can we help you with today?`,
  'Please choose the option that best describes your request.',
]

const TOPIC_REPLIES: Record<HelpTopicId, string> = {
  'ask-ai':
    'Ask me anything about running your class: camera, mic, screen share, recording, badges or submissions.',
  trial: 'Got it, a trial class issue. Tell us what is happening in the class.',
  paid: 'Thanks. Share the student name and what went wrong in the class.',
  'teacher-request': 'Sure. What would you like to request?',
  onboarding: 'Happy to help with onboarding. What does the student need?',
  general: 'Ask away.',
  ptm: 'Tell us whether this is a PTM, a doubt session or a makeup class, and the preferred time.',
  leave:
    'Let us know the dates of your leave and any classes that need covering.',
  payout: 'Sorry about that. Which payout period is affected?',
  strike: 'Tell us which class the strike relates to and what happened.',
  mapping: 'Which student and which course should we map?',
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
]

export function replyForTopic(topicId: HelpTopicId) {
  return TOPIC_REPLIES[topicId]
}

export function replyForQuestion(text: string) {
  return FAQ.find(({ pattern }) => pattern.test(text))?.reply ?? NOT_CONNECTED
}
