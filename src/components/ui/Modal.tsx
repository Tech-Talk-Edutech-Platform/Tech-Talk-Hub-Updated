import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Button } from './Button'

type ModalProps = {
  title: string
  /** Accessible name for the × close button. */
  closeLabel: string
  onClose: () => void
  children: ReactNode
  size?: 'default' | 'wide' | 'compact'
}

/** Centred dialog over a blurred backdrop. Closes on backdrop click, × or Escape. */
export function Modal({
  title,
  closeLabel,
  onClose,
  children,
  size = 'default',
}: ModalProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
    return () => {
      if (dialog?.open) dialog.close()
    }
  }, [])

  const dismiss = () => {
    dialogRef.current?.close()
    onClose()
  }

  return (
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- backdrop click to close; Escape (onCancel) is the keyboard equivalent
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby={titleId}
      className={`m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto rounded-3xl border-0 bg-white text-slate-900 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm ${size === 'default' ? 'max-w-md p-8' : `p-5 sm:p-8 dark:bg-slate-900 dark:text-white ${size === 'wide' ? 'max-w-xl' : 'max-w-md'}`}`}
      onCancel={(event) => {
        event.preventDefault()
        dismiss()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          dismiss()
        }
      }}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <h2 id={titleId} className="text-xl font-bold">
          {title}
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={dismiss}
          aria-label={closeLabel}
          className="-mt-2 -mr-2 shrink-0 rounded-full text-slate-400"
        >
          &times;
        </Button>
      </div>
      {children}
    </dialog>
  )
}
