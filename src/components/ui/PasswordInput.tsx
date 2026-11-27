import { forwardRef, useState, type ComponentPropsWithoutRef } from 'react'
import { Eye, EyeOff } from 'lucide-react'

type PasswordInputProps = Omit<ComponentPropsWithoutRef<'input'>, 'type'> & {
  /** Classes for the input itself; room for the eye button is added. */
  className?: string
}

/**
 * A password box with a show/hide button. The input keeps its autocomplete
 * hint whichever way it's showing, so password managers still offer to save
 * and fill it. Forwards its ref for react-hook-form's `register`.
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ className = '', ...inputProps }, ref) {
    const [visible, setVisible] = useState(false)
    return (
      <div className="relative">
        <input
          ref={ref}
          type={visible ? 'text' : 'password'}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className={`${className} pr-12`}
          {...inputProps}
        />
        <button
          type="button"
          onClick={() => setVisible((shown) => !shown)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          title={visible ? 'Hide password' : 'Show password'}
          className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-xl text-slate-400 transition hover:text-slate-700 focus-visible:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-purple-500 dark:hover:text-white"
        >
          {visible ? (
            <EyeOff size={18} aria-hidden="true" />
          ) : (
            <Eye size={18} aria-hidden="true" />
          )}
        </button>
      </div>
    )
  },
)
