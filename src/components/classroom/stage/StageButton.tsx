import type { ComponentPropsWithRef } from 'react'
import type { LucideIcon } from 'lucide-react'

type StageTone = 'muted' | 'dark' | 'active'

/** 'muted' (orange, device off), 'dark' (translucent black), 'active' (white, on). */
const TONES: Record<StageTone, string> = {
  muted: 'bg-stage-muted text-white group-hover:bg-stage-muted-hover',
  dark: 'bg-stage-control text-white group-hover:bg-stage-control-hover',
  active: 'bg-white text-stage group-hover:bg-white/90',
}

type StageButtonProps = Omit<ComponentPropsWithRef<'button'>, 'type'> & {
  icon: LucideIcon
  label: string
  tone?: StageTone
  busy?: boolean
}

/** Bottom control from the reference: 48px square, 8px radius, label underneath. */
export function StageButton({
  icon: Icon,
  label,
  tone = 'dark',
  busy = false,
  ref,
  ...rest
}: StageButtonProps) {
  return (
    <button
      ref={ref}
      type="button"
      aria-busy={busy || undefined}
      className="group flex w-12 flex-col items-center gap-[5px] outline-none"
      {...rest}
    >
      <span
        className={`press grid size-12 place-items-center rounded-[8px] group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-white group-active:scale-[0.96] ${TONES[tone]} ${busy ? 'opacity-70' : ''}`}
      >
        <Icon size={24} strokeWidth={1.75} aria-hidden="true" />
      </span>
      <span className="text-[12.5px] leading-4 text-white/90 [text-shadow:0_1px_2px_rgb(0_0_0/0.25)]">
        {label}
      </span>
    </button>
  )
}
