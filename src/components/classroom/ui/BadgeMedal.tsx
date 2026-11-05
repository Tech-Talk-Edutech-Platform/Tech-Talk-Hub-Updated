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
 * Bronze hexagon medal, drawn in code (the reference's badge art is not ours).
 * Flat two-tone metal, a gold wreath or wings as the ornament.
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
      <polygon points={hexPoints(27)} fill="#7b3f1d" />
      <polygon points={hexPoints(24.5)} fill="#b8693a" />
      <polygon points={hexPoints(19)} fill="#9c5229" />
      <polygon points={hexPoints(17)} fill="#c97c45" />
      <Icon
        x={BADGE_CX - 10}
        y={BADGE_CY - 10}
        width={20}
        height={20}
        color="#fde7c8"
        strokeWidth={2.2}
      />
    </svg>
  )
}
