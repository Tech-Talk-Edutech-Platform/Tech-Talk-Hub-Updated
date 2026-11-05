import { useSyncExternalStore } from 'react'
import { getToasts, subscribeToasts } from '../../../lib/classroom/toast'
import { Toast } from './Toast'

type ToasterProps = { className?: string }

/** Render once inside the surface the toasts should centre on. */
export function Toaster({ className = '' }: ToasterProps) {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts)
  return (
    <div
      aria-live="polite"
      className={`pointer-events-none absolute left-1/2 z-40 flex -translate-x-1/2 flex-col items-center gap-2 ${className}`}
    >
      {toasts.map((item) => (
        <Toast key={item.id} item={item} />
      ))}
    </div>
  )
}
