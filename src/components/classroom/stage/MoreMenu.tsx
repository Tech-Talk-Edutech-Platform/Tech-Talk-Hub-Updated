import type { RefObject } from 'react'
import type { MenuAction } from '../../../types/classroom'
import { Popover } from '../ui/Popover'

type MoreMenuProps = {
  anchorRef: RefObject<HTMLElement | null>
  open: boolean
  onClose: () => void
  actions: MenuAction[]
}

/** The "…" menu in the room header. */
export function MoreMenu({ anchorRef, open, onClose, actions }: MoreMenuProps) {
  return (
    <Popover
      anchorRef={anchorRef}
      open={open}
      onClose={onClose}
      align="end"
      gap={8}
      role="menu"
      label="More options"
      className="w-[236px] rounded-[8px] bg-white py-1.5 shadow-[0_16px_40px_-12px_rgb(0_0_0/0.4)]"
    >
      {actions.map(({ id, label, icon: Icon, onSelect, danger, divider }) => (
        <div key={id}>
          {divider && <hr className="my-1.5 h-px border-0 bg-line" />}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onClose()
              onSelect()
            }}
            className={`press flex h-10 w-full items-center gap-3 px-3.5 text-left text-[14.5px] hover:bg-surface-2 ${
              danger ? 'text-danger-ink' : 'text-ink'
            }`}
          >
            <Icon
              size={17}
              strokeWidth={1.9}
              aria-hidden="true"
              className={danger ? '' : 'text-ink-soft'}
            />
            {label}
          </button>
        </div>
      ))}
    </Popover>
  )
}
