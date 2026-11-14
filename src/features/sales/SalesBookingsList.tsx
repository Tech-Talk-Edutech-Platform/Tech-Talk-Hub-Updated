import { useMemo, useState } from 'react'
import {
  BadgeCheck,
  ClipboardList,
  MessageCircle,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { toast } from 'react-hot-toast'

import { formatMoney } from '../../lib/money'
import { restoreProblem } from './bookings'
import { DEMO_PLANS } from './demoData'
import { gradeCategory, gradeLabel } from './gradeCategories'
import { RemoveBookingDialog } from './RemoveBookingDialog'
import { useSalesData } from './salesDataContext'
import type { TrialBooking, TrialStatus } from './types'
import { REMOVAL_REASON_LABEL, SOURCE_LABEL, TRIAL_STATUS_LABEL } from './types'
import { EmptyState, Panel, StatusBadge } from './ui'
import { inlineSelectClass, selectClass } from './styles'
import { trialTime, whatsappLink, whatsappMessage } from './whatsapp'

type Filter = 'upcoming' | 'needs-update' | 'all' | 'removed'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'needs-update', label: 'Needs an outcome' },
  { id: 'all', label: 'All' },
  { id: 'removed', label: 'Removed' },
]

const removedAt = (booking: TrialBooking) =>
  new Date(booking.removal?.at ?? 0).getTime()

const OUTCOMES: TrialStatus[] = ['attended', 'no_show', 'lost', 'cancelled']

/**
 * Trial bookings with what happened next. `repId` limits it to one sales rep;
 * null shows the whole team (admins).
 */
