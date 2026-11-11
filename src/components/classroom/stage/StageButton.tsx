import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import type { LucideIcon } from 'lucide-react'

type StageTone = 'muted' | 'dark' | 'active'

/** 'muted' (pink, device off), 'dark' (translucent), 'active' (white, on). */
const TONES: Record<StageTone, string> = {
  muted: 'bg-stage-muted text-white group-hover:bg-stage-muted-hover',
  dark: 'bg-stage-control text-white group-hover:bg-stage-control-hover',
  active: 'bg-white text-stage group-hover:bg-white/90',
}

type StageButtonProps = Omit<ComponentPropsWithoutRef<'button'>, 'type'> & {
  icon: LucideIcon
  label: string
  tone?: StageTone
  busy?: boolean
}

/**
 * Bottom control: 48px square, label underneath. Forwards its ref so the
 * React popover can anchor to it.
 */
export const StageButton = forwardRef<HTMLButtonElement, StageButtonProps>(
  function StageButton(
    { icon: Icon, label, tone = 'dark', busy = false, ...rest },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type="button"
        aria-busy={busy || undefined}
        className="group flex w-12 flex-col items-center gap-[5px] outline-none"
        {...rest}
      >
        <span
          className={`press grid size-12 place-items-center rounded-[12px] group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-white group-active:scale-[0.96] ${TONES[tone]} ${busy ? 'opacity-70' : ''}`}
        >
          <Icon size={24} strokeWidth={1.75} aria-hidden="true" />
        </span>
        <span className="text-[12.5px] leading-4 text-white/90 [text-shadow:0_1px_2px_rgb(0_0_0/0.25)]">
          {label}
        </span>
      </button>
    )
  },
)
