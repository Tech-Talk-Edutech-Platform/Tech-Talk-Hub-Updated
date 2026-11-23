import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

type ModalProps = {
  open: boolean
  onClose: () => void
  /** Max width in px. */
  width?: number
  labelledBy: string
  padding?: string
  closeLabel?: string
  /**
   * Long forms: sits near the top instead of the centre, so it doesn't jump
   * as options open.
   */
  tall?: boolean
  children: ReactNode
}

/**
 * Native <dialog> modal: focus trap, Escape and top layer for free. Stays
 * mounted so the close transition can play; remount it with a `key` to reset.
 *
 * Never taller than the window: on a short or zoomed-in screen the modal
 * scrolls inside, and the close button stays pinned at its top corner.
 */
export function Modal({
  open,
  onClose,
  width = 512,
  labelledBy,
  padding = 'p-10',
  closeLabel = 'Close',
  tall = false,
  children,
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- backdrop click to close; Escape (onCancel) is the keyboard equivalent
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      className={`modal w-[calc(100%-32px)] max-w-none [scrollbar-width:thin] [scrollbar-color:var(--color-line-strong)_transparent] overflow-y-auto overscroll-contain rounded-[8px] bg-white p-0 text-ink shadow-[0_24px_64px_-16px_rgb(0_0_0/0.4)] ${
        tall
          ? 'mx-auto mt-[max(16px,8dvh)] mb-auto max-h-[calc(100dvh_-_max(16px,8dvh)_-_16px)]'
          : 'm-auto max-h-[calc(100dvh-32px)]'
      }`}
      style={{ maxWidth: width }}
    >
      {/* Zero height, so it takes no room: just keeps the button in reach. */}
      <div className="sticky top-0 z-10 flex h-0 justify-end">
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="press mt-[18px] mr-[18px] grid size-9 shrink-0 place-items-center rounded-md bg-white/90 text-ink-soft hover:bg-surface-2 hover:text-ink"
        >
          <X size={24} strokeWidth={1.75} />
        </button>
      </div>
      <div className={`relative ${padding} max-sm:px-6 max-sm:py-8`}>
        {children}
      </div>
    </dialog>
  )
}
