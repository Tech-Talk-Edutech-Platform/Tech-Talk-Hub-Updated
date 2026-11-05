import type { LucideIcon } from 'lucide-react'
import type { IconType } from 'react-icons'

export type IconFeature = {
  icon: LucideIcon
  title: string
  description: string
}

export type HighlightFeature = IconFeature & {
  /** Background + text colour classes for the icon tile. */
  iconClassName: string
}

export type TechIcon = {
  name: string
  icon: IconType
  color: string
}

export type StudentProject = {
  id: number
  title: string
  student: string
  grade: string
  category: string
  description: string
  image: string
}
