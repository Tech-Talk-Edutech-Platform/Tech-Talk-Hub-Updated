import type { RefObject } from 'react'
import type { Badge } from '../../../types/classroom'
import { BadgeMedal } from '../ui/BadgeMedal'
import { Popover } from '../ui/Popover'

type GiveBadgePopoverProps = {
  anchorRef: RefObject<HTMLElement | null>
  open: boolean
  onClose: () => void
  onGive: (badge: Badge) => void
  badges: Badge[]
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
  badges,
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
      className="w-[min(840px,calc(100vw-16px))] rounded-[16px] bg-white shadow-[0_16px_48px_-12px_rgb(15_23_42/0.4),0_0_0_1px_rgb(15_23_42/0.05)]"
    >
      <div className="pt-[19px] pb-[18px]">
        <h2 className="px-[22px] text-[17px] leading-6 font-semibold text-ink">
          Coding badges
          <span className="ml-2 text-[14px] font-normal text-muted">
            for {studentName}
          </span>
        </h2>
        {!badges.length && (
          <p className="mx-[22px] mt-3 rounded-[10px] border border-dashed border-line-strong px-3 py-3 text-[13.5px] text-muted">
            No badges are set up yet. Add them in Dashboard › Classroom ›
            Badges.
          </p>
        )}
        <ul className="mt-0.5 flex flex-wrap justify-between gap-y-2 px-1 max-[860px]:justify-center">
          {badges.map((badge) => (
            <li key={badge.id}>
              <button
                type="button"
                onClick={() => onGive(badge)}
                aria-label={`Give ${badge.name} to ${studentName}`}
                className="press group flex w-[104px] flex-col items-center rounded-[10px] px-1 pt-0.5 pb-1.5 hover:bg-brand-soft"
              >
                <span className="transition-transform duration-200 ease-out group-hover:-translate-y-0.5">
                  <BadgeMedal
                    icon={badge.icon}
                    ornament={badge.ornament}
                    size={104}
                  />
                </span>
                <span className="-mt-1 text-center text-[13.5px] leading-[17px] text-ink-soft">
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
