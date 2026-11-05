import { useEffect, useState } from 'react'

export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: unknown }

/**
 * Runs `load` once on mount and tracks its result.
 *
 * `load` must be a stable reference (e.g. a module-level function) — a new
 * function on every render would re-run the request every render.
 */
export function useAsyncData<T>(load: () => Promise<T>): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    load().then(
      (data) => {
        if (!cancelled) {
          setState({ status: 'success', data })
        }
      },
      (error: unknown) => {
        if (!cancelled) {
          setState({ status: 'error', error })
        }
      },
    )

    return () => {
      cancelled = true
    }
  }, [load])

  return state
}
