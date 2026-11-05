import type { ReactNode } from 'react'
import { X } from 'lucide-react'

type SidePanelProps = {
  title: string
  labelId: string
  onClose: () => void
  footer?: ReactNode
  children: ReactNode
}

/**
 * The right-hand panel: 20% of the width like the reference (258px at 1294px),
 * an overlay drawer below 1024px so the room keeps its width.
 */
export function SidePanel({
  title,
  labelId,
  onClose,
  footer,
  children,
}: SidePanelProps) {
  return (
    <aside
      aria-labelledby={labelId}
      className="panel-in flex w-[20%] max-w-[340px] min-w-[248px] shrink-0 flex-col bg-white max-lg:absolute max-lg:inset-y-0 max-lg:right-0 max-lg:z-30 max-lg:w-[min(340px,100%)] max-lg:max-w-none max-lg:shadow-[-16px_0_40px_-16px_rgb(0_0_0/0.35)]"
    >
      <div className="flex h-[47px] shrink-0 items-center justify-between border-b border-line pr-2 pl-[9px]">
        <h2
          id={labelId}
          className="text-[19px] leading-6 font-semibold text-ink"
        >
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={`Close ${title}`}
          className="press grid size-8 place-items-center rounded-md text-ink hover:bg-surface-2"
        >
          <X size={22} strokeWidth={2.25} aria-hidden="true" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {children}
      </div>
      {footer}
    </aside>
  )
}
