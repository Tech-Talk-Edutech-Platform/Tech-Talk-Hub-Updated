import type { ReactElement } from 'react'
import { BADGE_CX, BADGE_CY } from '../../../lib/classroom/badgeGeometry'

/** Gold laurel leaves either side of the medal. */
export function BadgeWreath() {
  const leaves: ReactElement[] = []
  for (const side of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const deg = 125 + i * 18 // top of the hexagon down to its base
      const a = (deg * Math.PI) / 180
      const x = BADGE_CX + side * -Math.cos(a) * 36
      const y = BADGE_CY + Math.sin(a) * -34 + 4
      const rot = side * (deg - 90) + (side === 1 ? 180 : 0)
      leaves.push(
        <ellipse
          key={`${side}-${i}`}
          cx={x}
          cy={y}
          rx="3.4"
          ry="7.2"
          transform={`rotate(${rot} ${x} ${y})`}
          fill={i % 2 ? '#e3b23c' : '#f0c955'}
        />,
      )
    }
  }
  return <g>{leaves}</g>
}
