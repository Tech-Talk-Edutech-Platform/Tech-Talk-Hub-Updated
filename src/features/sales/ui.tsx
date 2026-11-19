import type { ReactNode } from 'react'
import { EmptyState as SharedEmptyState } from '../../components/ui/EmptyState'
import type { LucideIcon } from 'lucide-react'
import {
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  Mail,
  MessageCircle,
  Phone,
} from 'lucide-react'

import type { TutorTone } from './bookingStyles'
import {
  LEAD_STATUS_LABEL,
  TRIAL_STATUS_LABEL,
  type LeadStatus,
  type TrialStatus,
} from './types'
import { whatsappLink } from './whatsapp'

export function TabBar<T extends string>({
  tabs,
  active,
  onChange,
  label,
}: {
  tabs: readonly { id: T; label: string; icon: LucideIcon }[]
  active: T
  onChange: (tab: T) => void
  label: string
}) {
  return (
    <nav
      aria-label={label}
      className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-slate-900"
    >
      {tabs.map(({ id, label: tabLabel, icon: Icon }) => (
        <button
          key={id}
          type="button"
          aria-current={active === id ? 'page' : undefined}
          onClick={() => onChange(id)}
          className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-bold transition ${
            active === id
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5'
          }`}
        >
          <Icon size={16} aria-hidden />
          {tabLabel}
        </button>
      ))}
    </nav>
  )
}

export function Panel({
  title,
  icon: Icon,
  action,
  children,
  className = '',
}: {
  title: string
  icon?: LucideIcon
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={`min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5 dark:border-white/10 dark:bg-slate-900 ${className}`}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white">
          {Icon && <Icon size={16} className="text-purple-500" aria-hidden />}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export function Kpi({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon: LucideIcon
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900">
      <p className="flex items-center gap-2 text-[11px] font-bold tracking-wide text-slate-500 uppercase dark:text-slate-400">
        <Icon size={14} className="text-purple-500" aria-hidden />
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-slate-950 tabular-nums sm:text-3xl dark:text-white">
        {value}
      </p>
      {hint && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      )}
    </div>
  )
}

const STATUS_STYLE: Record<TrialStatus, string> = {
  scheduled:
    'bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/30',
  attended:
    'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/30',
  converted:
    'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30',
  lost: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10',
  no_show:
    'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30',
  cancelled:
    'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30',
}

export function StatusBadge({ status }: { status: TrialStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset ${STATUS_STYLE[status]}`}
    >
      {TRIAL_STATUS_LABEL[status]}
    </span>
  )
}

const LEAD_STATUS_STYLE: Record<LeadStatus, string> = {
  new: 'bg-purple-50 text-purple-700 ring-purple-200 dark:bg-purple-500/10 dark:text-purple-300 dark:ring-purple-500/30',
  contacted:
    'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/30',
  trial_booked:
    'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30',
  not_interested:
    'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10',
}

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset ${LEAD_STATUS_STYLE[status]}`}
    >
      {LEAD_STATUS_LABEL[status]}
    </span>
  )
}

const contactButton =
  'inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5'

/**
 * WhatsApp, call and email buttons for reaching a parent. `message` pre-fills
 * the WhatsApp chat.
 */
export function ContactButtons({
  phone,
  email,
  message,
}: {
  phone: string
  email: string
  message: string
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={whatsappLink(phone, message)}
        target="_blank"
        rel="noreferrer"
        className={`${contactButton} border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/30 dark:text-emerald-300 dark:hover:bg-emerald-500/10`}
      >
        <MessageCircle size={14} aria-hidden /> WhatsApp
      </a>
      <a href={`tel:${phone}`} className={contactButton}>
        <Phone size={14} aria-hidden /> Call
      </a>
      {email && (
        <a href={`mailto:${email}`} className={contactButton}>
          <Mail size={14} aria-hidden /> Email
        </a>
      )}
    </div>
  )
}

/** A label wrapping its form control, with an optional hint underneath. */
export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    // oxlint-disable-next-line jsx-a11y/label-has-associated-control -- the control is passed in as children
    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
      <span className="mb-1.5 block">{label}</span>
      {children}
      {hint && (
        <span className="mt-1 block font-normal text-slate-500 dark:text-slate-400">
          {hint}
        </span>
      )}
    </label>
  )
}

export function DemoBanner({ children }: { children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
      <span className="inline-flex items-center gap-2 font-extrabold">
        <FlaskConical size={16} aria-hidden /> Preview on demo data
      </span>
      <span className="text-amber-800/90 dark:text-amber-200/80">
        {children ??
          'Names, bookings and sales are made up. Changes you make last until you reload, and no WhatsApp messages are sent.'}
      </span>
    </div>
  )
}

export function Initials({ name, size = 32 }: { name: string; size?: number }) {
  const letters = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-black text-purple-700 dark:bg-purple-500/20 dark:text-purple-200"
    >
      {letters}
    </span>
  )
}

/** A tutor's initials on an orange or violet tile, as on the booking portal. */
export function TutorAvatar({ name, tone }: { name: string; tone: TutorTone }) {
  const letters = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
  return (
    <span
      aria-hidden
      className={`inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br text-sm font-black text-white shadow-sm ${
        tone === 'orange'
          ? 'from-orange-500 to-orange-700'
          : 'from-violet-500 to-violet-800'
      }`}
    >
      {letters}
    </span>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <SharedEmptyState size="sm" icon={null} description={children} />
}

const pagerButton =
  'inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5'

/** Previous / Next under a paged list; nothing when it fits on one page. */
export function Pager({
  page,
  pageCount,
  total,
  noun,
  onPage,
}: {
  page: number
  pageCount: number
  total: number
  /** Plural, e.g. "parents". */
  noun: string
  onPage: (page: number) => void
}) {
  if (pageCount <= 1) return null
  return (
    <nav
      aria-label={`Pages of ${noun}`}
      className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-white/10"
    >
      <button
        type="button"
        onClick={() => onPage(page - 1)}
        disabled={page === 0}
        className={pagerButton}
      >
        <ChevronLeft size={14} aria-hidden /> Previous
      </button>
      <p
        aria-live="polite"
        className="text-center text-xs font-semibold text-slate-500 tabular-nums dark:text-slate-400"
      >
        Page {page + 1} of {pageCount}
        <span className="hidden sm:inline">
          {' '}
          · {total} {noun}
        </span>
      </p>
      <button
        type="button"
        onClick={() => onPage(page + 1)}
        disabled={page >= pageCount - 1}
        className={pagerButton}
      >
        Next <ChevronRight size={14} aria-hidden />
      </button>
    </nav>
  )
}
