import type { RefObject } from 'react'
import { BADGES } from '../../../data/classroom'
import type { Badge } from '../../../types/classroom'
import { BadgeMedal } from '../ui/BadgeMedal'
import { Popover } from '../ui/Popover'

type GiveBadgePopoverProps = {
  anchorRef: RefObject<HTMLElement | null>
  open: boolean
  onClose: () => void
  onGive: (badge: Badge) => void
  studentName: string
}

/**
 * "Coding badges" (docs/breakdown/06-give-badge.md). As in the reference the
 * panel is centred on the window, not on its trigger; the caret still points
 * at Give badge. Eight 104px slots fill the 840px width edge to edge.
 */
export function GiveBadgePopover({
  anchorRef,
  open,
  onClose,
  onGive,
  studentName,
}: GiveBadgePopoverProps) {
  return (
    <Popover
      anchorRef={anchorRef}
      open={open}
      onClose={onClose}
      caret
      gap={40}
      align="viewport"
      label="Coding badges"
      className="w-[min(840px,calc(100vw-16px))] rounded-[12px] bg-white shadow-[0_16px_48px_-12px_rgb(0_0_0/0.32),0_0_0_1px_rgb(0_0_0/0.04)]"
    >
      <div className="pb-[18px] pt-[19px]">
        <h2 className="text-ink px-[22px] text-[17px] font-medium leading-6">
          Coding badges
        </h2>
        <ul className="mt-0.5 flex flex-wrap justify-between gap-y-2 px-1 max-[860px]:justify-center">
          {BADGES.map((badge) => (
            <li key={badge.id}>
              <button
                type="button"
                onClick={() => onGive(badge)}
                aria-label={`Give ${badge.name} to ${studentName}`}
                className="press hover:bg-brand-soft group flex w-[104px] flex-col items-center rounded-[10px] px-1 pb-1.5 pt-0.5"
              >
                <span className="transition-transform duration-200 ease-out group-hover:-translate-y-0.5">
                  <BadgeMedal
                    icon={badge.icon}
                    ornament={badge.ornament}
                    size={104}
                  />
                </span>
                <span className="text-ink-soft -mt-1 text-center text-[13.5px] leading-[17px]">
                  {badge.name}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Popover>
  )
}
