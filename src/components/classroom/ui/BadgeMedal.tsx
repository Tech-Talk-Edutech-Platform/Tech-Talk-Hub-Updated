import {
  Award,
  Code,
  Crown,
  Lightbulb,
  PenTool,
  Rocket,
  Sparkles,
  Star,
  type LucideIcon,
} from 'lucide-react'
import {
  BADGE_CX,
  BADGE_CY,
  hexPoints,
} from '../../../lib/classroom/badgeGeometry'
import type { BadgeIcon, BadgeOrnament } from '../../../types/classroom'
import { BadgeWings } from './BadgeWings'
import { BadgeWreath } from './BadgeWreath'

const ICONS: Record<BadgeIcon, LucideIcon> = {
  code: Code,
  crown: Crown,
  bulb: Lightbulb,
  pen: PenTool,
  medal: Award,
  rocket: Rocket,
  stars: Sparkles,
  star: Star,
}

type BadgeMedalProps = {
  icon: BadgeIcon
  ornament: BadgeOrnament
  size?: number
}

/**
 * Hexagon medal drawn in code, in the site's colours: a navy rim, indigo
 * faces, a gold laurel (fun-pop yellow) or pink wings as the ornament.
 */
export function BadgeMedal({ icon, ornament, size = 76 }: BadgeMedalProps) {
  const Icon = ICONS[icon]
  return (
    <svg
      width={size}
      height={(size * 68) / 96}
      viewBox="0 10 96 68"
      aria-hidden="true"
    >
      {ornament === 'wreath' && <BadgeWreath />}
      {ornament === 'wings' && <BadgeWings />}
      <polygon points={hexPoints(27)} fill="#172554" />
      <polygon points={hexPoints(24.5)} fill="#5c6bc0" />
      <polygon points={hexPoints(19)} fill="#303f9f" />
      <polygon points={hexPoints(17)} fill="#3f51b5" />
      <Icon
        x={BADGE_CX - 10}
        y={BADGE_CY - 10}
        width={20}
        height={20}
        color="#fff3b0"
        strokeWidth={2.2}
      />
    </svg>
  )
}
