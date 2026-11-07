import {
  BookOpen,
  Braces,
  BrainCircuit,
  Code2,
  Cpu,
  Database,
  Gamepad2,
  Rocket,
  ShieldCheck,
  Star,
} from 'lucide-react'

import type { ProgramShopContent } from '../types/programShop'
import type { ProgramSlug } from './programs'

const OUTLINE_BUTTON =
  'inline-flex items-center rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-700 shadow-sm'

export const PROGRAM_SHOPS: Record<ProgramSlug, ProgramShopContent> = {
  'junior-coders': {
    program: 'junior-coders',
    badge: 'Junior Coders',
    headline: 'Little minds.',
    highlight: 'Big ideas.',
    highlightGradientClass: 'bg-gradient-to-r from-primary to-secondary',
    description:
      'Fun coding books, activities, games and creative learning resources made especially for our youngest creators.',
    heroBackgroundClass:
      'bg-gradient-to-br from-white via-purple-50/40 to-purple-100/60',
    secondaryButtonClass: OUTLINE_BUTTON,
    glowClass: 'h-[280px] w-[280px] bg-purple-300/20',
    emblemRingClass: 'border-purple-100',
    emblemClass: 'bg-gradient-to-br from-primary to-purple-700',
    emblemIcon: Code2,
    orbits: [
      { icon: BookOpen, size: 28, className: 'text-secondary' },
      { icon: Gamepad2, size: 28, className: 'text-primary' },
      { icon: Star, size: 24, className: 'fill-yellow-400 text-yellow-400' },
    ],
    productsAnchor: 'junior-products',
    collectionTitle: 'Junior Coders Collection',
    collectionSubtitle: 'Learning made fun.',
    searchPlaceholder: 'Search Junior Coders...',
    ctaGradientClass:
      'bg-gradient-to-r from-primary via-purple-600 to-secondary',
    ctaEyebrow: 'MORE THAN RESOURCES',
    ctaTitle: 'Ready for your child to start coding?',
    ctaText:
      'Join Junior Coders for fun, personalized coding lessons designed for young learners.',
  },
  'future-developers': {
    program: 'future-developers',
    badge: 'Future Developers',
    headline: 'Build ideas.',
    highlight: 'Create the future.',
    highlightGradientClass:
      'bg-gradient-to-r from-primary via-purple-500 to-secondary',
    description:
      'Coding books, developer kits, projects and creative technology resources designed for young learners ready to move from exploring technology to building with it.',
    heroBackgroundClass:
      'bg-gradient-to-br from-white via-indigo-50/40 to-purple-100/60',
    secondaryButtonClass: `${OUTLINE_BUTTON} transition hover:border-purple-300 hover:bg-purple-50`,
    glowClass: 'h-[300px] w-[300px] bg-indigo-300/20',
    emblemRingClass: 'border-purple-100',
    emblemClass: 'bg-gradient-to-br from-indigo-950 via-primary to-purple-700',
    emblemIcon: Code2,
    orbits: [
      { icon: Braces, size: 28, className: 'text-secondary' },
      { icon: Cpu, size: 28, className: 'text-primary' },
      { icon: Rocket, size: 25, className: 'text-orange-500' },
    ],
    productsAnchor: 'future-developer-products',
    collectionTitle: 'Future Developers Collection',
    collectionSubtitle: 'Build. Experiment. Create.',
    searchPlaceholder: 'Search Future Developers...',
    ctaGradientClass:
      'bg-gradient-to-r from-indigo-700 via-primary to-secondary',
    ctaEyebrow: 'GO BEYOND THE BASICS',
    ctaTitle: 'Ready to start building real projects?',
    ctaText:
      'Join Future Developers and learn to build with Python, web technologies, game development and more.',
  },
  'tech-professionals': {
    program: 'tech-professionals',
    badge: 'Tech Professionals',
    headline: 'Learn deeper.',
    highlight: 'Build professionally.',
    highlightGradientClass:
      'bg-gradient-to-r from-primary via-indigo-600 to-secondary',
    description:
      'Advanced coding resources, project tools and technology materials for young developers ready to build real-world skills and prepare for the future of technology.',
    heroBackgroundClass:
      'bg-gradient-to-br from-white via-slate-50 to-indigo-100/60',
    secondaryButtonClass: `${OUTLINE_BUTTON} transition hover:border-purple-300 hover:bg-purple-50`,
    glowClass: 'h-[300px] w-[300px] bg-indigo-400/20',
    emblemRingClass: 'border-indigo-100',
    emblemClass: 'bg-gradient-to-br from-slate-950 via-indigo-950 to-primary',
    emblemIcon: Code2,
    orbits: [
      { icon: Database, size: 28, className: 'text-secondary' },
      { icon: BrainCircuit, size: 28, className: 'text-primary' },
      { icon: ShieldCheck, size: 25, className: 'text-emerald-500' },
    ],
    productsAnchor: 'tech-professional-products',
    collectionTitle: 'Tech Professionals Collection',
    collectionSubtitle: 'Tools for serious young creators.',
    searchPlaceholder: 'Search Tech Professionals...',
    ctaGradientClass:
      'bg-gradient-to-r from-slate-950 via-indigo-900 to-primary',
    ctaEyebrow: 'BUILD REAL-WORLD SKILLS',
    ctaTitle: 'Ready to take technology seriously?',
    ctaText:
      'Join Tech Professionals and develop advanced skills through practical projects, modern technologies and real-world problem solving.',
  },
}