export function SalesBookingsList({
  repId,
  creditRepId,
}: {
  repId: string | null
  /** Who a sale recorded from this list is credited to (the viewer). */
  creditRepId: string | null
}) {
  const data = useSalesData()
  const [filter, setFilter] = useState<Filter>('upcoming')
  const [mentorFilter, setMentorFilter] = useState('')
  const [openSale, setOpenSale] = useState<string | null>(null)
  const [removing, setRemoving] = useState<TrialBooking | null>(null)
  const [now] = useState(() => Date.now())

  const rows = useMemo(() => {
    const visible = (booking: TrialBooking) =>
      (repId === null || booking.salesRepId === repId) &&
      (!mentorFilter || booking.mentorId === mentorFilter)
    if (filter === 'removed') {
      return data.removedBookings
        .filter(visible)
        .toSorted((a, b) => removedAt(b) - removedAt(a))
    }
    const mine = data.bookings.filter(visible)
    const time = (booking: TrialBooking) => new Date(booking.start).getTime()
    if (filter === 'upcoming') {
      return mine
        .filter((b) => time(b) >= now && b.status === 'scheduled')
        .toSorted((a, b) => time(a) - time(b))
    }
    if (filter === 'needs-update') {
      return mine
        .filter(
          (b) =>
            time(b) < now &&
            (b.status === 'scheduled' || b.status === 'attended'),
        )
        .toSorted((a, b) => time(b) - time(a))
    }
    return mine.toSorted((a, b) => time(b) - time(a))
  }, [data.bookings, data.removedBookings, repId, mentorFilter, filter, now])

  const mentorName = (id: string) =>
    data.mentors.find((mentor) => mentor.id === id)?.name ?? '—'
  const repName = (id: string | null) =>
    id ? (data.reps.find((rep) => rep.id === id)?.name ?? '—') : 'Website'

  return (
    <Panel
      title="Trial bookings"
      icon={ClipboardList}
      action={
        <div className="flex flex-wrap gap-2">
          <fieldset className="inline-flex max-w-full min-w-0 overflow-x-auto rounded-xl bg-slate-100 p-1 dark:bg-white/5">
            <legend className="sr-only">Filter bookings</legend>
            {FILTERS.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={filter === option.id}
                onClick={() => setFilter(option.id)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap ${
                  filter === option.id
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {option.label}
              </button>
            ))}
          </fieldset>
          <select
            aria-label="Filter by mentor"
            value={mentorFilter}
            onChange={(event) => setMentorFilter(event.target.value)}
            className={`${inlineSelectClass} text-xs`}
          >
            <option value="">All mentors</option>
            {data.mentors.map((mentor) => (
              <option key={mentor.id} value={mentor.id}>
                {mentor.name}
              </option>
            ))}
          </select>
        </div>
      }
    >
      {rows.length === 0 ? (
        <EmptyState>
          {filter === 'upcoming'
            ? 'No upcoming trials. Book one from “Book a trial”.'
            : filter === 'needs-update'
              ? 'Every past trial has an outcome. Nice work.'
              : filter === 'removed'
                ? 'Nothing removed. A booking made by mistake lands here, so it can be restored.'
                : 'No bookings yet.'}
        </EmptyState>
      ) : filter === 'removed' ? (
        <ul className="divide-y divide-slate-100 dark:divide-white/10">
          {rows.slice(0, 60).map((booking) => (
            <RemovedRow
              key={booking.id}
              booking={booking}
              now={now}
              mentorName={mentorName(booking.mentorId)}
            />
          ))}
        </ul>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-white/10">
          {rows.slice(0, 60).map((booking) => {
            const mentor = data.mentors.find((m) => m.id === booking.mentorId)
            const past = new Date(booking.start).getTime() < now
            return (
              <li key={booking.id} className="py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white">
                      {booking.studentName}
                      <StatusBadge status={booking.status} />
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {trialTime(booking.start)} ·{' '}
                      {gradeCategory(booking.category).label},{' '}
                      {gradeLabel(booking.studentGrade)} · Mentor{' '}
                      {mentorName(booking.mentorId)}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {booking.parentName} · {booking.parentPhone} ·{' '}
                      {SOURCE_LABEL[booking.source]}
                      {repId === null &&
                        ` · Rep: ${repName(booking.salesRepId)}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={whatsappLink(
                        booking.parentPhone,
                        whatsappMessage(
                          past ? 'trial_follow_up' : 'trial_reminder',
                          booking,
                          mentor,
                        ),
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/30 dark:text-emerald-300 dark:hover:bg-emerald-500/10"
                    >
                      <MessageCircle size={13} aria-hidden />
                      {past ? 'Follow up' : 'Remind'}
                    </a>
                    {past &&
                      booking.status !== 'converted' &&
                      booking.status !== 'cancelled' && (
                        <>
                          <select
                            aria-label={`Outcome for ${booking.studentName}`}
                            value=""
                            onChange={(event) => {
                              const next = OUTCOMES.find(
                                (status) => status === event.target.value,
                              )
                              if (next) {
                                data.setTrialStatus(booking.id, next)
                                toast.success(
                                  `Marked ${TRIAL_STATUS_LABEL[next].toLowerCase()}.`,
                                )
                              }
                            }}
                            className={`${inlineSelectClass} text-xs`}
                          >
                            <option value="">Set outcome…</option>
                            {OUTCOMES.filter((s) => s !== booking.status).map(
                              (status) => (
                                <option key={status} value={status}>
                                  {TRIAL_STATUS_LABEL[status]}
                                </option>
                              ),
                            )}
                          </select>
                          <button
                            type="button"
                            onClick={() =>
                              setOpenSale((current) =>
                                current === booking.id ? null : booking.id,
                              )
                            }
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-extrabold text-white hover:bg-emerald-700"
                          >
                            <BadgeCheck size={13} aria-hidden /> Enrolled
                          </button>
                        </>
                      )}
                    {!past && booking.status === 'scheduled' && (
                      <button
                        type="button"
                        onClick={() => {
                          data.setTrialStatus(booking.id, 'cancelled')
                          toast.success(
                            'Marked cancelled by the parent; the time is open again.',
                          )
                        }}
                        className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
                      >
                        Parent cancelled
                      </button>
                    )}
                    {booking.status === 'scheduled' && (
                      <button
                        type="button"
                        onClick={() => setRemoving(booking)}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                      >
                        <Trash2 size={13} aria-hidden /> Remove
                      </button>
                    )}
                  </div>
                </div>
                {openSale === booking.id && (
                  <RecordSaleForm
                    onCancel={() => setOpenSale(null)}
                    onSave={(plan, amount) => {
                      const credit =
                        booking.salesRepId ?? creditRepId ?? data.reps[0]?.id
                      if (!credit) return
                      data.recordSale(booking.id, credit, plan, amount)
                      setOpenSale(null)
                      toast.success(
                        `${booking.studentName} enrolled · ${formatMoney(amount)}`,
                      )
                    }}
                  />
                )}
              </li>
            )
          })}
        </ul>
      )}
      {removing && (
        <RemoveBookingDialog
          booking={removing}
          byRepId={creditRepId}
          onClose={() => setRemoving(null)}
        />
      )}
    </Panel>
  )
}

/** A removed (soft-deleted) booking: who removed it and why, and "Restore". */
function RemovedRow({
  booking,
  now,
  mentorName,
}: {
  booking: TrialBooking
  now: number
  mentorName: string
}) {
  const data = useSalesData()
  const problem = restoreProblem(
    booking,
    {
      bookings: [...data.bookings, ...data.removedBookings],
      slots: data.slots,
    },
    now,
  )
  const removal = booking.removal
  const remover = removal?.byRepId
    ? (data.reps.find((rep) => rep.id === removal.byRepId)?.name ?? 'a rep')
    : 'an admin'

  const restore = () => {
    try {
      data.restoreBooking(booking.id)
      toast.success(
        `${booking.studentName}’s trial is back on ${mentorName}’s calendar.`,
      )
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Couldn’t restore it.',
      )
    }
  }

  return (
    <li className="flex flex-wrap items-start justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-sm font-extrabold text-slate-500 dark:text-slate-400">
          <span className="line-through decoration-slate-400">
            {booking.studentName}
          </span>
          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700 ring-1 ring-rose-200 ring-inset dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30">
            Removed
          </span>
        </p>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          {trialTime(booking.start)} · {gradeCategory(booking.category).label}
          {' · '}Mentor {mentorName} · Parent {booking.parentName}
        </p>
        {removal && (
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
            Removed {trialTime(removal.at)} by {remover} ·{' '}
            {REMOVAL_REASON_LABEL[removal.reason]}
            {removal.note && `: “${removal.note}”`}
          </p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={restore}
          disabled={problem !== null}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
        >
          <RotateCcw size={13} aria-hidden /> Restore
        </button>
        {problem && (
          <p className="max-w-[240px] text-right text-[11px] text-slate-500">
            {problem}
          </p>
        )}
      </div>
    </li>
  )
}

function RecordSaleForm({
  onSave,
  onCancel,
}: {
  onSave: (plan: string, amount: number) => void
  onCancel: () => void
}) {
  const [planIndex, setPlanIndex] = useState(0)
  const plan = DEMO_PLANS[planIndex] ?? DEMO_PLANS[0]
  return (
    <div className="mt-3 flex flex-wrap items-end gap-2 rounded-xl bg-emerald-50 p-3 dark:bg-emerald-500/10">
      <label className="min-w-[220px] flex-1 text-xs font-bold text-emerald-900 dark:text-emerald-200">
        Plan they paid for
        <select
          value={planIndex}
          onChange={(event) => setPlanIndex(Number(event.target.value))}
          className={`${selectClass} mt-1`}
        >
          {DEMO_PLANS.map((option, index) => (
            <option key={option.name} value={index}>
              {option.name} · {formatMoney(option.amount)}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={() => onSave(plan.name, plan.amount)}
        className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-emerald-700"
      >
        Record sale
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="rounded-xl px-3 py-2.5 text-sm font-bold text-slate-600 hover:bg-white/60 dark:text-slate-300"
      >
        Cancel
      </button>
    </div>
  )
}
