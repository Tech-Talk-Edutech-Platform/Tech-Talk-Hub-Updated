/**
 * The tutor training course shown under "Training" in the tutor dashboard.
 * It's a starter syllabus: edit the wording, add lessons or modules here.
 * Lesson ids are stored in each tutor's progress, so keep an id once tutors
 * have started; renaming the title is fine.
 */

export type TrainingLesson = {
  id: string
  title: string
  minutes: number
  summary: string
  points: readonly string[]
  /** In-app pages or policies worth opening alongside the lesson. */
  links?: readonly { label: string; href: string }[]
}

export type TrainingModule = {
  id: string
  title: string
  description: string
  /** Every tutor completes these before taking classes on their own. */
  required: boolean
  lessons: readonly TrainingLesson[]
}

export const TUTOR_TRAINING: readonly TrainingModule[] = [
  {
    id: 'welcome',
    title: 'Welcome to Tech Talk Hub',
    description: 'How we teach, who we teach and what parents expect.',
    required: true,
    lessons: [
      {
        id: 'welcome-how-we-teach',
        title: 'How we teach',
        minutes: 10,
        summary:
          'Live, small classes where children build something real every session.',
        points: [
          'Every class ends with something the student made and can show.',
          'Explain less, build more: demonstrate, then let them drive.',
          'Praise effort and debugging, not only correct answers.',
        ],
        links: [{ label: 'Our curriculum', href: '/curriculum' }],
      },
      {
        id: 'welcome-programs',
        title: 'The three programs',
        minutes: 10,
        summary:
          'Junior Coders (5–8), Future Developers (9–12) and Tech Professionals (13–18).',
        points: [
          'Junior Coders: block coding, stories and games; short activities.',
          'Future Developers: Scratch projects into first Python programs.',
          'Tech Professionals: Python, web development and AI projects.',
        ],
      },
    ],
  },
  {
    id: 'trial-classes',
    title: 'Running a great trial class',
    description:
      'A trial is the family’s first impression. It decides whether they enrol.',
    required: true,
    lessons: [
      {
        id: 'trial-before',
        title: 'Before the trial',
        minutes: 8,
        summary: 'Check the booking and be in the room early.',
        points: [
          'Open “Trial bookings” and read the student’s grade and the notes from sales.',
          'Join the meeting link 5 minutes early with camera and mic tested.',
          'Have a project ready for that age group, plus a backup.',
        ],
      },
      {
        id: 'trial-flow',
        title: 'The trial, minute by minute',
        minutes: 15,
        summary:
          'Introduce, warm up, build a mini project, then walk the parent through what’s next.',
        points: [
          '0–5 min: introductions; ask what they enjoy and what they’ve tried.',
          '5–40 min: build a small project together; let the student drive.',
          '40–50 min: the student shows what they made.',
          '50–60 min: tell the parent how full classes work and what the student would learn next.',
        ],
      },
      {
        id: 'trial-after',
        title: 'After the trial',
        minutes: 5,
        summary: 'Hand over to the sales team quickly while it’s fresh.',
        points: [
          'Mark the class completed and add a short note on level and interests.',
          'Flag anything the sales team should know (schedule, siblings, concerns).',
          'Never discuss fees yourself: the sales team follows up.',
        ],
      },
    ],
  },
  {
    id: 'classroom',
    title: 'Using the online classroom',
    description: 'Camera, screen share, badges and recordings.',
    required: true,
    lessons: [
      {
        id: 'classroom-setup',
        title: 'Your setup',
        minutes: 8,
        summary: 'Look and sound clear from a quiet, well-lit space.',
        points: [
          'Use a laptop with a headset; avoid joining from a phone.',
          'Turn on background blur in Settings if your space is busy.',
          'Test camera and microphone in Settings before students join.',
        ],
        links: [{ label: 'Classroom tour', href: '/classroom/tour' }],
      },
      {
        id: 'classroom-tools',
        title: 'Teaching tools',
        minutes: 10,
        summary: 'Screen share, badges and alerts keep students engaged.',
        points: [
          'Share one window, not your whole screen.',
          'Give badges for effort and good debugging.',
          'Record classes only through the classroom’s record button.',
        ],
      },
    ],
  },
  {
    id: 'safeguarding',
    title: 'Child safety',
    description: 'Non-negotiable rules for working with children online.',
    required: true,
    lessons: [
      {
        id: 'safeguarding-rules',
        title: 'Safeguarding rules',
        minutes: 12,
        summary:
          'Keep every interaction professional, visible and on-platform.',
        points: [
          'Contact students only through Tech Talk Hub channels, never privately.',
          'Never share or ask for personal contact details or photos.',
          'Report any concern to an admin the same day.',
        ],
        links: [{ label: 'Child safety policy', href: '/child-safety' }],
      },
    ],
  },
  {
    id: 'operations',
    title: 'Schedule, homework and results',
    description: 'The admin side of teaching.',
    required: false,
    lessons: [
      {
        id: 'operations-schedule',
        title: 'Keeping your schedule',
        minutes: 6,
        summary:
          'Open availability in one-hour slots; the system keeps 15-minute breaks.',
        points: [
          'Add availability in “My Schedule” at least a week ahead.',
          'Accept or decline booking requests within 24 hours.',
          'If you can’t make a class, tell an admin as early as possible.',
        ],
      },
      {
        id: 'operations-homework',
        title: 'Homework and results',
        minutes: 6,
        summary: 'Short, regular feedback keeps parents confident.',
        points: [
          'Set homework that builds on the class project.',
          'Review submissions within the week.',
          'Upload results so parents can follow progress.',
        ],
      },
    ],
  },
]
