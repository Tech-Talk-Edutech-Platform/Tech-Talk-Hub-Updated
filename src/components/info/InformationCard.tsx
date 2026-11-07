import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

type InformationCardProps = {
  icon?: LucideIcon
  title: string
  children: ReactNode
}

export function InformationCard({
  icon: Icon,
  title,
  children,
}: InformationCardProps) {
  return (
    <article className="rounded-3xl border border-purple-100 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-start gap-4">
        {Icon && (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-[#2947C7]">
            <Icon className="h-5 w-5" />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-black text-[#172554] sm:text-2xl">
            {title}
          </h2>

          <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600 sm:text-base">
            {children}
          </div>
        </div>
      </div>
    </article>
  )
}
