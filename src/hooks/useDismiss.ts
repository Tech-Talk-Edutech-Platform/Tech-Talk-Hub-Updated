import { useEffect, useRef, type RefObject } from 'react'

/**
 * Calls `onDismiss` on Escape or on a pointer press outside every ref in `refs`.
 */
export function useDismiss(
  refs: RefObject<HTMLElement | null>[],
  onDismiss: () => void,
  active = true,
) {
  const callback = useRef(onDismiss)
  const targets = useRef(refs)
  useEffect(() => {
    callback.current = onDismiss
    targets.current = refs
  })

  useEffect(() => {
    if (!active) return undefined
    const onPointer = (event: PointerEvent) => {
      const target = event.target instanceof Node ? event.target : null
      const inside = targets.current.some((ref) =>
        ref.current?.contains(target),
      )
      if (!inside) callback.current()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') callback.current()
    }
    document.addEventListener('pointerdown', onPointer, true)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer, true)
      document.removeEventListener('keydown', onKey)
    }
  }, [active])
}
