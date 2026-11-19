import type { ReactNode } from 'react'

type ChartCardProps = {
  title: string
  subtitle?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
}

/** Titled dashboard panel for a chart, list or table. */
export function ChartCard({
  title,
  subtitle,
  action,
  children,
  className = '',
}: ChartCardProps) {
  return (
    <section
      className={`flex min-w-0 flex-col rounded-2xl border border-slate-100 bg-white shadow-xs dark:border-white/10 dark:bg-white/5 ${className}`}
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-white/10">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </div>
      <div className="flex-1 p-5">{children}</div>
    </section>
  )
}
