import type { InputHTMLAttributes } from 'react'

import { FORM_CONTROL_CLASS } from './formControlClass'
import { FormField } from './FormField'

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  id: string
  label: string
  /** Classes for the wrapper (e.g. grid placement), not the input. */
  className?: string
}

/** A labelled single-line input in the site's form style. */
export function TextField({
  id,
  label,
  className,
  ...inputProps
}: TextFieldProps) {
  return (
    <FormField id={id} label={label} className={className}>
      <input
        id={id}
        className={`h-12 text-slate-800 placeholder:text-slate-400 ${FORM_CONTROL_CLASS}`}
        {...inputProps}
      />
    </FormField>
  )
}
