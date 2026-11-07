import type { ComponentPropsWithRef } from 'react'
import type { LucideIcon } from 'lucide-react'

type ToolbarButtonProps = Omit<ComponentPropsWithRef<'button'>, 'type'> & {
  icon: LucideIcon
  label: string
  active?: boolean
  /** Unread count shown as a dot in the corner. */
  badge?: number
}

/**
 * Outlined toolbar button from the reference: 13px label, 13px icon, 4px radius.
 * Labels wrap to two lines when the bar gets tight (as in the recording at 1280px).
 */
export function ToolbarButton({
  icon: Icon,
  label,
  active = false,
  badge,
  ref,
  className = '',
  ...rest
}: ToolbarButtonProps) {
  return (
    <button
      ref={ref}
      type="button"
      className={`press relative flex min-h-[26px] min-w-0 shrink items-center justify-center gap-1 rounded-[4px] border bg-white px-2 py-[3px] text-[13px] leading-[15px] max-md:shrink-0 max-md:whitespace-nowrap ${
        active
          ? 'border-brand text-brand'
          : 'border-line-strong text-ink-soft hover:border-faint hover:text-ink'
      } ${className}`}
      {...rest}
    >
      <Icon size={13} strokeWidth={2} className="shrink-0" aria-hidden="true" />
      <span className="text-center text-balance">{label}</span>
      {badge ? (
        <span className="absolute -top-2 -right-2 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brand px-1 text-[10.5px] leading-none font-semibold text-white tabular-nums">
          {badge}
        </span>
      ) : null}
    </button>
  )
}
