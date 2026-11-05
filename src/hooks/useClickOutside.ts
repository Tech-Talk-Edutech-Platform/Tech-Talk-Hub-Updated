import { useEffect, type RefObject } from 'react'

/** Calls `onClickOutside` when the user presses the mouse outside `ref`. */
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  onClickOutside: () => void,
) {
  useEffect(() => {
    function handleMouseDown(event: MouseEvent) {
      if (
        ref.current &&
        event.target instanceof Node &&
        !ref.current.contains(event.target)
      ) {
        onClickOutside()
      }
    }

    document.addEventListener('mousedown', handleMouseDown)

    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [ref, onClickOutside])
}
