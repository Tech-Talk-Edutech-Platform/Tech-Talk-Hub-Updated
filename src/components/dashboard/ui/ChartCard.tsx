import type { ReactNode } from 'react'

/**
 * Body heights that match a filled panel, so a loading or empty panel keeps
 * the same size as one with data and rows stay level.
 */
const BODY_HEIGHTS = {
  chart: 'min-h-80',
  list: 'min-h-56',
  auto: '',
} as const

type ChartCardProps = {
  title: string
  subtitle?: ReactNode
  action?: ReactNode
  children: ReactNode
  /** Shows a skeleton of the same size instead of `children`. */
  loading?: boolean
  size?: keyof typeof BODY_HEIGHTS
  className?: string
}

/**
 * Titled dashboard panel for a chart, list or table. The body is a flex
 * column, so an `EmptyState` with `className="flex-1"` fills it.
 */
export function ChartCard({
  title,
  subtitle,
  action,
  children,
  loading = false,
  size = 'chart',
  className = '',
}: ChartCardProps) {
  return (
    <section
      aria-busy={loading || undefined}
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
      <div className={`flex flex-1 flex-col p-5 ${BODY_HEIGHTS[size]}`}>
        {loading ? (
          <div
            aria-hidden="true"
            className="flex-1 animate-pulse rounded-xl bg-slate-100 dark:bg-white/5"
          />
        ) : (
          children
        )}
      </div>
    </section>
  )
}
