import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import type { LucideIcon } from 'lucide-react'

type ToolbarButtonProps = Omit<ComponentPropsWithoutRef<'button'>, 'type'> & {
  icon: LucideIcon
  label: string
  active?: boolean
  /** Unread count shown as a dot in the corner. */
  badge?: number
}

/**
 * Outlined toolbar button: 13px label, 13px icon. Labels wrap to two lines
 * when the bar gets tight. Forwards its ref so popovers (Give badge, Send
 * alert) can anchor to it; React 18 drops a plain `ref` prop.
 */
export const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  function ToolbarButton(
    { icon: Icon, label, active = false, badge, className = '', ...rest },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type="button"
        className={`press relative flex min-h-[28px] min-w-0 shrink items-center justify-center gap-1.5 rounded-[8px] border px-2.5 py-[3px] text-[13px] leading-[15px] max-md:shrink-0 max-md:whitespace-nowrap ${
          active
            ? 'border-brand/40 bg-brand-soft text-brand'
            : 'border-line-strong bg-white text-ink-soft hover:border-brand/30 hover:text-brand'
        } ${className}`}
        {...rest}
      >
        <Icon
          size={13}
          strokeWidth={2}
          className="shrink-0"
          aria-hidden="true"
        />
        <span className="text-center text-balance">{label}</span>
        {badge ? (
          <span className="absolute -top-2 -right-2 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent-pink px-1 text-[10.5px] leading-none font-semibold text-white tabular-nums">
            {badge}
          </span>
        ) : null}
      </button>
    )
  },
)
