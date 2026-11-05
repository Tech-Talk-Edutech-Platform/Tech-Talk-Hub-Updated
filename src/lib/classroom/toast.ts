// A tiny toast store: call toast('Saved') from anywhere, render <Toaster /> once.

export type ToastAction = { label: string; onClick: () => void }

export type ToastItem = {
  id: number
  message: string
  action?: ToastAction
  duration: number
}

type ToastOptions = { action?: ToastAction; duration?: number }

let toasts: ToastItem[] = []
const listeners = new Set<() => void>()
let nextId = 1

function emit() {
  for (const listener of listeners) listener()
}

export function toast(
  message: string,
  { action, duration = 3800 }: ToastOptions = {},
) {
  const id = nextId++
  toasts = [...toasts.slice(-2), { id, message, action, duration }]
  emit()
  return id
}

export function dismissToast(id: number) {
  toasts = toasts.filter((item) => item.id !== id)
  emit()
}

export function subscribeToasts(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getToasts() {
  return toasts
}
