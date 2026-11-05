import type { ComponentPropsWithRef } from 'react'
import type { LucideIcon } from 'lucide-react'

type StageIconButtonProps = Omit<ComponentPropsWithRef<'button'>, 'type'> & {
  icon: LucideIcon
  label: string
  active?: boolean
  iconSize?: number
}

/** Square 40px button in the room header (stats, settings, more). */
export function StageIconButton({
  icon: Icon,
  label,
  active = false,
  ref,
  iconSize = 22,
  ...rest
}: StageIconButtonProps) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={`press grid size-10 place-items-center rounded-[6px] ${
        active
          ? 'text-stage bg-white'
          : 'bg-stage-control hover:bg-stage-control-hover text-white'
      }`}
      {...rest}
    >
      <Icon size={iconSize} strokeWidth={2} aria-hidden="true" />
    </button>
  )
}
