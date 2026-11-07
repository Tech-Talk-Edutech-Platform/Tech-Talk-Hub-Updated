import { useEffect, useRef } from 'react'
import { dismissToast, type ToastItem } from '../../../lib/classroom/toast'

type ToastProps = { item: ToastItem }

type TimerControls = { pause: () => void; resume: () => void }

const NO_TIMER: TimerControls = { pause: () => {}, resume: () => {} }

/** One toast. Its timer pauses on hover and while the tab is hidden. */
export function Toast({ item }: ToastProps) {
  const controls = useRef(NO_TIMER)
  const { id, duration, action } = item

  useEffect(() => {
    const timer = { remaining: duration, startedAt: 0, handle: 0 }
    const pause = () => {
      clearTimeout(timer.handle)
      timer.remaining -= Date.now() - timer.startedAt
    }
    const resume = () => {
      timer.startedAt = Date.now()
      clearTimeout(timer.handle)
      timer.handle = window.setTimeout(
        () => dismissToast(id),
        Math.max(800, timer.remaining),
      )
    }
    controls.current = { pause, resume }
    resume()
    // Sonner principle: don't let toasts expire while the tab is hidden.
    const onVisibilityChange = () => {
      if (document.hidden) pause()
      else resume()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      clearTimeout(timer.handle)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [id, duration])

  return (
    <output
      onPointerEnter={() => controls.current.pause()}
      onPointerLeave={() => controls.current.resume()}
      className="pointer-events-auto flex max-w-[min(440px,calc(100vw-32px))] items-center gap-4 rounded-[4px] bg-toast px-5 py-3 text-[13.5px] leading-5 text-white shadow-[0_8px_24px_-8px_rgb(0_0_0/0.45)] motion-safe:animate-[toast-in_220ms_var(--ease-out)]"
    >
      <span>{item.message}</span>
      {action && (
        <button
          type="button"
          onClick={() => {
            action.onClick()
            dismissToast(id)
          }}
          className="press -my-1 shrink-0 rounded px-1.5 py-1 font-semibold text-brand-faded hover:text-white"
        >
          {action.label}
        </button>
      )}
    </output>
  )
}
