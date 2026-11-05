type SegmentedControlProps<T extends string> = {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  /** Extra classes for the outer pill. */
  className?: string
  /** Padding and text size for each option. */
  buttonClassName: string
  /** Background and text colour for the selected option. */
  activeClassName: string
}

/** A row of toggle buttons where exactly one option is selected. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className = '',
  buttonClassName,
  activeClassName,
}: SegmentedControlProps<T>) {
  return (
    <div
      className={`inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm ${className}`}
    >
      {options.map((option) => {
        const isActive = option.value === value

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={isActive}
            className={`rounded-lg py-2 font-bold transition ${buttonClassName} ${
              isActive ? activeClassName : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
