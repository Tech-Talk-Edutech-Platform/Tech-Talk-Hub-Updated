import { useRef, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import {
  useAnchoredPosition,
  type AnchorAlign,
  type AnchorPlacement,
} from '../../../hooks/useAnchoredPosition'
import { useDismiss } from '../../../hooks/useDismiss'

type PopoverProps = {
  anchorRef: RefObject<HTMLElement | null>
  open: boolean
  onClose: () => void
  placement?: AnchorPlacement
  align?: AnchorAlign
  gap?: number
  caret?: boolean
  label: string
  role?: 'dialog' | 'menu'
  className?: string
  children: ReactNode
}

/**
 * Floating panel anchored to a trigger. Rendered in a portal with
 * position: fixed so it is never clipped by the toolbar or the stage.
 */
export function Popover({
  anchorRef,
  open,
  onClose,
  placement = 'bottom',
  align = 'center',
  gap = 10,
  caret = false,
  label,
  role = 'dialog',
  className = '',
  children,
}: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null)
  const pos = useAnchoredPosition(anchorRef, ref, open, {
    placement,
    gap,
    align,
  })
  useDismiss([ref, anchorRef], onClose, open)

  if (!open) return null

  return createPortal(
    <div
      ref={ref}
      role={role}
      aria-label={label}
      className={`pop fixed z-50 ${className}`}
      style={{
        top: pos?.top ?? 0,
        left: pos?.left ?? 0,
        transformOrigin: pos?.origin,
        visibility: pos ? 'visible' : 'hidden',
      }}
    >
      {caret && pos && (
        <span
          aria-hidden="true"
          className="absolute size-3.5 rotate-45 rounded-[2px] bg-white"
          style={
            placement === 'top'
              ? { left: pos.caretX - 7, bottom: -6 }
              : { left: pos.caretX - 7, top: -6 }
          }
        />
      )}
      <div className="relative">{children}</div>
    </div>,
    document.body,
  )
}
