import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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
import { gradeCategory, gradeLabel } from './gradeCategories'
import { pageOf } from './paging'
import { RemoveBookingDialog } from './RemoveBookingDialog'
import { problemText, useSalesData } from './salesDataContext'
import { TrialInviteInline } from './TrialInvitePanel'
import type { SalesPlan, SalesRep, TrialBooking, TrialOutcome } from './types'
import { REMOVAL_REASON_LABEL, SOURCE_LABEL, TRIAL_STATUS_LABEL } from './types'
import { EmptyState, Pager, Panel, StatusBadge } from './ui'
import { inlineSelectClass, inputClass, selectClass } from './styles'
import {
  openTrialWhatsApp,
  trialTime,
  trialTimes,
  whatsappLink,
  whatsappMessage,
} from './whatsapp'

type Filter = 'upcoming' | 'needs-update' | 'all' | 'removed'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'needs-update', label: 'Needs an outcome' },
  { id: 'all', label: 'All' },
  { id: 'removed', label: 'Removed' },
]

const removedAt = (booking: TrialBooking) =>
  new Date(booking.removal?.at ?? 0).getTime()

const OUTCOMES: TrialOutcome[] = ['attended', 'no_show', 'lost', 'cancelled']

const PAGE_SIZE = 10

/**
 * Trial bookings with what happened next. `repId` limits it to one sales rep;
 * null shows the whole team (admins).
 */
