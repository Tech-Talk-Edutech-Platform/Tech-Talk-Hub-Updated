import type { ReactElement } from 'react'
import { BADGE_CX, BADGE_CY } from '../../../lib/classroom/badgeGeometry'

/** Pink feathers (site secondary) either side of the medal. */
export function BadgeWings() {
  const feathers: ReactElement[] = []
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const y = BADGE_CY - 12 + i * 7
      const len = 30 - i * 5
      const x0 = BADGE_CX + side * 18
      const x1 = x0 + side * len
      feathers.push(
        <path
          key={`${side}-${i}`}
          d={`M${x0} ${y} Q ${(x0 + x1) / 2} ${y - 9 + i} ${x1} ${y - 4 + i * 1.5} Q ${(x0 + x1) / 2} ${y + 3} ${x0} ${y + 6}`}
          fill={i % 2 ? '#ff4081' : '#ff8bb2'}
        />,
      )
    }
  }
  return <g>{feathers}</g>
}
