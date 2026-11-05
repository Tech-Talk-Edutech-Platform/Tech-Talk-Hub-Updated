import {
  BarChart3,
  ClipboardCheck,
  Code2,
  Globe2,
  Mail,
  MessageCircle,
  Phone,
  Trophy,
} from 'lucide-react'
import {
  FaAndroid,
  FaAws,
  FaCloud,
  FaCss3Alt,
  FaDatabase,
  FaDocker,
  FaGamepad,
  FaGitAlt,
  FaHtml5,
  FaJs,
  FaLinux,
  FaMicrochip,
  FaNodeJs,
  FaPython,
  FaReact,
  FaRobot,
  FaSitemap,
  FaTerminal,
} from 'react-icons/fa'

import type {
  HighlightFeature,
  IconFeature,
  StudentProject,
  TechIcon,
} from '../types/content'
import { EMAIL, PHONE, WHATSAPP_URL } from './site'

export const HERO_BENEFITS = [
  'Learn from the comfort of home',
  '1-on-1 sessions with expert mentors',
  'Personalized learning paths',
  'Flexible scheduling from anywhere',
]

export const TECH_ICONS: TechIcon[] = [
  { name: 'terminal', icon: FaTerminal, color: 'text-blue-600' },
  { name: 'html5', icon: FaHtml5, color: 'text-orange-500' },
  { name: 'python', icon: FaPython, color: 'text-indigo-600' },
  { name: 'javascript', icon: FaJs, color: 'text-yellow-400' },
  { name: 'react', icon: FaReact, color: 'text-cyan-500' },
  { name: 'robotics', icon: FaRobot, color: 'text-green-600' },
  { name: 'games', icon: FaGamepad, color: 'text-red-500' },
  { name: 'electronics', icon: FaMicrochip, color: 'text-purple-600' },
  { name: 'algorithms', icon: FaSitemap, color: 'text-teal-500' },
  { name: 'cloud', icon: FaCloud, color: 'text-gray-500' },
  { name: 'nodejs', icon: FaNodeJs, color: 'text-green-700' },
  { name: 'docker', icon: FaDocker, color: 'text-blue-400' },
  { name: 'databases', icon: FaDatabase, color: 'text-yellow-500' },
  { name: 'git', icon: FaGitAlt, color: 'text-red-600' },
  { name: 'linux', icon: FaLinux, color: 'text-black' },
  { name: 'android', icon: FaAndroid, color: 'text-green-500' },
  { name: 'css3', icon: FaCss3Alt, color: 'text-blue-600' },
  { name: 'aws', icon: FaAws, color: 'text-orange-400' },
]

export const PLATFORM_ADVANTAGES: IconFeature[] = [
  {
    icon: BarChart3,
    title: 'Unified Dashboard',
    description:
      'A personalized space where learners can follow lessons, assignments and progress.',
  },
  {
    icon: ClipboardCheck,
    title: 'Smart Assessments',
    description:
      'Interactive assessments with timely feedback to strengthen understanding.',
  },
  {
    icon: Trophy,
    title: 'Gamified Progress',
    description:
      'XP, achievements and milestones that keep learners motivated.',
  },
]

export const ABOUT_HIGHLIGHTS: HighlightFeature[] = [
  {
    icon: Code2,
    iconClassName: 'bg-purple-100 text-primary',
    title: 'Practical Learning',
    description:
      'Learners create games, websites, applications and real-world technology projects.',
  },
  {
    icon: Globe2,
    iconClassName: 'bg-pink-100 text-secondary',
    title: 'Built for Africa',
    description:
      'Flexible online learning designed to make quality technology education more accessible.',
  },
]

export const STUDENT_PROJECTS: StudentProject[] = [
  {
    id: 1,
    title: 'Premier League Hub',
    student: 'Coulibaly Oleg Arni Doutuan',
    grade: 'Grade 10',
    category: 'Website Development',
    description:
      'An interactive web platform tracking live match stats and league standings built with modern web technologies.',
    image: '/projects/premier-league.jpg',
  },
  {
    id: 2,
    title: 'Dance Party Animation',
    student: 'Syeda Hiba Sikandar',
    grade: 'Grade 3',
    category: 'Animation & Scratch',
    description:
      'A vibrant, rhythmic interactive dance animation featuring custom sprite mechanics and synchronized music logic.',
    image: '/projects/dance-party.jpg',
  },
  {
    id: 3,
    title: 'Knowing About Animals',
    student: 'Megha Rae',
    grade: 'Grade 6',
    category: 'Interactive Quiz Game',
    description:
      'An educational quiz game designed to teach children about wildlife facts through block-based programming logic.',
    image: '/projects/animals.jpg',
  },
]

/** Contact cards in the "We're here to help" panel. */
export const CONTACT_METHODS = [
  { label: 'Call Us', value: PHONE.display, href: PHONE.href, icon: Phone },
  {
    label: 'Email Us',
    value: EMAIL,
    href: `mailto:${EMAIL}`,
    icon: Mail,
    breakValue: true,
  },
  {
    label: 'WhatsApp',
    value: 'Chat with our team',
    href: WHATSAPP_URL,
    icon: MessageCircle,
    external: true,
  },
]

export const PROGRAM_INTEREST_OPTIONS = [
  'Junior Coders',
  'Future Developers',
  'Tech Professionals',
  'Not sure yet',
]
