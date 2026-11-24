import { useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Globe2,
  Loader2,
  RotateCcw,
  X,
  Zap,
} from 'lucide-react'
import { toast } from 'react-hot-toast'

import { TimeZoneSelect } from '../../components/TimeZoneSelect'
import { useNow } from '../../hooks/useNow'
import {
  addDaysToKey,
  browserTimeZone,
  clockIn,
  dateKeyIn,
  dateTimeIn,
  dayIn,
  isTimeZone,
  sameClock,
  timeKeyIn,
  zonedParts,
  zonedTimeToMs,
  zoneFromPhone,
  zonePlace,
} from '../../lib/timeZones'
import { BookingComplete } from './BookingComplete'
import { parentAlreadyMessaged } from './bookings'
import {
  eyebrowClass,
  SHIFT_TONE,
  stepHeadingClass,
  tutorTone,
} from './bookingStyles'
import {
  categoryForGrade,
  GRADE_CATEGORIES,
  gradeCategory,
  gradeRange,
} from './gradeCategories'
import { formatPhone } from './phone'
import { problemText, useSalesData, type SalesData } from './salesDataContext'
import {
  BOOKABLE_TIMES,
  DAY_PARTS,
  dayPartOf,
  type DayPart,
  type DayPartId,
} from './shifts'
import {
  StudentDetailsDialog,
  type BookingSession,
} from './StudentDetailsDialog'
import { draftFor, EMPTY_DRAFT, type StudentDraft } from './studentDraft'
import { InviteRequestError } from './trialInvites'
import type {
  GradeCategoryId,
  Lead,
  Mentor,
  TrialBooking,
  TrialSlot,
  TutorAvailability,
} from './types'
import { EmptyState, Initials, TutorAvatar } from './ui'

/** How far ahead the day picker reaches. */
const DAYS_AHEAD = 14
const HOUR_MS = 3_600_000
/** The latest a trial can be booked before it starts. */
const NOTICE_MS = 15 * 60_000
/** Outside these tutor-local hours a time is flagged as early or late. */
const TUTOR_DAY = { from: 7, to: 21 }

const STEPS = ['Pick a time', 'Choose a tutor', 'Student details'] as const

type ProgramFilter = GradeCategoryId | 'all'

type TimeOption = {
  ms: number
  /** Family-local "HH:MM". */
  key: string
  /** Open slots tutors have at exactly this time. */
  open: number
  past: boolean
}

type PartTimes = { part: DayPart; times: TimeOption[] }

const msOf = (iso: string) => new Date(iso).getTime()

