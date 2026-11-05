import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Button } from './Button'

type ModalProps = {
  title: string
  /** Accessible name for the × close button. */
  closeLabel: string
  onClose: () => void
  children: ReactNode
}

/** Centred dialog over a blurred backdrop. Closes on backdrop click, × or Escape. */
export function Modal({ title, closeLabel, onClose, children }: ModalProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
    return () => {
      if (dialog?.open) dialog.close()
    }
  }, [])

  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby={titleId}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-3xl border-0 bg-white p-8 text-slate-900 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
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
          onClick={onClose}
          aria-label={closeLabel}
          className="-mr-2 -mt-2 shrink-0 rounded-full text-slate-400"
        >
          &times;
        </Button>
      </div>
      {children}
    </dialog>
  )
}
