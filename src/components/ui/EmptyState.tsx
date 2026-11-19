import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'

type EmptyStateSize = 'sm' | 'md' | 'lg'
type EmptyStateTone = 'neutral' | 'brand'

type EmptyStateProps = {
  /** Short statement of what is missing, e.g. "No classes today". */
  title?: ReactNode
  /** What the person can expect or do next. */
  description?: ReactNode
  /** Defaults to an inbox. Pass `null` to hide the icon. */
  icon?: LucideIcon | null
  /** A button or link that resolves the empty state. */
  action?: ReactNode
  size?: EmptyStateSize
  tone?: EmptyStateTone
  className?: string
}

const SIZE_CLASSES: Record<
  EmptyStateSize,
  { box: string; icon: number; title: string; description: string }
> = {
  sm: {
    box: 'gap-1.5 px-4 py-6',
    icon: 18,
    title: 'text-sm font-bold',
    description: 'text-xs',
  },
  md: {
    box: 'gap-2 px-6 py-10',
    icon: 24,
    title: 'text-base font-black',
    description: 'text-sm',
  },
  lg: {
    box: 'gap-3 px-8 py-16',
    icon: 32,
    title: 'text-lg font-black',
    description: 'text-sm',
  },
}

const TONE_CLASSES: Record<EmptyStateTone, { box: string; icon: string }> = {
  neutral: {
    box: 'border-slate-200 bg-slate-50/50 dark:border-white/10 dark:bg-white/5',
    icon: 'bg-white text-slate-400 dark:bg-white/10 dark:text-slate-400',
  },
  brand: {
    box: 'border-purple-200 bg-purple-50/30 dark:border-purple-500/20 dark:bg-purple-950/20',
    icon: 'bg-white text-purple-500 dark:bg-purple-500/10 dark:text-purple-300',
  },
}

/**
 * Shared placeholder for lists, tables and panels with nothing to show.
 * Callers keep their own loading and error states; render this only once
 * data has loaded and is empty.
 */
export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  size = 'md',
  tone = 'neutral',
  className = '',
}: EmptyStateProps) {
  const sizes = SIZE_CLASSES[size]
  const tones = TONE_CLASSES[tone]

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed text-center ${sizes.box} ${tones.box} ${className}`}
    >
      {Icon && (
        <span
          aria-hidden="true"
          className={`mb-1 inline-flex items-center justify-center rounded-full p-2.5 shadow-xs ${tones.icon}`}
        >
          <Icon size={sizes.icon} />
        </span>
      )}
      {title && (
        <p className={`text-slate-800 dark:text-white ${sizes.title}`}>
          {title}
        </p>
      )}
      {description && (
        <p
          className={`max-w-prose text-slate-500 dark:text-slate-400 ${sizes.description}`}
        >
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
