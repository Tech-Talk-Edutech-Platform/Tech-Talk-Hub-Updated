import { useMemo, useState } from 'react'
import { CalendarPlus, Contact, Search, UserPlus } from 'lucide-react'
import { toast } from 'react-hot-toast'

import { useNow } from '../../hooks/useNow'
import { AddParentForm } from './AddParentForm'
import { needsRebooking, timeAgo, visibleLeads, waitingForTrial } from './leads'
import { pageOf } from './paging'
import { formatPhone } from './phone'
import { problemText, useSalesData } from './salesDataContext'
import { primaryButton, searchInputClass } from './styles'
import type { Lead, TrialBooking } from './types'
import { SOURCE_LABEL } from './types'
import {
  ContactButtons,
  EmptyState,
  Initials,
  LeadStatusBadge,
  Pager,
  Panel,
  StatusBadge,
} from './ui'
import { introMessage, trialTime } from './whatsapp'

type Filter = 'to-contact' | 'booked' | 'not-interested' | 'all'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'to-contact', label: 'To contact' },
  { id: 'booked', label: 'Upcoming trial' },
  { id: 'not-interested', label: 'Not interested' },
  { id: 'all', label: 'All' },
]

const PAGE_SIZE = 15

const smallButton =
  'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-extrabold transition'

/**
 * The parents the team reaches out to. A rep sees their own parents plus new
 * ones nobody has picked up yet; `repId` null (admins) shows everyone.
 */
export function ParentsList({
  repId,
  onBook,
}: {
  repId: string | null
  onBook: (leadId: string) => void
}) {
  const data = useSalesData()
  const now = useNow(60_000)
  const [filter, setFilter] = useState<Filter>('to-contact')
  const [query, setQuery] = useState('')
  const [adding, setAdding] = useState(false)
  const [page, setPage] = useState(0)

  const repName =
    repId === null
      ? null
      : (data.reps.find((rep) => rep.id === repId)?.name ?? null)
  const bookingFor = (lead: Lead) =>
    data.bookings.find((booking) => booking.id === lead.bookingId)

  const groups = useMemo(() => {
    const byId = new Map(data.bookings.map((b) => [b.id, b]))
    const visible = visibleLeads(data.leads, repId)
    const toContact = visible.filter((lead) => waitingForTrial(lead, byId))
    return {
      'to-contact': toContact,
      booked: visible.filter(
        (lead) =>
          lead.status === 'trial_booked' &&
          byId.get(lead.bookingId ?? '')?.status === 'scheduled',
      ),
      'not-interested': visible.filter(
        (lead) => lead.status === 'not_interested',
      ),
      all: visible,
    } satisfies Record<Filter, Lead[]>
  }, [data.leads, data.bookings, repId])

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const digits = needle.replace(/\D/g, '')
    const matches = groups[filter].filter(
      (lead) =>
        !needle ||
        lead.parentName.toLowerCase().includes(needle) ||
        lead.email.toLowerCase().includes(needle) ||
        (digits.length >= 3 && lead.phone.includes(digits)),
    )
    const newest = (a: Lead, b: Lead) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    // Parents nobody has spoken to yet come first.
    return filter === 'to-contact'
      ? matches.toSorted(
          (a, b) =>
            Number(b.status === 'new') - Number(a.status === 'new') ||
            newest(a, b),
        )
      : matches.toSorted(newest)
  }, [groups, filter, query])
  const paged = pageOf(rows, page, PAGE_SIZE)

  return (
    <div className="space-y-4">
      {adding && (
        <Panel title="Add a parent" icon={UserPlus}>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            Just their contact details for now. You’ll add the child’s details
            when you book the trial, after you’ve spoken to them.
          </p>
          <AddParentForm
            salesRepId={repId}
            submitLabel="Save parent"
            onCancel={() => setAdding(false)}
            onSaved={(lead) => {
              setAdding(false)
              setFilter('to-contact')
              setQuery('')
              setPage(0)
              toast.success(`${lead.parentName} added. Reach out next!`)
            }}
          />
        </Panel>
      )}

      <Panel
        title="Parents"
        icon={Contact}
        action={
          !adding && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className={primaryButton}
            >
              <UserPlus size={16} aria-hidden /> Add parent
            </button>
          )
        }
      >
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <fieldset className="inline-flex max-w-full min-w-0 overflow-x-auto rounded-xl bg-slate-100 p-1 dark:bg-white/5">
            <legend className="sr-only">Show parents</legend>
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
                {option.label}{' '}
                <span className="tabular-nums opacity-70">
                  {groups[option.id].length}
                </span>
              </button>
            ))}
          </fieldset>
          <label className="relative block lg:w-72">
            <span className="sr-only">Search parents</span>
            <Search
              size={16}
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setPage(0)
              }}
              placeholder="Name, phone or email"
              className={searchInputClass}
            />
          </label>
        </div>

        {rows.length === 0 ? (
          <EmptyState>
            {query
              ? 'No parents match that search.'
              : filter === 'to-contact'
                ? 'Everyone has been contacted. Add a parent when a new lead comes in.'
                : 'No parents here yet.'}
          </EmptyState>
        ) : (
          <>
            <ul className="divide-y divide-slate-100 dark:divide-white/10">
              {paged.items.map((lead) => (
                <ParentRow
                  key={lead.id}
                  lead={lead}
                  booking={bookingFor(lead)}
                  now={now}
                  showRep={repId === null}
                  repName={repName}
                  onBook={() => onBook(lead.id)}
                  onStatus={async (status) => {
                    try {
                      await data.setLeadStatus(lead.id, status, repId)
                      if (status === 'not_interested') {
                        toast(`${lead.parentName} moved to “Not interested”.`)
                      }
                    } catch (error) {
                      toast.error(
                        problemText(error, 'Couldn’t update the parent.'),
                      )
                    }
                  }}
                />
              ))}
            </ul>
            <Pager
              page={paged.page}
              pageCount={paged.pageCount}
              total={rows.length}
              noun="parents"
              onPage={setPage}
            />
          </>
        )}
      </Panel>
    </div>
  )
}

