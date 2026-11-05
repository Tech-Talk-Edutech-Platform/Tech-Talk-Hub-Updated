import { useLayoutEffect, useState, type RefObject } from 'react'

const MARGIN = 8

export type AnchorPlacement = 'top' | 'bottom'

/** 'viewport' centres the panel on the window while the caret still points at the trigger. */
export type AnchorAlign = 'start' | 'center' | 'end' | 'viewport'

export type AnchoredPosition = {
  top: number
  left: number
  /** Where the caret sits, in px from the panel's left edge. */
  caretX: number
  /** CSS transform-origin, so the panel scales out of its trigger. */
  origin: string
}

type AnchorOptions = {
  placement?: AnchorPlacement
  gap?: number
  align?: AnchorAlign
}

function alignedLeft(
  anchor: DOMRect,
  width: number,
  viewportWidth: number,
  align: AnchorAlign,
) {
  if (align === 'start') return anchor.left
  if (align === 'end') return anchor.right - width
  if (align === 'viewport') return (viewportWidth - width) / 2
  return anchor.left + anchor.width / 2 - width / 2
}

/**
 * Positions a floating element (position: fixed) next to its trigger, clamped to
 * the viewport. Returns the position plus where the caret and transform-origin go,
 * so the popover scales out of its trigger (emil: origin-aware popovers).
 */
export function useAnchoredPosition(
  anchorRef: RefObject<HTMLElement | null>,
  floatingRef: RefObject<HTMLElement | null>,
  open: boolean,
  { placement = 'bottom', gap = 10, align = 'center' }: AnchorOptions = {},
) {
  const [pos, setPos] = useState<AnchoredPosition | null>(null)

  useLayoutEffect(() => {
    if (!open) return undefined
    const update = () => {
      const anchor = anchorRef.current?.getBoundingClientRect()
      const floating = floatingRef.current
      if (!anchor || !floating) return
      const w = floating.offsetWidth
      const h = floating.offsetHeight
      const vw = window.innerWidth
      const vh = window.innerHeight
      const anchorX = anchor.left + anchor.width / 2

      const left = Math.min(
        Math.max(alignedLeft(anchor, w, vw, align), MARGIN),
        vw - w - MARGIN,
      )
      const top = Math.min(
        Math.max(
          placement === 'top' ? anchor.top - gap - h : anchor.bottom + gap,
          MARGIN,
        ),
        vh - h - MARGIN,
      )
      const caretX = Math.min(Math.max(anchorX - left, 16), w - 16)

      setPos({
        top,
        left,
        caretX,
        origin: `${caretX}px ${placement === 'top' ? '100%' : '0%'}`,
      })
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open, anchorRef, floatingRef, placement, gap, align])

  return open ? pos : null
}
