import { useId, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  BellRing,
  CalendarClock,
  ClipboardCheck,
  MessageCircle,
  Phone,
  UserPlus,
} from 'lucide-react'
import { toast } from 'react-hot-toast'

import { timeAgo } from './leads'
import type { SalesView } from './navigation'
import type { SalesData } from './salesDataContext'
import type { Lead, SalesRep } from './types'
import { created, start, workQueue } from './workQueue'
import {
  introMessage,
  openTrialWhatsApp,
  trialTime,
  whatsappLink,
  whatsappMessage,
} from './whatsapp'

const DAY = 86_400_000
/** Waiting longer than this gets an "overdue" flag. */
const OVERDUE_AFTER = 2 * DAY
const FIRST_PAGE = 5
const MORE = 10

const iconLink =
  'inline-flex size-8 shrink-0 items-center justify-center rounded-lg border transition focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none'
const whatsappIcon = `${iconLink} border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/30 dark:text-emerald-300 dark:hover:bg-emerald-500/10`
const plainIcon = `${iconLink} border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10`
const textButton =
  'rounded-lg px-2.5 py-1.5 text-xs font-bold text-purple-700 hover:bg-purple-50 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none dark:text-purple-300 dark:hover:bg-purple-500/10'

type Row = {
  key: string
  primary: string
  secondary: string
  overdue: boolean
  actions: ReactNode
}

type Tab = {
  id: 'soon' | 'notContacted' | 'followUps' | 'needsOutcome'
  label: string
  icon: LucideIcon
  rows: Row[]
  empty: string
  openLabel: string
  open: SalesView
}

/**
 * The rep's to-dos as one list with a tab per kind, most urgent first. It
 * shows five at a time, so 15 parents to contact read as a queue to work
 * through rather than a wall of cards.
 */
