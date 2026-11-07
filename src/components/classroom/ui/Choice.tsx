import type { InputHTMLAttributes, ReactNode } from 'react'
import { Check } from 'lucide-react'

type ChoiceProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'size' | 'className'
> & {
  label: ReactNode
  /** Under the label, in muted text. */
  hint?: ReactNode
  /** `sm` is for options nested under a parent choice. */
  size?: 'md' | 'sm'
}

const SIZES = {
  md: {
    box: 'mt-0.5 size-5',
    tick: 13,
    label: 'text-[15px] leading-6 text-ink',
  },
  sm: {
    box: 'mt-[3px] size-4',
    tick: 10,
    label: 'text-[14px] leading-[22px] text-ink-soft',
  },
}

/**
 * A native checkbox or radio drawn in the brand colour: an outlined box that
 * fills and shows a white tick when chosen. Keyboard, focus and grouping stay
 * the browser's own.
 */
function Choice({
  type,
  label,
  hint,
  size = 'md',
  ...input
}: ChoiceProps & { type: 'checkbox' | 'radio' }) {
  const s = SIZES[size]
  return (
    <label className="group flex cursor-pointer items-start gap-3">
      <span className={`relative grid shrink-0 place-items-center ${s.box}`}>
        <input
          type={type}
          className={`peer absolute inset-0 m-0 cursor-pointer appearance-none border-[1.5px] border-line-strong bg-white transition-[background-color,border-color] duration-150 ease-out group-hover:not-checked:border-muted checked:border-brand checked:bg-brand ${
            type === 'radio' ? 'rounded-full' : 'rounded-[4px]'
          }`}
          {...input}
        />
        <Check
          size={s.tick}
          strokeWidth={3.25}
          aria-hidden="true"
          className="pointer-events-none relative scale-50 text-white opacity-0 transition-[opacity,transform] duration-150 ease-out peer-checked:scale-100 peer-checked:opacity-100"
        />
      </span>
      <span className={s.label}>
        {label}
        {hint && (
          <span className="mt-0.5 block text-[13px] leading-5 text-muted">
            {hint}
          </span>
        )}
      </span>
    </label>
  )
}

export function Checkbox(props: ChoiceProps) {
  return <Choice type="checkbox" {...props} />
}

export function Radio(props: ChoiceProps) {
  return <Choice type="radio" {...props} />
}