const longDay = (key: string) => {
  const [year = 1970, month = 1, day = 1] = key.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString([], {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

/**
 * The family's zone to start from: the one saved on the parent, else their
 * phone's country (when it has one zone), else the rep's own.
 */
function familyZoneFor(lead: Lead | null, fallback: string): string {
  if (isTimeZone(lead?.timeZone)) return lead.timeZone
  return zoneFromPhone(lead?.phone) ?? fallback
}

/** Half-hour times on `day` in `zone`, plus any open slot off the grid. */
function timesFor(
  day: string,
  zone: string,
  openSlots: readonly TrialSlot[],
  now: number,
): PartTimes[] {
  const openAt = new Map<number, number>()
  for (const slot of openSlots) {
    const ms = msOf(slot.start)
    if (dateKeyIn(ms, zone) === day) openAt.set(ms, (openAt.get(ms) ?? 0) + 1)
  }
  const options = new Map<number, TimeOption>()
  const add = (ms: number, key: string) => {
    if (options.has(ms)) return
    options.set(ms, {
      ms,
      key,
      open: openAt.get(ms) ?? 0,
      past: ms <= now + NOTICE_MS,
    })
  }
  for (const key of BOOKABLE_TIMES) {
    const ms = zonedTimeToMs(day, key, zone)
    // Skipped by a daylight-saving change.
    if (timeKeyIn(ms, zone) === key) add(ms, key)
  }
  for (const ms of openAt.keys()) add(ms, timeKeyIn(ms, zone))

  const byPart = new Map<DayPartId, TimeOption[]>()
  for (const option of [...options.values()].toSorted((a, b) => a.ms - b.ms)) {
    const id = dayPartOf(option.key).id
    byPart.set(id, [...(byPart.get(id) ?? []), option])
  }
  return DAY_PARTS.map((part) => ({ part, times: byPart.get(part.id) ?? [] }))
}

/**
 * Who can take a trial at `startMs`, from the tutors' calendars. `retry`
 * checks again (after a failed booking, say); booking re-checks anyway.
 */
function useTutorAvailability(
  startMs: number | null,
  load: SalesData['tutorAvailability'],
) {
  const [result, setResult] = useState<{
    start: number
    attempt: number
    rows: TutorAvailability[] | null
    error: string | null
  } | null>(null)
  const [attempt, setAttempt] = useState(0)
  const loadRef = useRef(load)
  useEffect(() => {
    loadRef.current = load
  })

  useEffect(() => {
    if (startMs === null) return undefined
    const request = new AbortController()
    loadRef.current(new Date(startMs).toISOString()).then(
      (rows) => {
        if (!request.signal.aborted) {
          setResult({ start: startMs, attempt, rows, error: null })
        }
      },
      (error: unknown) => {
        if (!request.signal.aborted) {
          setResult({
            start: startMs,
            attempt,
            rows: null,
            error: problemText(error, 'Couldn’t check the tutors’ calendars.'),
          })
        }
      },
    )
    return () => request.abort()
  }, [startMs, attempt])

  const current = result && result.start === startMs ? result : null
  return {
    rows: current?.rows ?? null,
    error: current?.error ?? null,
    retry: () => setAttempt((value) => value + 1),
  }
}

/**
 * Time → tutor → student. The rep picks any day and time in the family's own
 * time zone (not only tutors' open slots), then a tutor who is free then: one
 * with an open slot at that time, or with nothing on their calendar around
 * it. Booking puts the trial on the tutor's calendar (with the classroom
 * link), emails the family and queues their WhatsApp confirmation.
 */
export function BookTrialWizard({
  salesRepId,
  initialLeadId = null,
}: {
  salesRepId: string | null
  /** Book for this parent (from the parents list or the trial queue). */
  initialLeadId?: string | null
}) {
  const data = useSalesData()
  const now = useNow(60_000)
  const [viewerZone] = useState(browserTimeZone)
  const [draft, setDraft] = useState<StudentDraft>(() =>
    draftFor(data.leads, data.bookings, initialLeadId),
  )
  // A rebooking starts on the student's program; otherwise every tutor shows.
  const [program, setProgram] = useState<ProgramFilter>(
    () => draft.program ?? categoryForGrade(draft.grade)?.id ?? 'all',
  )
  // A website parent arrives with the time they asked for already picked.
  const [opening] = useState(() => {
    const lead = data.leads.find((c) => c.id === initialLeadId) ?? null
    const zone = familyZoneFor(lead, viewerZone)
    const asked = lead?.requestedStart ? msOf(lead.requestedStart) : NaN
    const start = asked > Date.now() + NOTICE_MS ? asked : null
    return { zone, start, day: dateKeyIn(start ?? Date.now(), zone) }
  })
  const [zone, setZone] = useState(opening.zone)
  const [pickedDay, setPickedDay] = useState(opening.day)
  const [startMs, setStartMs] = useState<number | null>(opening.start)
  const [mentorId, setMentorId] = useState<string | null>(null)
  const [booked, setBooked] = useState<TrialBooking | null>(null)
  const [inviteSending, setInviteSending] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)

  const todayKey = dateKeyIn(now, zone)
  // Left open past midnight, yesterday's pick moves on to today.
  const day = pickedDay < todayKey ? todayKey : pickedDay
  const lead = data.leads.find((c) => c.id === draft.leadId) ?? null

  const mentors = useMemo(
    () =>
      program === 'all'
        ? data.mentors
        : data.mentors.filter((mentor) => mentor.categories.includes(program)),
    [data.mentors, program],
  )

  /** Open slots still to come, with a tutor for the program. */
  const openSlots = useMemo(() => {
    const ids = new Set(mentors.map((mentor) => mentor.id))
    return data.slots
      .filter(
        (slot) =>
          !slot.bookingId &&
          ids.has(slot.mentorId) &&
          msOf(slot.start) > now + NOTICE_MS,
      )
      .toSorted((a, b) => msOf(a.start) - msOf(b.start))
  }, [data.slots, mentors, now])

  const days = useMemo(
    () =>
      Array.from({ length: DAYS_AHEAD }, (_, offset) => {
        const key = addDaysToKey(todayKey, offset)
        const open = openSlots.filter(
          (slot) => dateKeyIn(msOf(slot.start), zone) === key,
        ).length
        return { key, open }
      }),
    [todayKey, openSlots, zone],
  )

  const parts = useMemo(
    () => timesFor(day, zone, openSlots, now),
    [day, zone, openSlots, now],
  )

  const availability = useTutorAvailability(startMs, data.tutorAvailability)

  const soonest = openSlots[0] ?? null
  const mentor = data.mentors.find((candidate) => candidate.id === mentorId)
  const mentorName = (id: string) =>
    data.mentors.find((candidate) => candidate.id === id)?.name ?? 'a tutor'

  const session: BookingSession | null =
    startMs === null
      ? null
      : {
          start: new Date(startMs).toISOString(),
          end: new Date(startMs + HOUR_MS).toISOString(),
          slotId:
            availability.rows?.find((row) => row.mentorId === mentorId)
              ?.slotId ??
            data.slots.find(
              (slot) =>
                slot.mentorId === mentorId &&
                !slot.bookingId &&
                msOf(slot.start) === startMs,
            )?.id ??
            null,
          timeZone: zone,
        }

  // Each new step takes focus (and scrolls into view) at its heading.
  const stage = booked ? 'done' : startMs !== null ? 'tutor' : 'time'
  const shownStage = useRef(stage)
  useEffect(() => {
    if (shownStage.current === stage) return
    shownStage.current = stage
    headingRef.current?.focus()
  }, [stage])

  const step = booked ? STEPS.length : mentorId ? 2 : startMs !== null ? 1 : 0

  const pickTime = (ms: number) => {
    setStartMs(ms)
    setMentorId(null)
  }

  const openSession = (chosen: TrialSlot) => {
    const ms = msOf(chosen.start)
    setPickedDay(dateKeyIn(ms, zone))
    setStartMs(ms)
    setMentorId(chosen.mentorId)
  }

  const onBooked = (booking: TrialBooking) => {
    setBooked(booking)
    setMentorId(null)
    toast.success(`Trial booked with ${mentorName(booking.mentorId)}.`)
    if (booking.classroomCode && booking.parentEmail.trim()) {
      void emailClassLink(booking)
    }
  }

  // The parent gets the classroom link straight away. Failures show on the
  // booking with a "Try again"; a 409 means it's already on its way.
  const emailClassLink = async (booking: TrialBooking) => {
    setInviteSending(true)
    try {
      const result = await data.sendInvite(booking.id)
      if (result.status === 'failed') {
        toast.error(
          `The class link email didn’t send${result.error ? `: ${result.error}` : '.'}`,
        )
      }
    } catch (error) {
      if (!(error instanceof InviteRequestError && error.status === 409)) {
        toast.error(problemText(error, 'The class link email didn’t send.'))
      }
    } finally {
      setInviteSending(false)
    }
  }

  const reset = () => {
    setDraft(EMPTY_DRAFT)
    setProgram('all')
    setZone(viewerZone)
    setPickedDay(dateKeyIn(Date.now(), viewerZone))
    setStartMs(null)
    setMentorId(null)
    setBooked(null)
  }

  // Booked by mistake: take it straight back off the calendar (a soft delete,
  // kept under "Removed") and return to the same time, keeping the details.
  const undo = async (booking: TrialBooking) => {
    const emailed =
      data.bookings.find((candidate) => candidate.id === booking.id)
        ?.inviteEmail.status === 'sent'
    const messaged = emailed || parentAlreadyMessaged(booking, data.messages)
    try {
      await data.removeBooking(booking.id, {
        reason: 'mistake',
        note: 'Undone straight after booking.',
        byRepId: salesRepId,
      })
    } catch (error) {
      toast.error(problemText(error, 'Couldn’t undo the booking.'))
      return
    }
    setBooked(null)
    setPickedDay(dateKeyIn(msOf(booking.start), zone))
    setStartMs(msOf(booking.start))
    toast(
      messaged
        ? `Booking undone. The parent already had the ${emailed ? 'class link email' : 'confirmation'}, so let them know on WhatsApp.`
        : 'Booking undone. The time is free again and the WhatsApp confirmation won’t be sent.',
      { duration: 6000 },
    )
  }

  return (
    <div className="overflow-hidden rounded-[28px] border border-orange-100/80 bg-[#fbf7f5] dark:border-white/10 dark:bg-slate-950/40">
      <header className="relative px-4 pt-8 pb-6 text-center sm:px-8 sm:pt-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(251,146,60,0.16),transparent_45%),radial-gradient(circle_at_88%_8%,rgba(167,139,250,0.18),transparent_45%)]"
        />
        <div className="relative">
          <p className={eyebrowClass}>Coding trial bookings</p>
          <h2 className="mt-3 text-[32px] leading-[1.05] font-black tracking-tight text-balance sm:text-5xl">
            <span className="text-fuchsia-900 dark:text-white">
              Great learning{' '}
            </span>
            <span className="bg-linear-to-r from-orange-600 via-pink-500 to-violet-700 bg-clip-text text-transparent dark:from-orange-300 dark:via-pink-300 dark:to-violet-300">
              starts here.
            </span>
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-slate-600 sm:text-base dark:text-slate-300">
            Pick any time that suits the family, choose a free tutor and get the
            student booked in minutes.
          </p>
          <Steps current={step} />
        </div>
      </header>

      <div className="px-2 pb-2 sm:px-6 sm:pb-6">
        {lead && !booked && (
          <ParentBanner lead={lead} onClear={() => setDraft(EMPTY_DRAFT)} />
        )}
        <section className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-[0_24px_60px_-36px_rgba(88,28,135,0.4)] sm:p-8 dark:border-white/10 dark:bg-slate-900 dark:shadow-none">
          {booked ? (
            <BookingComplete
              booking={booked}
              inviteSending={inviteSending}
              headingRef={headingRef}
              onBookAnother={reset}
              onUndo={() => void undo(booked)}
            />
          ) : startMs !== null ? (
            <TutorStage
              headingRef={headingRef}
              startMs={startMs}
              zone={zone}
              viewerZone={viewerZone}
              mentors={mentors}
              allMentors={data.mentors}
              availability={availability.rows}
              availabilityError={availability.error}
              onRetry={availability.retry}
              program={program}
              onProgram={setProgram}
              onBack={() => {
                setStartMs(null)
                setMentorId(null)
              }}
              onPick={setMentorId}
            />
          ) : (
            <TimeStage
              headingRef={headingRef}
              program={program}
              onProgram={setProgram}
              zone={zone}
              onZone={setZone}
              viewerZone={viewerZone}
              now={now}
              days={days}
              day={day}
              onDay={setPickedDay}
              parts={parts}
              onPick={pickTime}
              soonest={soonest}
              soonestTutor={soonest ? mentorName(soonest.mentorId) : ''}
              onSoonest={openSession}
            />
          )}
        </section>
      </div>

      {session && mentor && !booked && (
        <StudentDetailsDialog
          session={session}
          mentor={mentor}
          draft={draft}
          onDraftChange={setDraft}
          salesRepId={salesRepId}
          onClose={() => {
            setMentorId(null)
            // Someone may have taken the time meanwhile.
            availability.retry()
          }}
          onBooked={onBooked}
        />
      )}
    </div>
  )
}

function Steps({ current }: { current: number }) {
  return (
    <ol
      aria-label="Booking progress"
      className="mt-7 flex items-center justify-center gap-2 sm:gap-3"
    >
      {STEPS.map((label, index) => {
        const done = index < current
        const active = index === current
        return (
          <li
            key={label}
            aria-current={active ? 'step' : undefined}
            className="flex items-center gap-2 sm:gap-3"
          >
            {index > 0 && (
              <span
                aria-hidden
                className={`h-px w-5 sm:w-10 ${
                  done || active
                    ? 'bg-violet-900/40 dark:bg-violet-300/50'
                    : 'bg-slate-300 dark:bg-white/15'
                }`}
              />
            )}
            <span
              className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-black transition-colors duration-300 ${
                done || active
                  ? 'bg-violet-900 text-white dark:bg-violet-300 dark:text-slate-950'
                  : 'bg-slate-200/80 text-slate-500 dark:bg-white/10 dark:text-slate-400'
              } ${active ? 'ring-4 ring-violet-900/10 dark:ring-violet-300/20' : ''}`}
            >
              {done ? (
                <Check size={14} strokeWidth={3} aria-hidden />
              ) : (
                index + 1
              )}
            </span>
            <span
              className={`text-xs font-bold ${active ? 'inline' : 'hidden sm:inline'} ${
                done || active
                  ? 'text-violet-950 dark:text-white'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {label}
              {done && <span className="sr-only"> (done)</span>}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function ParentBanner({ lead, onClear }: { lead: Lead; onClear: () => void }) {
  return (
    <div className="mb-3 flex items-center gap-3 rounded-2xl border border-violet-200/70 bg-white/70 px-4 py-2.5 dark:border-violet-400/20 dark:bg-white/5">
      <Initials name={lead.parentName} size={30} />
      <p className="min-w-0 flex-1 truncate text-sm text-slate-600 dark:text-slate-300">
        Booking for{' '}
        <strong className="font-extrabold text-slate-900 dark:text-white">
          {lead.parentName}
        </strong>
        <span className="tabular-nums"> · {formatPhone(lead.phone)}</span>
      </p>
      <button
        type="button"
        onClick={onClear}
        className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white"
      >
        <X size={14} aria-hidden /> Someone else
      </button>
    </div>
  )
}

function StepHeading({
  eyebrow,
  title,
  subtitle,
  headingRef,
}: {
  eyebrow: string
  title: string
  subtitle: string
  headingRef: RefObject<HTMLHeadingElement>
}) {
  return (
    <div>
      <p className={eyebrowClass}>{eyebrow}</p>
      <h3 ref={headingRef} tabIndex={-1} className={`mt-2 ${stepHeadingClass}`}>
        {title}
      </h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {subtitle}
      </p>
    </div>
  )
}

const PROGRAM_OPTIONS: { id: ProgramFilter; label: string; grades: string }[] =
  [
    { id: 'all', label: 'All programs', grades: 'K–12' },
    ...GRADE_CATEGORIES.map((category) => ({
      id: category.id,
      label: category.label,
      grades: gradeRange(category),
    })),
  ]

/** Narrows the tutors to those who teach the student's program. */
function ProgramFilterChips({
  value,
  onChange,
}: {
  value: ProgramFilter
  onChange: (program: ProgramFilter) => void
}) {
  return (
    <fieldset className="mt-6 min-w-0">
      <legend className="mb-2 text-xs font-bold text-slate-500 dark:text-slate-400">
        Who’s the trial for?
      </legend>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {PROGRAM_OPTIONS.map((option) => {
          const active = value === option.id
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.id)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors ${
                active
                  ? 'border-violet-900 bg-violet-900 text-white dark:border-violet-300 dark:bg-violet-300 dark:text-slate-950'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:text-violet-900 dark:border-white/10 dark:bg-transparent dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              {option.label}{' '}
              <span className={active ? 'opacity-70' : 'text-slate-400'}>
                · {option.grades}
              </span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

const chipBase =
  'flex min-h-12 flex-col items-center justify-center rounded-xl border px-2 py-1.5 text-center transition-[background-color,border-color,scale] duration-150 active:scale-[0.97]'

function TimeStage({
  headingRef,
  program,
  onProgram,
  zone,
  onZone,
  viewerZone,
  now,
  days,
  day,
  onDay,
  parts,
  onPick,
  soonest,
  soonestTutor,
  onSoonest,
}: {
  headingRef: RefObject<HTMLHeadingElement>
  program: ProgramFilter
  onProgram: (program: ProgramFilter) => void
  zone: string
  onZone: (zone: string) => void
  viewerZone: string
  now: number
  days: readonly { key: string; open: number }[]
  day: string
  onDay: (day: string) => void
  parts: readonly PartTimes[]
  onPick: (ms: number) => void
  soonest: TrialSlot | null
  soonestTutor: string
  onSoonest: (slot: TrialSlot) => void
}) {
  const showYours = !sameClock(now, zone, viewerZone)
  const nowThere = zonedParts(now, zone)

  return (
    <>
      <StepHeading
        headingRef={headingRef}
        eyebrow="Step 01"
        title="When suits the family?"
        subtitle="Any time works: you’ll match a free tutor next. Times are in the family’s own time zone."
      />
      <ProgramFilterChips value={program} onChange={onProgram} />

      <div className="mt-5 grid gap-2 sm:grid-cols-[minmax(0,22rem)_1fr] sm:items-end">
        <div className="min-w-0">
          <label
            htmlFor="family-zone"
            className="mb-2 flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400"
          >
            <Globe2 size={14} aria-hidden /> Family’s time zone
          </label>
          <TimeZoneSelect
            id="family-zone"
            value={zone}
            onChange={onZone}
            aria-describedby="family-zone-now"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-800 focus:border-violet-400 focus:ring-2 focus:ring-violet-200 focus:outline-none dark:border-white/10 dark:bg-slate-950 dark:text-white dark:focus:ring-violet-500/30"
          />
        </div>
        <p
          id="family-zone-now"
          className="pb-2.5 text-xs text-slate-500 dark:text-slate-400"
        >
          It’s{' '}
          <strong className="font-extrabold text-slate-800 tabular-nums dark:text-white">
            {clockIn(now, zone)}
          </strong>{' '}
          {nowThere.hour < 5 ? 'at night ' : ''}in {zonePlace(zone)} now
          {showYours ? ` (${clockIn(now, viewerZone)} for you)` : ''}.
        </p>
      </div>

      <fieldset className="mt-5 min-w-0">
        <legend className="mb-2 text-xs font-bold text-slate-500 dark:text-slate-400">
          Day
        </legend>
        <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-2">
          {days.map(({ key, open }, index) => {
            const [year = 1970, month = 1, date = 1] = key
              .split('-')
              .map(Number)
            const asDate = new Date(Date.UTC(year, month - 1, date))
            const active = key === day
            return (
              <button
                key={key}
                type="button"
                aria-pressed={active}
                aria-label={`${longDay(key)}${open ? `: ${open} open slots` : ''}`}
                onClick={() => onDay(key)}
                className={`flex w-[4.5rem] shrink-0 snap-start flex-col items-center rounded-2xl border px-2 py-2.5 transition-colors ${
                  active
                    ? 'border-violet-900 bg-violet-900 text-white dark:border-violet-300 dark:bg-violet-300 dark:text-slate-950'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-violet-300 dark:border-white/10 dark:bg-transparent dark:text-slate-200 dark:hover:border-violet-400/50'
                }`}
              >
                <span className="text-[11px] font-bold tracking-wide uppercase opacity-80">
                  {index === 0
                    ? 'Today'
                    : asDate.toLocaleDateString([], {
                        timeZone: 'UTC',
                        weekday: 'short',
                      })}
                </span>
                <span className="text-xl leading-tight font-black tabular-nums">
                  {date}
                </span>
                <span className="text-[11px] opacity-70">
                  {asDate.toLocaleDateString([], {
                    timeZone: 'UTC',
                    month: 'short',
                  })}
                </span>
                <span
                  className={`mt-1.5 rounded-full px-1.5 py-px text-[10px] font-extrabold ${
                    active
                      ? 'bg-white/20'
                      : open
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                        : 'text-slate-400'
                  }`}
                >
                  {open ? `${open} open` : 'Any time'}
                </span>
              </button>
            )
          })}
        </div>
      </fieldset>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-bold text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2 rounded-full bg-emerald-500" />A
          tutor has an open slot then
        </span>
        <span>Any other time: book whichever tutor is free.</span>
      </div>

      <div className="mt-3 space-y-4">
        {parts.map(({ part, times }) => {
          if (times.length === 0) return null
          const Icon = part.icon
          const tone = SHIFT_TONE[part.tone]
          const left = times.filter((time) => !time.past).length
          return (
            <section
              key={part.id}
              aria-label={part.label}
              className={`rounded-2xl border p-3 sm:p-4 ${tone.card}`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`flex size-8 items-center justify-center rounded-lg ${tone.icon}`}
                >
                  <Icon size={16} aria-hidden />
                </span>
                <p className="text-sm font-extrabold">{part.label}</p>
                {left === 0 && (
                  <span className="text-xs font-bold opacity-70">
                    Already over
                  </span>
                )}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                {times.map((time) => (
                  <button
                    key={time.ms}
                    type="button"
                    disabled={time.past}
                    onClick={() => onPick(time.ms)}
                    aria-label={`${clockIn(time.ms, zone)} in ${zonePlace(zone)}${
                      showYours
                        ? `, ${clockIn(time.ms, viewerZone)} your time`
                        : ''
                    }${time.open ? `, ${time.open} open slot${time.open === 1 ? '' : 's'}` : ''}`}
                    className={`${chipBase} ${
                      time.past
                        ? 'cursor-not-allowed border-transparent bg-white/40 text-slate-400 dark:bg-white/5 dark:text-slate-500'
                        : time.open
                          ? 'border-emerald-300 bg-white text-emerald-900 hover:border-emerald-500 hover:bg-emerald-50 dark:border-emerald-400/40 dark:bg-slate-900 dark:text-emerald-100 dark:hover:bg-emerald-500/15'
                          : 'border-white/80 bg-white/90 text-slate-800 hover:border-violet-400 hover:bg-white dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:border-violet-400/60'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1 text-sm font-extrabold tabular-nums">
                      {time.open > 0 && !time.past && (
                        <span
                          aria-hidden
                          className="size-1.5 rounded-full bg-emerald-500"
                        />
                      )}
                      {clockIn(time.ms, zone)}
                    </span>
                    {showYours && (
                      <span className="text-[10px] font-semibold tabular-nums opacity-70">
                        {clockIn(time.ms, viewerZone)} yours
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </section>
          )
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-violet-50/80 px-4 py-3 text-sm text-slate-600 dark:bg-white/5 dark:text-slate-300">
        <Zap size={16} className="shrink-0 text-orange-500" aria-hidden />
        {soonest ? (
          <>
            <span className="min-w-0 flex-1">
              Soonest open slot:{' '}
              <strong className="font-extrabold text-slate-900 dark:text-white">
                {dateTimeIn(soonest.start, zone)}
              </strong>{' '}
              ({zonePlace(zone)}) with {soonestTutor}
            </span>
            <button
              type="button"
              onClick={() => onSoonest(soonest)}
              className="inline-flex items-center gap-1 rounded-lg px-1.5 py-1 font-extrabold text-violet-800 transition-colors hover:bg-violet-100 dark:text-violet-300 dark:hover:bg-white/10"
            >
              Book it <ArrowRight size={14} aria-hidden />
            </button>
          </>
        ) : (
          <span className="min-w-0 flex-1">
            No open slots coming up
            {program === 'all' ? '' : ' for this program'}, so pick any time and
            choose a tutor who’s free.
          </span>
        )}
      </div>
    </>
  )
}

type TutorRow = {
  mentor: Mentor
  status: 'open' | 'free' | 'busy'
  /** The time for the tutor, when their clock differs from the family's. */
  theirTime: string | null
  /** Early or late in the tutor's own day. */
  offHours: 'early' | 'late' | null
}

const STATUS_RANK: Record<TutorRow['status'], number> = {
  open: 0,
  free: 1,
  busy: 2,
}

const STATUS_PILL: Record<TutorRow['status'], { label: string; tone: string }> =
  {
    open: {
      label: 'Open slot',
      tone: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    },
    free: {
      label: 'Free then',
      tone: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
    },
    busy: {
      label: 'In a class',
      tone: 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400',
    },
  }

function TutorStage({
  headingRef,
  startMs,
  zone,
  viewerZone,
  mentors,
  allMentors,
  availability,
  availabilityError,
  onRetry,
  program,
  onProgram,
  onBack,
  onPick,
}: {
  headingRef: RefObject<HTMLHeadingElement>
  startMs: number
  zone: string
  viewerZone: string
  /** Tutors for the chosen program. */
  mentors: readonly Mentor[]
  allMentors: readonly Mentor[]
  availability: readonly TutorAvailability[] | null
  availabilityError: string | null
  onRetry: () => void
  program: ProgramFilter
  onProgram: (program: ProgramFilter) => void
  onBack: () => void
  onPick: (mentorId: string) => void
}) {
  const endMs = startMs + HOUR_MS
  const byMentor = new Map(
    (availability ?? []).map((row) => [row.mentorId, row]),
  )
  // Only active tutors come back from the calendar check.
  const rows: TutorRow[] = mentors
    .flatMap((mentor) => {
      const found = byMentor.get(mentor.id)
      if (!found) return []
      const tutorZone = found.timeZone
      const startHour = zonedParts(startMs, tutorZone).hour
      const end = zonedParts(endMs, tutorZone)
      const endHour = end.hour + end.minute / 60
      return [
        {
          mentor,
          status: found.slotId ? 'open' : found.busy ? 'busy' : 'free',
          theirTime: sameClock(startMs, tutorZone, zone)
            ? null
            : `${clockIn(startMs, tutorZone)}${
                dateKeyIn(startMs, tutorZone) === dateKeyIn(startMs, zone)
                  ? ''
                  : ` ${dayIn(startMs, tutorZone)}`
              } in ${zonePlace(tutorZone)}`,
          offHours:
            startHour < TUTOR_DAY.from
              ? 'early'
              : endHour > TUTOR_DAY.to || endHour < startHour
                ? 'late'
                : null,
        } satisfies TutorRow,
      ]
    })
    .toSorted(
      (a, b) =>
        STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
        Number(a.offHours !== null) - Number(b.offHours !== null) ||
        a.mentor.name.localeCompare(b.mentor.name),
    )
  const free = rows.filter((row) => row.status !== 'busy').length
  const yours = sameClock(startMs, zone, viewerZone)
    ? null
    : `${clockIn(startMs, viewerZone)} – ${clockIn(endMs, viewerZone)}${
        dateKeyIn(startMs, viewerZone) === dateKeyIn(startMs, zone)
          ? ''
          : ` ${dayIn(startMs, viewerZone)}`
      } your time (${zonePlace(viewerZone)})`

  return (
    <>
      <StepHeading
        headingRef={headingRef}
        eyebrow="Step 02"
        title="Who will teach it?"
        subtitle="Any tutor with an open slot, or nothing on their calendar around this time, can take it."
      />
      <button
        type="button"
        onClick={onBack}
        className="mt-5 inline-flex items-center gap-1.5 rounded-lg py-1 pr-2 text-sm font-extrabold text-violet-800 transition-colors hover:text-violet-950 dark:text-violet-300 dark:hover:text-white"
      >
        <ArrowLeft size={16} aria-hidden /> Change the time
      </button>

      <div className="mt-3 rounded-2xl border border-violet-200/80 bg-violet-50/80 p-4 text-violet-950 dark:border-violet-300/15 dark:bg-violet-400/10 dark:text-violet-50">
        <p className="text-xs font-bold opacity-75">
          For the family · {zonePlace(zone)}
        </p>
        <p className="mt-0.5 text-lg font-extrabold">
          {dayIn(startMs, zone)} · {clockIn(startMs, zone)} –{' '}
          {clockIn(endMs, zone)}
        </p>
        {yours && <p className="mt-1 text-sm opacity-80">{yours}</p>}
      </div>

      <ProgramFilterChips value={program} onChange={onProgram} />

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2 rounded-full bg-emerald-500" />
          Open slot: the tutor opened this hour
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2 rounded-full bg-sky-500" />
          Free: nothing on their calendar then
        </span>
      </div>

      {availabilityError ? (
        <div
          role="alert"
          className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
        >
          <AlertTriangle size={16} aria-hidden />
          <span className="min-w-0 flex-1">{availabilityError}</span>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-extrabold hover:bg-rose-100 dark:hover:bg-rose-500/20"
          >
            <RotateCcw size={14} aria-hidden /> Try again
          </button>
        </div>
      ) : availability === null ? (
        <output className="mt-3 flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-6 text-sm font-semibold text-slate-500 dark:border-white/10 dark:text-slate-400">
          <Loader2 size={16} className="animate-spin" aria-hidden /> Checking
          the tutors’ calendars…
        </output>
      ) : rows.length === 0 ? (
        <div className="mt-3">
          <EmptyState>
            No {program === 'all' ? '' : `${gradeCategory(program).label} `}
            tutors are taking trials yet.
            {program === 'all' ? '' : ' Try another program.'}
          </EmptyState>
        </div>
      ) : (
        <>
          {free === 0 && (
            <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
              Every tutor is in a class around then. Change the time to see
              who’s free.
            </p>
          )}
          <ul className="mt-3 space-y-3">
            {rows.map((row) => (
              <TutorChoice
                key={row.mentor.id}
                row={row}
                tone={tutorTone(row.mentor.id, allMentors)}
                onPick={() => onPick(row.mentor.id)}
              />
            ))}
          </ul>
        </>
      )}
    </>
  )
}

function TutorChoice({
  row,
  tone,
  onPick,
}: {
  row: TutorRow
  tone: ReturnType<typeof tutorTone>
  onPick: () => void
}) {
  const { mentor, status, theirTime, offHours } = row
  const pill = STATUS_PILL[status]
  const first = mentor.name.split(/\s+/)[0] || mentor.name
  const busy = status === 'busy'
  return (
    <li
      className={`flex flex-wrap items-center gap-3 rounded-2xl border p-4 sm:flex-nowrap sm:p-5 ${
        busy
          ? 'border-slate-200 opacity-60 dark:border-white/10'
          : 'border-slate-200 dark:border-white/10'
      }`}
    >
      <TutorAvatar name={mentor.name} tone={tone} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 font-extrabold text-slate-900 dark:text-white">
          {mentor.name}
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${pill.tone}`}
          >
            {pill.label}
          </span>
        </p>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
          {mentor.categories.map((id) => gradeCategory(id).label).join(' · ')}
        </p>
        {(theirTime || offHours) && (
          <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
            {theirTime && <span className="tabular-nums">{theirTime}</span>}
            {offHours && (
              <span className="text-amber-700 dark:text-amber-300">
                {theirTime ? ' · ' : ''}
                {offHours === 'early' ? 'Early' : 'Late'} for {first}: check
                they can make it
              </span>
            )}
          </p>
        )}
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={onPick}
        aria-label={
          busy
            ? `${mentor.name} is in a class then`
            : `Book with ${mentor.name}`
        }
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-extrabold transition-[background-color,scale] duration-150 active:scale-[0.97] ${
          busy
            ? 'cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500'
            : 'bg-violet-900 text-white hover:bg-violet-800 dark:bg-violet-300 dark:text-slate-950 dark:hover:bg-violet-200'
        }`}
      >
        {busy ? (
          'Busy'
        ) : (
          <>
            <Check size={14} aria-hidden /> Book {first}
          </>
        )}
      </button>
    </li>
  )
}
