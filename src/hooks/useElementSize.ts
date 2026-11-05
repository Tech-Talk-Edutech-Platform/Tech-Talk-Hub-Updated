import { useEffect, useState, type RefObject } from 'react'

/** The element's content-box size, kept current with a ResizeObserver. */
export function useElementSize(ref: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const element = ref.current
    if (!element) return undefined
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      const { width, height } = entry.contentRect
      setSize((current) =>
        current.width === width && current.height === height
          ? current
          : { width, height },
      )
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])

  return size
}
