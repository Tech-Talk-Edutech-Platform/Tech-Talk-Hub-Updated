// SAMPLE DATA. Fictional content the classroom shows until the classroom
// migration (supabase/migrations/20261110120000_classroom.sql) is applied.
// The migration seeds the same content into Supabase, where it is edited in
// Dashboard -> Classroom.
import type {
  Activity,
  Badge,
  ClassMaterial,
  Classroom,
  ClassroomData,
  ClassroomViewer,
  Student,
} from '../types/classroom'

const SAMPLE_CLASSROOM: Omit<Classroom, 'id'> = {
  title: 'AI & Coding Trial [Grade 6-8]',
  pageTitle: 'Trial class',
  teacher: { name: 'Jamie Rivera', initial: 'J' },
  sessionId: null,
  recommendedMinutes: 60,
}

const SAMPLE_STUDENT: Student = {
  id: 'sample-student',
  userId: null,
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

export const SAMPLE_ACTIVITIES: Activity[] = [
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

export const SAMPLE_MATERIAL: ClassMaterial = {
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

/** The eight badges the migration seeds into classroom_badges. */
export const SAMPLE_BADGES: Badge[] = [
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

/** The agenda's total length, in minutes. */
export const agendaMinutes = (material: ClassMaterial | null) =>
  material?.agenda.reduce((total, item) => total + item.minutes, 0) ?? 0

/**
 * The sample room. Everyone runs it as the teacher, as before the migration,
 * and nothing is saved.
 */
export function sampleClassroomData(
  roomCode: string,
  viewer: ClassroomViewer,
): ClassroomData {
  return {
    source: 'sample',
    classroom: {
      ...SAMPLE_CLASSROOM,
      id: roomCode,
      recommendedMinutes: agendaMinutes(SAMPLE_MATERIAL),
    },
    students: [SAMPLE_STUDENT],
    material: SAMPLE_MATERIAL,
    activities: SAMPLE_ACTIVITIES,
    badges: SAMPLE_BADGES,
    awards: [],
    projects: [],
    viewer: { ...viewer, isStaff: true },
  }
}
