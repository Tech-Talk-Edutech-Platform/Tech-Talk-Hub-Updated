import {
  Blocks,
  BookOpen,
  BrainCircuit,
  Code2,
  GraduationCap,
  Laptop,
  Lightbulb,
  Puzzle,
  Rocket,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react'

import { ALL_STORIES } from '../lib/blog'
import type { BlogCategory, TintedCard } from '../types/blog'

export const BLOG_CATEGORIES: BlogCategory[] = [
  { label: 'All Stories', value: ALL_STORIES, icon: Sparkles },
  { label: 'Coding for Kids', value: 'Coding for Kids', icon: Code2 },
  { label: 'Parent Guides', value: 'Parent Guides', icon: Users },
  { label: 'Student Stories', value: 'Student Stories', icon: GraduationCap },
  { label: 'Education', value: 'Education', icon: BookOpen },
  { label: 'Technology', value: 'Technology', icon: Lightbulb },
]

export const PARENT_RESOURCES: TintedCard[] = [
  {
    title: 'Getting started',
    description: 'Understand what coding looks like at different ages.',
    icon: Rocket,
    href: '/blog?category=Parent%20Guides',
    background: 'from-[#F7F3FF] to-[#F0EAFF]',
    iconBackground: 'bg-[#E8DEFF]',
    iconColor: 'text-[#7651EF]',
  },
  {
    title: 'Learning through play',
    description: 'Discover how games and creativity make coding approachable.',
    icon: Lightbulb,
    href: '/blog?category=Coding%20for%20Kids',
    background: 'from-[#F2F7FF] to-[#EAF2FF]',
    iconBackground: 'bg-[#DDEAFF]',
    iconColor: 'text-[#315DF5]',
  },
  {
    title: 'Student journeys',
    description: 'See what young learners can build with the right support.',
    icon: GraduationCap,
    href: '/blog?category=Student%20Stories',
    background: 'from-[#FFF5F2] to-[#FFF0EB]',
    iconBackground: 'bg-[#FFE2D9]',
    iconColor: 'text-[#F56746]',
  },
]

/** Shown inside articles after a heading about ages. */
export const AGE_GROUP_CARDS: TintedCard[] = [
  {
    title: 'Ages 5–8',
    subtitle: 'Junior Coders',
    description:
      'Learn through play, visual blocks, storytelling and simple logic.',
    icon: Puzzle,
    background: 'from-[#F7F3FF] to-[#F0EAFF]',
    iconBackground: 'bg-[#E8DEFF]',
    iconColor: 'text-[#7951EF]',
    border: 'border-[#E8DDFF]',
  },
  {
    title: 'Ages 9–12',
    subtitle: 'Future Developers',
    description: 'Build games, explore Python and create beginner websites.',
    icon: Code2,
    background: 'from-[#F1F7FF] to-[#E9F2FF]',
    iconBackground: 'bg-[#DCEBFF]',
    iconColor: 'text-[#3266E8]',
    border: 'border-[#DDEAFF]',
  },
  {
    title: 'Ages 13–18',
    subtitle: 'Tech Professionals',
    description: 'Explore apps, AI, data science and real-world projects.',
    icon: Rocket,
    background: 'from-[#FFF5F2] to-[#FFF0EB]',
    iconBackground: 'bg-[#FFE1D8]',
    iconColor: 'text-[#F56746]',
    border: 'border-[#FFE0D6]',
  },
]

/** Shown inside articles after a heading about benefits. */
export const CODING_BENEFIT_CARDS: TintedCard[] = [
  {
    title: 'Problem-solving',
    description: 'Break challenges into manageable steps.',
    icon: BrainCircuit,
    background: 'bg-[#F4F0FF]',
    iconBackground: 'bg-[#E8DDFF]',
    iconColor: 'text-[#7853EE]',
  },
  {
    title: 'Creativity',
    description: 'Turn ideas into games, stories and apps.',
    icon: Lightbulb,
    background: 'bg-[#EDF5FF]',
    iconBackground: 'bg-[#DCEBFF]',
    iconColor: 'text-[#3571E8]',
  },
  {
    title: 'Confidence',
    description: 'Build independence through practical achievements.',
    icon: Target,
    background: 'bg-[#FFF2EE]',
    iconBackground: 'bg-[#FFE0D8]',
    iconColor: 'text-[#F36649]',
  },
  {
    title: 'Future skills',
    description: 'Develop useful skills for a technology-driven world.',
    icon: GraduationCap,
    background: 'bg-[#EEFAF7]',
    iconBackground: 'bg-[#D8F4EC]',
    iconColor: 'text-[#11A487]',
  },
]

/** Shown inside articles after a heading about choosing a coding class. */
export const CODING_CLASS_CHECKLIST: { label: string; icon: LucideIcon }[] = [
  { label: 'Age-appropriate lessons', icon: Blocks },
  { label: 'Live tutor guidance', icon: UserRound },
  { label: 'Practical projects', icon: Laptop },
  { label: 'A clear learning pathway', icon: Rocket },
  { label: 'Regular progress updates', icon: Target },
  { label: 'Safe technology use', icon: ShieldCheck },
]

/** Ticks on the blog's call-to-action panels. */
export const BLOG_CTA_POINTS = [
  'Live classes',
  'Practical projects',
  'Ages 5–18',
]
