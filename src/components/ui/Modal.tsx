import { useEffect, useId, type ReactNode } from 'react'

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

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <dialog
        open
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full text-2xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          &times;
        </button>

        <h3 id={titleId} className="mb-4 text-xl font-bold text-slate-900">
          {title}
        </h3>

        {children}
      </dialog>
    </div>
  )
}
