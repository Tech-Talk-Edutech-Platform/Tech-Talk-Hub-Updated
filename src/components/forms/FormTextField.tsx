import type { InputHTMLAttributes } from 'react'
import {
  useFormContext,
  type FieldPath,
  type FieldValues,
  type RegisterOptions,
} from 'react-hook-form'

type FormTextFieldProps<TValues extends FieldValues> = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'name'
> & {
  name: FieldPath<TValues>
  label: string
  rules?: RegisterOptions<TValues, FieldPath<TValues>>
}

/** Accessible text input for a form wrapped in React Hook Form's FormProvider. */
export function FormTextField<TValues extends FieldValues>({
  name,
  label,
  rules,
  id,
  ...inputProps
}: FormTextFieldProps<TValues>) {
  const { register, getFieldState, formState } = useFormContext<TValues>()
  const error = getFieldState(name, formState).error
  const inputId = id ?? `field-${String(name).replace(/[^a-zA-Z0-9_-]/g, '-')}`
  const errorId = `${inputId}-error`

  return (
    <div>
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <input
        {...inputProps}
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : inputProps['aria-describedby']}
        {...register(name, rules)}
      />
      <FormFieldError id={errorId} message={error?.message} />
    </div>
  )
}

type FormFieldErrorProps = {
  id: string
  message?: string
}

export function FormFieldError({ id, message }: FormFieldErrorProps) {
  if (!message) return null

  return (
    <p id={id} role="alert" className="mt-1 text-xs text-red-600">
      {message}
    </p>
  )
}
