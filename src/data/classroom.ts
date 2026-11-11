// The classroom's fixed configuration: video platforms, alerts, help topics,
// reactions, End class reasons and the tour. Class content (the session,
// students, activities, material and badges) comes from Supabase; see
// src/lib/classroom/repository.ts, and src/data/classroomSample.ts for the
// built-in sample used before the classroom migration is applied.
import type {
  ClassAlert,
  EndReason,
  HelpTopic,
  TourSection,
  VideoPlatform,
} from '../types/classroom'
import { CLASSROOM_BRAND } from './classroomBrand'

/** The room /classroom opens: the sample session the migration seeds. */
export const DEFAULT_ROOM_CODE = '50813276'

/** This app's own video room. */
export const BUILT_IN_PLATFORM: VideoPlatform = {
  id: 'classroom',
  name: 'classroom',
  label: 'Tech Talk Hub room',
  builtIn: true,
}

/** "Switch Video Platform" options. */
export const PLATFORMS: VideoPlatform[] = [
  BUILT_IN_PLATFORM,
  { id: 'pencil', name: 'pencil', label: 'Pencil' },
  { id: 'zoom', name: 'zoom', label: 'Zoom', joinUrl: 'https://zoom.us/join' },
  {
    id: 'meet',
    name: 'meet',
    label: 'Google Meet',
    joinUrl: 'https://meet.google.com/',
  },
]

/** End class › Class completed successfully: where it finished, if not here. */
export const END_COMPLETED_VIA: EndReason[] = [
  ...PLATFORMS.filter((platform) => !platform.builtIn).map((platform) => ({
    id: `moved-${platform.id}`,
    label: `Moved to ${platform.label}`,
  })),
  { id: 'mobile', label: 'Class finished on mobile' },
]

/** End class › Class not completed: why. */
export const END_NOT_COMPLETED: EndReason[] = [
  {
    id: 'no-show',
    label: 'Student didn’t show up for the class',
    note: `A credit will be deducted for the student. Select this only if the student didn’t join and didn’t tell you beforehand. If the parent reaches out to ${CLASSROOM_BRAND.supportName}, the credit may be reversed.`,
  },
  {
    id: 'informed-absence',
    label: 'Student informed in advance they cannot join',
  },
  { id: 'disconnected', label: 'Student got disconnected' },
  {
    id: 'glitch-during',
    label: 'Class could not complete due to a technical glitch',
  },
  {
    id: 'glitch-start',
    label: 'Class could not start due to a technical glitch',
  },
  { id: 'no-laptop', label: 'Student does not have a laptop' },
  { id: 'partial', label: 'Class partially completed' },
  { id: 'wrong-grade', label: 'Student selected the wrong grade' },
  { id: 'language', label: 'Language barrier in teaching the student' },
  { id: 'connectivity', label: 'Student had an internet or electricity issue' },
  { id: 'other', label: 'Other reason', detailsRequired: true },
]

export const ALERTS: ClassAlert[] = [
  {
    id: 'ac',
    label: 'Send AC alert',
    sent: 'AC alert sent',
  },
  {
    id: 'support',
    label: 'Send support alert',
    sent: 'Support alert sent',
  },
]

export const HELP_TOPICS: HelpTopic[] = [
  { id: 'ask-ai', label: 'Ask AI', ai: true },
  { id: 'trial', label: 'Trial class issue' },
  { id: 'paid', label: 'Paid student / course class issue' },
  { id: 'teacher-request', label: 'Teacher request' },
  { id: 'onboarding', label: 'Student onboarding' },
  { id: 'general', label: 'General inquiry' },
  { id: 'ptm', label: 'Submit PTM / Doubt / Makeup class' },
  { id: 'leave', label: 'Teacher leave' },
  { id: 'payout', label: 'Report payout issue' },
  { id: 'strike', label: 'Strike appeal' },
  { id: 'mapping', label: 'Request course mapping' },
]

export const REACTIONS = ['👍', '👏', '❤️', '😂', '🎉', '😮']

/** The "Classroom tour" page: what every control does. */
export const TOUR_SECTIONS: TourSection[] = [
  {
    title: 'The class bar',
    items: [
      {
        term: 'Submit project',
        description:
          'Submit a classroom activity on your student’s behalf: pick the activity, paste the project link.',
      },
      {
        term: 'Give badge',
        description:
          'Award one of eight coding badges. It lands under “Badges given to students”, with an undo.',
      },
      {
        term: 'Class details',
        description:
          'Activities, lesson material, the student’s profile, their projects and badges.',
      },
      {
        term: 'Chat',
        description:
          'Message everyone in the room. Enter sends, Shift + Enter adds a new line.',
      },
      {
        term: 'Send alert',
        description:
          'Call in an academic counsellor (AC) or support. Each alert can be sent once a minute.',
      },
      {
        term: 'AI tools',
        description:
          'Icebreakers, concept explanations, encouragement and hints for the current activity.',
      },
      {
        term: 'Switch platform',
        description: 'Move the class to another video platform, and back.',
      },
      {
        term: 'Timer',
        description:
          'How long the class has been running. Shared by every tab in the room.',
      },
      {
        term: 'Need help?',
        description: 'Support chat. Pick a topic, then describe the issue.',
      },
      {
        term: 'End class',
        description: 'Ends the class for everyone and stops any recording.',
      },
    ],
  },
  {
    title: 'The room',
    items: [
      {
        term: 'Cam and Mic',
        description:
          'Orange means off. Press to turn on; your browser asks for access the first time.',
      },
      {
        term: 'Share',
        description:
          'Share a tab, a window or your whole screen. The share fills the room while it runs.',
      },
      {
        term: 'Record / Stop',
        description:
          'Choose this tab when the browser asks. Stop downloads the recording as a .webm file.',
      },
      {
        term: 'React',
        description: 'Send a reaction everyone sees, or raise your hand.',
      },
      {
        term: 'People',
        description:
          'Who is in the room, with their camera, mic and hand status, and a guest link.',
      },
      {
        term: 'Picture in Picture',
        description:
          'Pop the room out into a small window that stays on top of other apps.',
      },
      {
        term: 'Stats, Settings, More',
        description:
          'Live device stats; camera and mic choice; full screen, links and Leave room.',
      },
    ],
  },
]
