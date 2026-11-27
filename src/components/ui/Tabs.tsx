import type { KeyboardEvent, ReactNode } from 'react'

type Tab<T extends string> = {
  value: T
  label: string
  /** Small count shown after the label, e.g. how many classes. */
  count?: number
}

type TabsProps<T extends string> = {
  /** Prefix for the tab and panel ids; unique on the page. */
  id: string
  label: string
  tabs: Tab<T>[]
  value: T
  onChange: (value: T) => void
  children: ReactNode
}

/**
 * Accessible tabs: a tab list (arrow keys move between tabs) and the panel
 * for the selected one.
 */
export function Tabs<T extends string>({
  id,
  label,
  tabs,
  value,
  onChange,
  children,
}: TabsProps<T>) {
  const move = (event: KeyboardEvent<HTMLDivElement>) => {
    const step =
      event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    event.preventDefault()
    const index = tabs.findIndex((tab) => tab.value === value)
    const next = tabs[(index + step + tabs.length) % tabs.length]
    onChange(next.value)
    document.getElementById(`${id}-tab-${next.value}`)?.focus()
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label={label}
        tabIndex={-1}
        onKeyDown={move}
        className="mb-5 inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-xs dark:border-white/10 dark:bg-white/5"
      >
        {tabs.map((tab) => {
          const selected = tab.value === value
          return (
            <button
              key={tab.value}
              id={`${id}-tab-${tab.value}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${id}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(tab.value)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-purple-500 ${
                selected
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/10'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] tabular-nums ${
                    selected
                      ? 'bg-white/20'
                      : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>
      <div
        id={`${id}-panel`}
        role="tabpanel"
        aria-labelledby={`${id}-tab-${value}`}
      >
        {children}
      </div>
    </div>
  )
}
