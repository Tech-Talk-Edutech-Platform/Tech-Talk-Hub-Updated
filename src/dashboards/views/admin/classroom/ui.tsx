import type {
  ButtonHTMLAttributes,
  ComponentPropsWithoutRef,
  ReactNode,
} from 'react'
import { forwardRef } from 'react'
import { Database, Loader2 } from 'lucide-react'
import type { ClassroomSessionStatus } from '../../../../types/classroomTables'
import { STATUS_LABEL } from './format'

/* Small building blocks for Dashboard › Classroom, in the dashboard's style. */

/** Input look without a width, for fields sized by their row. */
export const inputBase =
  'min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-900 outline-hidden transition-colors placeholder:text-slate-400 focus:border-purple-500 focus:bg-white disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:bg-white/10'
export const inputClass = `w-full ${inputBase}`

export const textareaClass = `${inputClass} resize-y leading-6`

type FieldProps = {
  label: string
  htmlFor: string
  hint?: string
  required?: boolean
  className?: string
  children: ReactNode
}

export function Field({
  label,
  htmlFor,
  hint,
  required,
  className = '',
  children,
}: FieldProps) {
  return (
    <div className={className}>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300"
      >
        {label}
        {required && (
          <span className="text-pink-600" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      {children}
      {hint && (
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      )}
    </div>
  )
}

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-purple-600 text-white shadow-md shadow-purple-500/20 hover:bg-purple-700',
  secondary:
    'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10',
  danger:
    'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20',
  ghost:
    'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white',
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  busy?: boolean
  size?: 'md' | 'sm'
  /** Icon-only: a square button. */
  square?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = 'secondary',
      busy = false,
      size = 'md',
      square = false,
      className = '',
      disabled,
      children,
      type = 'button',
      ...props
    },
    ref,
  ) {
    const sizing =
      size === 'sm'
        ? `h-8 gap-1.5 text-xs ${square ? 'w-8' : 'px-3'}`
        : `h-10 gap-2 text-sm ${square ? 'w-10' : 'px-4'}`
    return (
      <button
        ref={ref}
        // oxlint-disable-next-line react/button-has-type -- type defaults to "button" above
        type={type}
        disabled={disabled || busy}
        className={`inline-flex shrink-0 items-center justify-center rounded-2xl font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${sizing} ${VARIANTS[variant]} ${className}`}
        {...props}
      >
        {busy && (
          <Loader2 size={14} className="animate-spin" aria-hidden="true" />
        )}
        {children}
      </button>
    )
  },
)

export function Card({
  className = '',
  ...props
}: ComponentPropsWithoutRef<'section'>) {
  return (
    <section
      className={`rounded-[28px] border border-slate-100 bg-white p-5 shadow-2xs md:p-6 dark:border-white/10 dark:bg-white/5 ${className}`}
      {...props}
    />
  )
}

export function CardTitle({
  children,
  aside,
}: {
  children: ReactNode
  aside?: ReactNode
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h3 className="text-lg font-black text-slate-900 dark:text-white">
        {children}
      </h3>
      {aside}
    </div>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-10 text-center text-sm font-medium text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
      {children}
    </div>
  )
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
    >
      {children}
    </p>
  )
}

export function Loading({ label }: { label: string }) {
  return (
    <output className="flex items-center justify-center gap-2 py-12 text-sm font-bold text-slate-400">
      <Loader2 size={18} className="animate-spin" aria-hidden="true" />
      {label}
    </output>
  )
}

const STATUS_STYLE: Record<ClassroomSessionStatus, string> = {
  scheduled:
    'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300',
  live: 'bg-pink-50 text-pink-700 dark:bg-pink-500/10 dark:text-pink-300',
  completed:
    'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  not_completed:
    'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300',
  cancelled: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300',
}

export function StatusPill({ status }: { status: ClassroomSessionStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black tracking-wide uppercase ${STATUS_STYLE[status]}`}
    >
      {status === 'live' && (
        <span
          aria-hidden="true"
          className="size-1.5 rounded-full bg-current motion-safe:animate-pulse"
        />
      )}
      {STATUS_LABEL[status]}
    </span>
  )
}

/** Shown instead of the manager until the classroom migration is applied. */
export function SetupNotice() {
  return (
    <Card>
      <div className="flex gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-300">
          <Database size={20} aria-hidden="true" />
        </span>
        <div className="min-w-0 text-sm leading-6 text-slate-600 dark:text-slate-300">
          <h3 className="text-lg font-black text-slate-900 dark:text-white">
            Set up the classroom tables
          </h3>
          <p className="mt-1">
            The classroom tables aren’t in Supabase yet, so /classroom is
            showing its built-in sample class. To set them up:
          </p>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5">
            <li>
              Open the Supabase dashboard, then <strong>SQL Editor</strong> ›{' '}
              <strong>New query</strong>.
            </li>
            <li>
              Paste all of{' '}
              <code className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-800 dark:bg-white/10 dark:text-slate-100">
                supabase/migrations/20261110120000_classroom.sql
              </code>{' '}
              and click <strong>Run</strong>. It is safe to run again.
            </li>
            <li>Reload this page.</li>
          </ol>
          <p className="mt-3">
            Field-by-field notes are in{' '}
            <code className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-800 dark:bg-white/10 dark:text-slate-100">
              docs/classroom-supabase.md
            </code>
            .
          </p>
        </div>
      </div>
    </Card>
  )
}
