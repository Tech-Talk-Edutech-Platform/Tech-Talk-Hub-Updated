// SAMPLE DATA. Everything here is fictional and stands in for what a real
// classroom API would return. Replace before using with real classes.
// Shape mirrors what the reference recording shows (docs/breakdown/04-class-details-panel.md).
import type {
  Activity,
  Badge,
  ClassAlert,
  ClassMaterial,
  Classroom,
  EndReason,
  HelpTopic,
  Student,
  TourSection,
  VideoPlatform,
} from '../types/classroom'
import { CLASSROOM_BRAND } from './classroomBrand'

export const CLASSROOM: Classroom = {
  id: '50813276',
  title: 'AI & Coding Trial [Grade 6-8]',
  pageTitle: 'Trial class',
  teacher: { name: 'Jamie Rivera', initial: 'J' },
}

export const STUDENT: Student = {
  name: 'Amara',
  grade: 'Grade 8',
  studentId: 's2048117',
  phone: '+233 20 555 0142',
  email: 'amara.family@example.com',
  country: 'Ghana',
  city: 'Accra',
  timeZone: 'Africa/Accra',
  language: 'English',
  source: '/lp/trial-coding-classes-for-kids.html',
  interests: ['AI', 'game design'],
  specialRequirement:
    'Student is interested in AI & Coding. Please personalize the trial accordingly and confirm their preference at the start of the class.',
}

export const ACTIVITIES: Activity[] = [
  {
    id: 'python-quiz',
    title: 'Python quiz',
    outline:
      'Create a quiz using the most popular programming language - Python.',
    project: 'https://studio.code.org/projects/pythonlab/new',
  },
  {
    id: 'space-shooter',
    title: 'Space shooter',
    outline:
      'Build a multilevel space game with sprites, scoring and a boss level the student designs.',
    project: 'https://studio.code.org/projects/gamelab/new',
  },
  {
    id: 'save-the-robot',
    title: 'Save the Robot',
    outline:
      'Use video motion sensing in Scratch to save a robot character from falling by detecting player movement. This teaches students about interactive coding using video sensing and sprite control.',
    project: 'https://scratch.mit.edu/projects/editor/',
  },
  {
    id: 'word-swap',
    title: 'Word Swap',
    outline:
      'Create a multi-screen app using MIT App Inventor that translates words from one language to another (e.g., English to Twi) and reads the translated text aloud. Students learn about app navigation, translation APIs, and text-to-speech integration.',
    project: 'https://ai2.appinventor.mit.edu/',
  },
  {
    id: 'registration-form',
    title: 'Registration Form',
    outline:
      'In this activity, students will be making their own webpage for registration to a coding club.',
    project: 'https://studio.code.org/projects/weblab/new',
  },
  {
    id: 'superhero-board',
    title: 'Superhero board',
    outline:
      'Learn to create a superhero soundboard webpage with buttons that play sounds.',
    project: 'https://studio.code.org/projects/weblab/new',
  },
]

export const MATERIAL: ClassMaterial = {
  outcome: [
    'Making an App using sensors',
    'Creating an image recognition application',
    'Learning text to Speech',
    'Functions',
    'Parents to find their best fit in Tech Talk Hub',
  ],
  outline:
    'This session aims to help students to try their hand at simple yet exciting game development as a demonstration. This session highlights our teaching methodology, the technology used, and a sample outcome. Additionally, counseling will help students and their families find the best course suited to them.',
  agendaWarning: {
    title: 'This agenda is for the teacher only.',
    body: 'Please do not share your screen while viewing this. Only open it in a separate window.',
  },
  agenda: [
    {
      minutes: 5,
      step: 'Welcome, introductions and confirm the student’s interests',
    },
    {
      minutes: 10,
      step: 'Icebreaker and a quick look at what they have built before',
    },
    {
      minutes: 25,
      step: 'Guided build: pick one classroom activity and code it together',
    },
    { minutes: 10, step: 'Student presents their project; give a badge' },
    {
      minutes: 10,
      step: 'Parent conversation: progress, course fit and next steps',
    },
  ],
  links: [
    {
      label: 'Scratch App',
      isNew: true,
      items: [
        { text: 'Launch', href: 'https://scratch.mit.edu/projects/editor/' },
      ],
      note: 'Online Scratch editor - use for Save the Robot & block-based demos',
    },
    {
      label: 'Platform — Web Dev (Code.org)',
      items: [
        {
          text: 'Web Lab',
          href: 'https://studio.code.org/projects/weblab/new',
        },
        {
          text: 'Watch Platform tutorial',
          href: 'https://support.code.org/',
          underline: true,
        },
      ],
    },
    {
      label: 'Platform — Python (Code.org)',
      items: [
        {
          text: 'Python Lab',
          href: 'https://studio.code.org/projects/pythonlab/new',
        },
        { text: 'Watch Platform tutorial', href: 'https://support.code.org/' },
      ],
    },
    {
      label: 'Platform — Data Science / AI',
      items: [
        { text: 'Google Colab', href: 'https://colab.research.google.com/' },
        {
          text: 'Watch Platform tutorial',
          href: 'https://colab.research.google.com/notebooks/intro.ipynb',
        },
      ],
    },
    {
      label: 'Platform — Apps (MIT App Inventor)',
      items: [
        { text: 'App Inventor', href: 'https://ai2.appinventor.mit.edu/' },
        {
          text: 'Watch Platform tutorial',
          href: 'https://appinventor.mit.edu/explore/ai2/tutorials',
        },
      ],
    },
  ],
}

/** The eight badges in the "Give badge" popover, in the reference order. */
export const BADGES: Badge[] = [
  {
    id: 'charming-coder',
    name: 'Charming Coder',
    icon: 'code',
    ornament: 'wreath',
  },
  {
    id: 'coding-grandmaster',
    name: 'Coding Grandmaster',
    icon: 'crown',
    ornament: 'wings',
  },
  {
    id: 'creative-coder',
    name: 'Creative coder',
    icon: 'bulb',
    ornament: 'wings',
  },
  { id: 'design-master', name: 'Design Master', icon: 'pen', ornament: 'none' },
  {
    id: 'enthusiastic-coder',
    name: 'Enthusiastic coder',
    icon: 'medal',
    ornament: 'wings',
  },
  {
    id: 'outstanding-performance',
    name: 'Outstanding performance',
    icon: 'rocket',
    ornament: 'wreath',
  },
  {
    id: 'rising-coding-star',
    name: 'Rising Coding Star',
    icon: 'stars',
    ornament: 'none',
  },
  {
    id: 'star-performer',
    name: 'Star performer',
    icon: 'star',
    ornament: 'wreath',
  },
]

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

/** Everyone booked into this class: the End class attendance list. */
export const CLASS_STUDENTS: Student[] = [STUDENT]

/** The agenda's length. Ending before it asks the teacher to double-check. */
export const RECOMMENDED_CLASS_MINUTES = MATERIAL.agenda.reduce(
  (total, item) => total + item.minutes,
  0,
)

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
