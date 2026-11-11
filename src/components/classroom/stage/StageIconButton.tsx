import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import type { LucideIcon } from 'lucide-react'

type StageIconButtonProps = Omit<ComponentPropsWithoutRef<'button'>, 'type'> & {
  icon: LucideIcon
  label: string
  active?: boolean
  iconSize?: number
}

/** Square 40px button in the room header (stats, settings, more). */
export const StageIconButton = forwardRef<
  HTMLButtonElement,
  StageIconButtonProps
>(function StageIconButton(
  { icon: Icon, label, active = false, iconSize = 22, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={`press grid size-10 place-items-center rounded-[10px] ${
        active
          ? 'bg-white text-stage'
          : 'bg-stage-control text-white hover:bg-stage-control-hover'
      }`}
      {...rest}
    >
      <Icon size={iconSize} strokeWidth={2} aria-hidden="true" />
    </button>
  )
})
