import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

const accentClasses = {
  blue: { icon: 'text-blue-500', underline: 'border-blue-500' },
  green: { icon: 'text-emerald-500', underline: 'border-emerald-500' },
  purple: { icon: 'text-indigo-500', underline: 'border-indigo-500' },
  amber: { icon: 'text-amber-500', underline: 'border-amber-500' },
} as const

export type StatCardAccent = keyof typeof accentClasses

type StatCardProps = {
  title: string
  value: ReactNode
  icon?: LucideIcon
  accent?: StatCardAccent
}

/** Shared dashboard metric presentation; data loading and formatting stay with the feature. */
export function StatCard({
  title,
  value,
  icon: Icon,
  accent = 'blue',
}: StatCardProps) {
  const colors = accentClasses[accent]

  return (
    <article className="group flex min-w-0 flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white p-6 shadow-xs transition-shadow hover:shadow-md">
      <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
        {Icon && <Icon size={20} className={colors.icon} aria-hidden="true" />}
        {title}
      </h4>
      <span className="text-4xl font-black tracking-tight text-slate-900">
        {value}
      </span>
      <span
        aria-hidden="true"
        className={`mt-3 h-1.5 w-10 rounded-full border-b-4 transition-all group-hover:w-16 ${colors.underline}`}
      />
    </article>
  )
}