function ParentRow({
  lead,
  booking,
  now,
  showRep,
  repName,
  onBook,
  onStatus,
}: {
  lead: Lead
  booking: TrialBooking | undefined
  now: number
  showRep: boolean
  repName: string | null
  onBook: () => void
  onStatus: (status: 'contacted' | 'not_interested') => Promise<void>
}) {
  const data = useSalesData()
  const [busy, setBusy] = useState(false)
  const setStatus = async (status: 'contacted' | 'not_interested') => {
    setBusy(true)
    try {
      await onStatus(status)
    } finally {
      setBusy(false)
    }
  }
  const rebook = lead.status === 'trial_booked' && needsRebooking(booking)
  const open = lead.status === 'new' || lead.status === 'contacted'
  const mentor = booking
    ? data.mentors.find((candidate) => candidate.id === booking.mentorId)
    : undefined
  const owner = lead.salesRepId
    ? (data.reps.find((rep) => rep.id === lead.salesRepId)?.name ?? '—')
    : null

  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 gap-3">
        <Initials name={lead.parentName} size={36} />
        <div className="min-w-0 space-y-1">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-extrabold text-slate-900 dark:text-white">
              {lead.parentName}
            </span>
            {/* After the trial, its outcome says more than "Trial booked". */}
            {booking &&
            lead.status === 'trial_booked' &&
            booking.status !== 'scheduled' ? (
              <StatusBadge status={booking.status} />
            ) : (
              <LeadStatusBadge status={lead.status} />
            )}
            {rebook && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800 ring-1 ring-amber-200 ring-inset dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30">
                {booking?.status === 'no_show'
                  ? 'Missed trial'
                  : 'Trial cancelled'}
              </span>
            )}
            {!owner && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                Unassigned
              </span>
            )}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            <span className="tabular-nums">{formatPhone(lead.phone)}</span>
            {lead.email && (
              <>
                {' · '}
                <span className="break-all">{lead.email}</span>
              </>
            )}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {SOURCE_LABEL[lead.source]} · added {timeAgo(lead.createdAt, now)}
            {lead.lastContactedAt &&
              ` · last contacted ${timeAgo(lead.lastContactedAt, now)}`}
            {showRep && ` · ${owner ?? 'nobody yet'}`}
          </p>
          {booking && lead.status === 'trial_booked' && (
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              Trial for {booking.studentName} · {trialTime(booking.start)}
              {mentor && ` · ${mentor.name}`}
            </p>
          )}
          {lead.notes && (
            <p className="text-xs text-slate-500 italic dark:text-slate-400">
              “{lead.notes}”
            </p>
          )}
          {(open || rebook) && (
            <div className="pt-1">
              <ContactButtons
                phone={lead.phone}
                email={lead.email}
                message={introMessage(lead.parentName, repName)}
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap gap-2 pl-12 sm:flex-col sm:items-end sm:pl-0">
        {(open || rebook) && (
          <button
            type="button"
            onClick={onBook}
            className={`${smallButton} bg-purple-600 text-white hover:bg-purple-700`}
          >
            <CalendarPlus size={14} aria-hidden />
            {rebook ? 'Rebook trial' : 'Book trial'}
          </button>
        )}
        {lead.status === 'new' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void setStatus('contacted')}
            className={`${smallButton} border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5`}
          >
            Mark contacted
          </button>
        )}
        {open && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void setStatus('not_interested')}
            className={`${smallButton} text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50 dark:hover:bg-white/5 dark:hover:text-white`}
          >
            Not interested
          </button>
        )}
        {lead.status === 'not_interested' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void setStatus('contacted')}
            className={`${smallButton} border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5`}
          >
            Reopen
          </button>
        )}
      </div>
    </li>
  )
}