export function SalesBookingsList({
  repId,
  creditRepId,
  bookingId,
  onClearBooking,
}: {
  repId: string | null
  /**
   * The viewer when they're a sales rep: sales they record are theirs (or the
   * parent's rep's). Null for an admin, who picks who gets the credit.
   */
  creditRepId: string | null
  bookingId?: string | null
  onClearBooking?: () => void
}) {
  const data = useSalesData()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>(bookingId ? 'all' : 'upcoming')
  const [mentorFilter, setMentorFilter] = useState('')
  const [openSale, setOpenSale] = useState<string | null>(null)
  const [removing, setRemoving] = useState<TrialBooking | null>(null)
  const [page, setPage] = useState(0)
  const [now] = useState(() => Date.now())
  const request = {
    bookingId,
    filter,
    mentorId: mentorFilter,
    now,
    page,
    pageSize: PAGE_SIZE,
    repId,
  }
  const serverPage = useQuery({
    queryKey: ['dashboard-trial-bookings', request],
    enabled: Boolean(data.loadBookingPage),
    queryFn: ({ signal }) => data.loadBookingPage?.(request, signal) ?? null,
  })

  const rows = useMemo(() => {
    const visible = (booking: TrialBooking) =>
      (repId === null || booking.salesRepId === repId) &&
      (!mentorFilter || booking.mentorId === mentorFilter)
    if (bookingId)
      return data.bookings.filter(
        (booking) => visible(booking) && booking.id === bookingId,
      )
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
  }, [
    data.bookings,
    data.removedBookings,
    repId,
    mentorFilter,
    filter,
    now,
    bookingId,
  ])
  const localPage = pageOf(rows, page, PAGE_SIZE)
  const paged = data.loadBookingPage ? serverPage.data : localPage
  const total = data.loadBookingPage
    ? (serverPage.data?.total ?? 0)
    : rows.length

  const mentorName = (id: string) =>
    data.mentors.find((mentor) => mentor.id === id)?.name ?? '—'
  const repName = (id: string | null) =>
    id ? (data.reps.find((rep) => rep.id === id)?.name ?? '—') : 'Website'

  /** Saves a trial's outcome; one booking at a time. */
  const saveOutcome = async (
    booking: TrialBooking,
    status: TrialOutcome,
    done: string,
  ) => {
    setBusyId(booking.id)
    try {
      await data.setTrialStatus(booking.id, status)
      toast.success(done)
    } catch (error) {
      toast.error(problemText(error, 'Couldn’t save the outcome.'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Panel
      title="Trial bookings"
      icon={ClipboardList}
      action={
        bookingId ? (
          <button
            type="button"
            className="text-sm font-semibold underline"
            onClick={onClearBooking}
          >
            Show all bookings
          </button>
        ) : (
          <div className="flex flex-wrap gap-2">
            <fieldset className="inline-flex max-w-full min-w-0 overflow-x-auto rounded-xl bg-slate-100 p-1 dark:bg-white/5">
              <legend className="sr-only">Filter bookings</legend>
              {FILTERS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={filter === option.id}
                  onClick={() => {
                    setFilter(option.id)
                    setPage(0)
                  }}
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
              onChange={(event) => {
                setMentorFilter(event.target.value)
                setPage(0)
              }}
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
        )
      }
    >
      {data.loadBookingPage && serverPage.isError ? (
        <EmptyState>
          Trial bookings couldn’t be loaded.{' '}
          <button
            type="button"
            onClick={() => void serverPage.refetch()}
            className="underline"
          >
            Try again
          </button>
          .
        </EmptyState>
      ) : !paged ? (
        <EmptyState>Loading trial bookings…</EmptyState>
      ) : total === 0 ? (
        <EmptyState>
          {bookingId
            ? 'This booking could not be found in the available results.'
            : filter === 'upcoming'
              ? 'No upcoming trials. Book one from “Book a trial”.'
              : filter === 'needs-update'
                ? 'Every past trial has an outcome. Nice work.'
                : filter === 'removed'
                  ? 'Nothing removed. A booking made by mistake lands here, so it can be restored.'
                  : 'No bookings yet.'}
        </EmptyState>
      ) : filter === 'removed' ? (
        <ul className="divide-y divide-slate-100 dark:divide-white/10">
          {paged.items.map((booking) => (
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
          {paged.items.map((booking) => {
            const mentor = data.mentors.find((m) => m.id === booking.mentorId)
            const past = new Date(booking.start).getTime() < now
            const classroomCode =
              !past && booking.status === 'scheduled'
                ? booking.classroomCode
                : null
            const message = whatsappMessage(
              past ? 'trial_follow_up' : 'trial_reminder',
              booking,
              mentor,
            )
            return (
              <li key={booking.id} className="py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white">
                      {booking.studentName}
                      <StatusBadge status={booking.status} />
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {trialTimes(booking)} ·{' '}
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
                    {classroomCode && (
                      <TrialInviteInline
                        target={{
                          roomCode: classroomCode,
                          bookingId: booking.id,
                          parentEmail: booking.parentEmail,
                          invite: booking.inviteEmail,
                        }}
                        studentName={booking.studentName}
                        onSend={(resend) =>
                          data.sendInvite(booking.id, { resend })
                        }
                      />
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={whatsappLink(booking.parentPhone, message)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(event) => {
                        if (!classroomCode || data.isDemo) return
                        event.preventDefault()
                        void openTrialWhatsApp(
                          booking.id,
                          booking.parentPhone,
                          message,
                        ).catch((error: unknown) =>
                          toast.error(
                            problemText(error, 'Couldn’t open WhatsApp.'),
                          ),
                        )
                      }}
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
                            disabled={busyId === booking.id}
                            onChange={(event) => {
                              const next = OUTCOMES.find(
                                (status) => status === event.target.value,
                              )
                              if (next) {
                                void saveOutcome(
                                  booking,
                                  next,
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
                        disabled={busyId === booking.id}
                        onClick={() =>
                          void saveOutcome(
                            booking,
                            'cancelled',
                            'Marked cancelled by the parent; the time is open again.',
                          )
                        }
                        className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-white/5"
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
                    plans={data.plans}
                    reps={data.reps}
                    creditedTo={
                      booking.salesRepId
                        ? repName(booking.salesRepId)
                        : creditRepId
                          ? 'you'
                          : null
                    }
                    onCancel={() => setOpenSale(null)}
                    onSave={async (plan, amount, credit) => {
                      await data.recordSale(
                        booking.id,
                        plan,
                        amount,
                        booking.salesRepId ?? creditRepId ?? credit,
                      )
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
      <Pager
        page={paged?.page ?? 0}
        pageCount={paged?.pageCount ?? 1}
        total={total}
        noun="bookings"
        onPage={setPage}
      />
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
  const [restoring, setRestoring] = useState(false)

  const restore = async () => {
    setRestoring(true)
    try {
      await data.restoreBooking(booking.id)
      toast.success(
        `${booking.studentName}’s trial is back on ${mentorName}’s calendar.`,
      )
    } catch (error) {
      toast.error(problemText(error, 'Couldn’t restore it.'))
      setRestoring(false)
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
          {trialTimes(booking)} · {gradeCategory(booking.category).label}
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
          onClick={() => void restore()}
          disabled={problem !== null || restoring}
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

const OTHER_PLAN = 'other'

/**
 * "Enrolled": the plan the family paid for. The amount starts at the plan's
 * price and can be changed (discounts, part payments). An admin recording a
 * family no rep worked with chooses who gets the credit, if anyone.
 */
function RecordSaleForm({
  plans,
  reps,
  creditedTo,
  onSave,
  onCancel,
}: {
  plans: readonly SalesPlan[]
  reps: readonly SalesRep[]
  /** Who gets the credit; null lets the viewer (an admin) choose. */
  creditedTo: string | null
  onSave: (
    plan: string,
    amount: number,
    creditRepId: string | null,
  ) => Promise<void>
  onCancel: () => void
}) {
  const [choice, setChoice] = useState(plans.length > 0 ? '0' : OTHER_PLAN)
  const [otherPlan, setOtherPlan] = useState('')
  const [amount, setAmount] = useState(() =>
    plans[0] ? String(plans[0].amount) : '',
  )
  const [credit, setCredit] = useState('')
  const [saving, setSaving] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  const choose = (value: string) => {
    setChoice(value)
    setProblem(null)
    const plan = value === OTHER_PLAN ? undefined : plans[Number(value)]
    if (plan) setAmount(String(plan.amount))
  }

  const save = async () => {
    const plan =
      choice === OTHER_PLAN
        ? otherPlan.trim()
        : (plans[Number(choice)]?.name ?? '')
    const kes = Number(amount)
    if (!plan) {
      setProblem('Choose the plan they paid for.')
      return
    }
    if (amount.trim() === '' || !Number.isFinite(kes) || kes < 0) {
      setProblem('Enter the amount they paid, in KES.')
      return
    }
    setSaving(true)
    setProblem(null)
    try {
      await onSave(plan, Math.round(kes), credit || null)
    } catch (error) {
      setProblem(problemText(error, 'Couldn’t record the sale.'))
      setSaving(false)
    }
  }

  return (
    <div className="mt-3 rounded-xl bg-emerald-50 p-3 dark:bg-emerald-500/10">
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-[220px] flex-1 text-xs font-bold text-emerald-900 dark:text-emerald-200">
          Plan they paid for
          <select
            value={choice}
            onChange={(event) => choose(event.target.value)}
            className={`${selectClass} mt-1`}
          >
            {plans.map((option, index) => (
              <option key={option.name} value={String(index)}>
                {option.name} · {formatMoney(option.amount)}
              </option>
            ))}
            <option value={OTHER_PLAN}>Something else…</option>
          </select>
        </label>
        {choice === OTHER_PLAN && (
          <label className="min-w-[180px] flex-1 text-xs font-bold text-emerald-900 dark:text-emerald-200">
            Plan name
            <input
              value={otherPlan}
              onChange={(event) => setOtherPlan(event.target.value)}
              placeholder="e.g. Holiday bootcamp"
              className={`${inputClass} mt-1`}
            />
          </label>
        )}
        <label className="w-36 text-xs font-bold text-emerald-900 dark:text-emerald-200">
          Amount paid (KES)
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className={`${inputClass} mt-1 tabular-nums`}
          />
        </label>
        {creditedTo === null && (
          <label className="min-w-[180px] flex-1 text-xs font-bold text-emerald-900 dark:text-emerald-200">
            Credit the sale to
            <select
              value={credit}
              onChange={(event) => setCredit(event.target.value)}
              className={`${selectClass} mt-1`}
            >
              <option value="">Nobody (came in on their own)</option>
              {reps.map((rep) => (
                <option key={rep.id} value={rep.id}>
                  {rep.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {creditedTo !== null && (
        <p className="mt-2 text-xs text-emerald-900/80 dark:text-emerald-200/80">
          Credited to {creditedTo}.
        </p>
      )}
      {problem && (
        <p role="alert" className="mt-2 text-xs font-semibold text-red-600">
          {problem}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Record sale'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl px-3 py-2.5 text-sm font-bold text-slate-600 hover:bg-white/60 dark:text-slate-300"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
