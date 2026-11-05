import { Hand } from 'lucide-react'

type HandBadgeProps = { className: string }

/** The white raised-hand dot on a participant tile. */
export function HandBadge({ className }: HandBadgeProps) {
  return (
    <span
      className={`text-stage absolute grid size-8 place-items-center rounded-full bg-white shadow-[0_4px_12px_-4px_rgb(0_0_0/0.4)] ${className}`}
    >
      <Hand size={17} strokeWidth={2} aria-hidden="true" />
    </span>
  )
}
