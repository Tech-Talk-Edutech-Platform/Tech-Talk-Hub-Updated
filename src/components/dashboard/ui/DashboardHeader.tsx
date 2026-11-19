import type { ReactNode } from 'react'
import { CalendarDays } from 'lucide-react'
import { isPeriodId, PERIODS, type PeriodId } from '../period'

type DashboardHeaderProps = {
  title: ReactNode
  subtitle?: ReactNode
  period?: PeriodId
  onPeriodChange?: (period: PeriodId) => void
  actions?: ReactNode
}

/** Dashboard page title with an optional reporting-period picker and actions. */
export function DashboardHeader({
  title,
  subtitle,
  period,
  onPeriodChange,
  actions,
}: DashboardHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {period && onPeriodChange && (
          <label className="relative inline-flex items-center">
            <span className="sr-only">Reporting period</span>
            <CalendarDays
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 text-slate-400"
            />
            <select
              value={period}
              onChange={(event) => {
                if (isPeriodId(event.target.value))
                  onPeriodChange(event.target.value)
              }}
              className="min-h-10 rounded-xl border border-slate-200 bg-white py-2 pr-8 pl-9 text-sm font-semibold text-slate-700 shadow-xs focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
            >
              {PERIODS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        )}
        {actions}
      </div>
    </header>
  )
}
