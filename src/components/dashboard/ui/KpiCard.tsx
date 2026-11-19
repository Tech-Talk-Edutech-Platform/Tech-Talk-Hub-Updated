import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'

const ACCENTS = {
  purple:
    'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-300',
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300',
  green:
    'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300',
} as const

export type KpiAccent = keyof typeof ACCENTS

type KpiCardProps = {
  title: string
  value: ReactNode
  icon?: LucideIcon
  accent?: KpiAccent
  /** Percentage change against the previous period; null when unknown. */
  change?: number | null
  changeLabel?: string
  /** Set when a fall is good news, such as overdue homework. */
  lowerIsBetter?: boolean
  /** Shown instead of a change line. */
  hint?: ReactNode
  loading?: boolean
}

/** Dashboard headline number with an optional change against the previous period. */
export function KpiCard({
  title,
  value,
  icon: Icon,
  accent = 'purple',
  change,
  changeLabel = 'vs previous period',
  lowerIsBetter = false,
  hint,
  loading = false,
}: KpiCardProps) {
  const good =
    change === null || change === undefined || change === 0
      ? null
      : change > 0 !== lowerIsBetter

  return (
    <article className="flex h-full min-w-0 flex-col rounded-2xl border border-slate-100 bg-white shadow-xs dark:border-white/10 dark:bg-white/5">
      <h3 className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-3.5 text-sm font-semibold text-slate-600 dark:border-white/10 dark:text-slate-300">
        {Icon && (
          <span
            aria-hidden="true"
            className={`inline-flex rounded-lg p-1.5 ${ACCENTS[accent]}`}
          >
            <Icon size={16} />
          </span>
        )}
        {title}
      </h3>
      <div className="px-5 py-4">
        {loading ? (
          <div className="space-y-2" aria-hidden="true">
            <div className="h-8 w-24 animate-pulse rounded-lg bg-slate-100 dark:bg-white/10" />
            <div className="h-3 w-32 animate-pulse rounded bg-slate-100 dark:bg-white/10" />
          </div>
        ) : (
          <>
            <p className="text-3xl font-black tracking-tight text-slate-900 tabular-nums dark:text-white">
              {value}
            </p>
            <p className="mt-1 min-h-4 text-xs leading-4 text-slate-500 dark:text-slate-400">
              {hint ??
                (change === undefined ? null : change === null ? (
                  'No earlier data to compare'
                ) : (
                  <>
                    <span
                      className={`inline-flex items-center gap-0.5 font-bold ${
                        good === null
                          ? 'text-slate-500 dark:text-slate-400'
                          : good
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {change > 0 ? (
                        <ArrowUpRight size={14} aria-hidden="true" />
                      ) : change < 0 ? (
                        <ArrowDownRight size={14} aria-hidden="true" />
                      ) : null}
                      {change > 0 ? '+' : ''}
                      {change}%
                    </span>{' '}
                    {changeLabel}
                  </>
                ))}
            </p>
          </>
        )}
      </div>
    </article>
  )
}
