import type { ReactNode } from 'react'

type FormFieldProps = {
  /** The `id` of the control inside, so the label is linked to it. */
  id: string
  label: string
  className?: string
  children: ReactNode
}

/** A label stacked above a form control. */
export function FormField({ id, label, className, children }: FormFieldProps) {
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-semibold text-slate-700"
      >
        {label}
      </label>

      {children}
    </div>
  )
}
