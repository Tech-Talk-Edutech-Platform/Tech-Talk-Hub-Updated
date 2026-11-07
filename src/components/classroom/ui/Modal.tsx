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
  children: ReactNode
}

/**
 * Native <dialog> modal: focus trap, Escape and top layer for free. Stays
 * mounted so the close transition can play; remount it with a `key` to reset.
 */
export function Modal({
  open,
  onClose,
  width = 512,
  labelledBy,
  padding = 'p-10',
  closeLabel = 'Close',
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
      className="modal m-auto w-[calc(100%-32px)] max-w-none overflow-visible rounded-[8px] bg-white p-0 text-ink shadow-[0_24px_64px_-16px_rgb(0_0_0/0.4)]"
      style={{ maxWidth: width }}
    >
      <div className={`relative ${padding} max-sm:px-6 max-sm:py-8`}>
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="press absolute top-[18px] right-[18px] grid size-9 place-items-center rounded-md text-ink-soft hover:bg-surface-2 hover:text-ink"
        >
          <X size={24} strokeWidth={1.75} />
        </button>
        {children}
      </div>
    </dialog>
  )
}
