import type { BadgeAnnouncement } from '../../../types/classroom'
import { BadgeMedal } from '../ui/BadgeMedal'

type BadgeCelebrationProps = { award: BadgeAnnouncement | null }

/**
 * The medal pops in at the top of the room for everyone when the teacher gives
 * a badge. Decorative motion only; the toast below carries the words.
 */
export function BadgeCelebration({ award }: BadgeCelebrationProps) {
  if (!award) return null
  return (
    <div
      key={award.id}
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-[18%] z-20 flex justify-center px-4"
    >
      <div className="badge-celebrate flex flex-col items-center rounded-[20px] bg-white/95 px-6 pt-3 pb-4 shadow-[0_24px_60px_-20px_rgb(15_23_42/0.6)] backdrop-blur-sm">
        <BadgeMedal icon={award.icon} ornament={award.ornament} size={132} />
        <p className="-mt-1 text-[13px] font-medium text-muted">
          {award.studentName} earned
        </p>
        <p className="text-[18px] leading-6 font-bold text-ink">{award.name}</p>
      </div>
    </div>
  )
}
