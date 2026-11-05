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
      className="panel-in flex w-[20%] min-w-[248px] max-w-[340px] shrink-0 flex-col bg-white max-lg:absolute max-lg:inset-y-0 max-lg:right-0 max-lg:z-30 max-lg:w-[min(340px,100%)] max-lg:max-w-none max-lg:shadow-[-16px_0_40px_-16px_rgb(0_0_0/0.35)]"
    >
      <div className="border-line flex h-[47px] shrink-0 items-center justify-between border-b pl-[9px] pr-2">
        <h2
          id={labelId}
          className="text-ink text-[19px] font-semibold leading-6"
        >
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={`Close ${title}`}
          className="press text-ink hover:bg-surface-2 grid size-8 place-items-center rounded-md"
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