export function RepToday({
  data,
  rep,
  now,
  onNavigate,
  queue = workQueue(data, rep.id, now),
}: {
  data: SalesData
  rep: SalesRep
  now: number
  onNavigate: (view: SalesView) => void
  /** Pass it in when the page already worked it out. */
  queue?: ReturnType<typeof workQueue>
}) {
  const mentorFor = (id: string) => data.mentors.find((m) => m.id === id)

  const leadActions = (lead: Lead) => (
    <>
      <a
        href={whatsappLink(lead.phone, introMessage(lead.parentName, rep.name))}
        target="_blank"
        rel="noreferrer"
        aria-label={`WhatsApp ${lead.parentName}`}
        className={whatsappIcon}
      >
        <MessageCircle size={15} aria-hidden />
      </a>
      <a
        href={`tel:${lead.phone}`}
        aria-label={`Call ${lead.parentName}`}
        className={plainIcon}
      >
        <Phone size={15} aria-hidden />
      </a>
    </>
  )

  const tabs: Tab[] = [
    {
      id: 'soon',
      label: 'Trials soon',
      icon: CalendarClock,
      empty: 'No trials today or tomorrow.',
      openLabel: 'Open trial bookings',
      open: 'bookings',
      rows: queue.soon.map((booking) => ({
        key: booking.id,
        primary: booking.studentName,
        secondary: `${trialTime(booking.start)} · ${mentorFor(booking.mentorId)?.name ?? 'Mentor'} · ${booking.parentName}`,
        overdue: false,
        actions: (
          <button
            type="button"
            aria-label={`Send ${booking.parentName} a reminder on WhatsApp`}
            title="Send a reminder on WhatsApp"
            className={whatsappIcon}
            onClick={() => {
              openTrialWhatsApp(
                booking.id,
                booking.parentPhone,
                whatsappMessage(
                  'trial_reminder',
                  booking,
                  mentorFor(booking.mentorId),
                ),
              ).catch((error: unknown) => {
                toast.error(
                  error instanceof Error
                    ? error.message
                    : 'WhatsApp could not open. Try again.',
                )
              })
            }}
          >
            <MessageCircle size={15} aria-hidden />
          </button>
        ),
      })),
    },
    {
      id: 'notContacted',
      label: 'Not contacted',
      icon: UserPlus,
      empty: 'Everyone has heard from you.',
      openLabel: 'Open parents',
      open: 'parents',
      rows: queue.notContacted.map((lead) => ({
        key: lead.id,
        primary: lead.parentName,
        secondary: `Added ${timeAgo(lead.createdAt, now)}${lead.salesRepId === null ? ' · unassigned' : ''}`,
        overdue: now - created(lead) >= OVERDUE_AFTER,
        actions: leadActions(lead),
      })),
    },
    {
      id: 'followUps',
      label: 'Follow-ups',
      icon: BellRing,
      empty: 'No follow-ups waiting.',
      openLabel: 'Open parents',
      open: 'parents',
      rows: queue.followUps.map((lead) => ({
        key: lead.id,
        primary: lead.parentName,
        secondary: lead.lastContactedAt
          ? `Last contacted ${timeAgo(lead.lastContactedAt, now)}`
          : 'Not contacted on the dashboard',
        overdue: true,
        actions: leadActions(lead),
      })),
    },
    {
      id: 'needsOutcome',
      label: 'Need an outcome',
      icon: ClipboardCheck,
      empty: 'Every past trial has an outcome.',
      openLabel: 'Open trial bookings',
      open: 'bookings',
      rows: queue.needsOutcome.map((booking) => ({
        key: booking.id,
        primary: booking.studentName,
        secondary: `Trial was ${timeAgo(booking.start, now)} · ${booking.parentName}`,
        overdue: now - start(booking) >= OVERDUE_AFTER,
        actions: (
          <button
            type="button"
            className={textButton}
            onClick={() => onNavigate('bookings')}
          >
            Update
          </button>
        ),
      })),
    },
  ]

  const [picked, setPicked] = useState<Tab['id'] | null>(null)
  const [limit, setLimit] = useState(FIRST_PAGE)
  // Until the rep picks a tab, open the most urgent one that has work.
  const active =
    tabs.find((tab) => tab.id === picked) ??
    tabs.find((tab) => tab.rows.length > 0) ??
    tabs[0]
  const shown = active.rows.slice(0, limit)
  const left = active.rows.length - shown.length
  const total = tabs.reduce((sum, tab) => sum + tab.rows.length, 0)

  const baseId = useId()
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const select = (index: number) => {
    const tab = tabs[(index + tabs.length) % tabs.length]
    setPicked(tab.id)
    setLimit(FIRST_PAGE)
    tabRefs.current[tabs.indexOf(tab)]?.focus()
  }
  const onKeyDown = (event: KeyboardEvent, index: number) => {
    if (event.key === 'ArrowRight') select(index + 1)
    else if (event.key === 'ArrowLeft') select(index - 1)
    else return
    event.preventDefault()
  }

  return (
    <section
      aria-labelledby={`${baseId}-title`}
      className="flex h-full min-w-0 flex-col rounded-2xl border border-slate-100 bg-white shadow-xs dark:border-white/10 dark:bg-white/5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-4">
        <h2
          id={`${baseId}-title`}
          className="text-base font-bold text-slate-900 dark:text-white"
        >
          To do today
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {total === 0
            ? 'All clear.'
            : `${total} ${total === 1 ? 'thing' : 'things'} waiting · oldest first`}
        </p>
      </div>

      <div
        role="tablist"
        aria-label="To-do lists"
        className="mt-3 flex gap-1 overflow-x-auto border-b border-slate-100 px-3 dark:border-white/10"
      >
        {tabs.map((tab, index) => {
          const selected = tab.id === active.id
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              ref={(node) => {
                tabRefs.current[index] = node
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(index)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={`-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-bold transition focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none focus-visible:ring-inset ${
                selected
                  ? 'border-purple-600 text-purple-700 dark:border-purple-400 dark:text-purple-300'
                  : tab.rows.length === 0
                    ? 'border-transparent text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
                    : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              <Icon size={15} aria-hidden />
              {tab.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[11px] leading-none font-black tabular-nums ${
                  tab.rows.length === 0
                    ? 'bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500'
                    : selected
                      ? 'bg-purple-600 text-white dark:bg-purple-500'
                      : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                }`}
              >
                {tab.rows.length}
              </span>
            </button>
          )
        })}
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-panel`}
        aria-labelledby={`${baseId}-tab-${active.id}`}
        className="flex-1 px-5 py-2"
      >
        {shown.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
            {active.empty}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-white/10">
            {shown.map((row) => (
              <li key={row.key} className="flex items-center gap-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-bold text-slate-900 dark:text-white">
                      {row.primary}
                    </span>
                    {row.overdue && (
                      <span className="shrink-0 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 ring-1 ring-amber-200 ring-inset dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30">
                        Overdue
                      </span>
                    )}
                  </span>
                  <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                    {row.secondary}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  {row.actions}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-3 py-2 dark:border-white/10">
        <span>
          {left > 0 && (
            <button
              type="button"
              className={textButton}
              onClick={() => setLimit((current) => current + MORE)}
            >
              Show {Math.min(left, MORE)} more
              <span className="font-semibold text-slate-500 dark:text-slate-400">
                {' '}
                of {left}
              </span>
            </button>
          )}
          {left === 0 && limit > FIRST_PAGE && (
            <button
              type="button"
              className={textButton}
              onClick={() => setLimit(FIRST_PAGE)}
            >
              Show fewer
            </button>
          )}
        </span>
        <button
          type="button"
          className={textButton}
          onClick={() => onNavigate(active.open)}
        >
          {active.openLabel}
        </button>
      </div>
    </section>
  )
}
