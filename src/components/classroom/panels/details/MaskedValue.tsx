import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

const MASK = '*********'

type MaskedValueProps = {
  value: string
  /** Used in the show/hide button's label ("Show phone number"). */
  label: string
}

/** A private value hidden behind asterisks until the eye button is pressed. */
export function MaskedValue({ value, label }: MaskedValueProps) {
  const [shown, setShown] = useState(false)
  return (
    <>
      <span className={shown ? 'break-all' : 'tracking-[0.04em]'}>
        {shown ? value : MASK}
      </span>
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-label={shown ? `Hide ${label}` : `Show ${label}`}
        className="press text-ink-soft hover:text-ink ml-1 inline-grid size-5 place-items-center rounded align-middle"
      >
        {shown ? (
          <EyeOff size={13} aria-hidden="true" />
        ) : (
          <Eye size={13} aria-hidden="true" />
        )}
      </button>
    </>
  )
}
