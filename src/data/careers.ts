import {
  BookOpen,
  Briefcase,
  Globe2,
  Heart,
  Lightbulb,
  Users,
} from 'lucide-react'

import type { IconFeature } from '../types/content'
import { EMAIL } from './site'

export const CAREER_AREAS: IconFeature[] = [
  {
    icon: BookOpen,
    title: 'Coding Tutors',
    description:
      'Guide children through engaging lessons in Scratch, Python, web development and other age-appropriate technology skills.',
  },
  {
    icon: Users,
    title: 'Sales & Partnerships',
    description:
      'Connect with families, schools and organizations interested in creating better technology learning opportunities.',
  },
  {
    icon: Lightbulb,
    title: 'Curriculum & Content',
    description:
      'Develop practical lessons, learning resources, student activities and creative educational content.',
  },
  {
    icon: Briefcase,
    title: 'Operations & Support',
    description:
      'Help coordinate classes, support families and improve the experience of learners and tutors.',
  },
]

export const CAREER_VALUES: IconFeature[] = [
  {
    icon: Heart,
    title: 'Learner-first thinking',
    description:
      'Every decision should help children feel supported, confident and excited to learn.',
  },
  {
    icon: Globe2,
    title: 'Accessible education',
    description:
      'We want practical technology education to reach more young learners across Africa.',
  },
  {
    icon: Lightbulb,
    title: 'Creativity and growth',
    description:
      'We value people who bring ideas, keep improving and enjoy solving meaningful problems.',
  },
]

export const CAREER_APPLICATION_HREF = `mailto:${EMAIL}?subject=Career%20Opportunity%20at%20Tech%20Talk%20Hub`
