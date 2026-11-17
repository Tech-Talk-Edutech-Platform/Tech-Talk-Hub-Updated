import { useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  X,
  Zap,
} from 'lucide-react'
import { toast } from 'react-hot-toast'

import { useNow } from '../../hooks/useNow'
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
import { problemText, useSalesData } from './salesDataContext'
import {
  addDays,
  SHIFTS,
  shiftEnd,
  shiftHours,
  shiftOf,
  startOfDay,
  type Shift,
  type ShiftId,
} from './shifts'
import { StudentDetailsDialog } from './StudentDetailsDialog'
import { draftFor, EMPTY_DRAFT, type StudentDraft } from './studentDraft'
import { InviteRequestError } from './trialInvites'
import type {
  GradeCategoryId,
  Lead,
  Mentor,
  TrialBooking,
  TrialSlot,
} from './types'
import { EmptyState, Initials, TutorAvatar } from './ui'
import { trialTime } from './whatsapp'

/** How far ahead the day picker reaches. */
const DAYS_AHEAD = 14

const STEPS = ['Choose a shift', 'Pick a tutor', 'Student details'] as const

type ProgramFilter = GradeCategoryId | 'all'

type ShiftStat = { shift: Shift; open: number; booked: number; over: boolean }

const msOf = (iso: string) => new Date(iso).getTime()
const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
const longDay = (ms: number) =>
  new Date(ms).toLocaleDateString([], {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

/**
 * Shift → tutor → student, like the booking portal. The rep picks a day and a
 * two-hour shift, then one of the tutors' open one-hour sessions, then fills
 * in the parent and student. Booking puts the trial on the tutor's calendar
 * (with the meeting link) and queues the parent's WhatsApp confirmation.
 */
export function BookTrialWizard({
  salesRepId,
  initialLeadId = null,
}: {
  salesRepId: string | null
  /** Book for this parent (from the parents list). */
  initialLeadId?: string | null
}) {
  const data = useSalesData()
  const now = useNow(60_000)
  const today = startOfDay(now)
  const [draft, setDraft] = useState<StudentDraft>(() =>
    draftFor(data.leads, data.bookings, initialLeadId),
  )
  // A rebooking starts on the student's program; otherwise every tutor shows.
  const [program, setProgram] = useState<ProgramFilter>(
    () => draft.program ?? categoryForGrade(draft.grade)?.id ?? 'all',
  )
  const [pickedDay, setPickedDay] = useState(today)
  const [shiftId, setShiftId] = useState<ShiftId | null>(null)
  const [slotId, setSlotId] = useState<string | null>(null)
  const [booked, setBooked] = useState<TrialBooking | null>(null)
  const [inviteSending, setInviteSending] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)

  // Left open past midnight, yesterday's pick moves on to today.
  const day = Math.max(pickedDay, today)
  const lead = data.leads.find((c) => c.id === draft.leadId) ?? null

  const mentors = useMemo(
    () =>
      program === 'all'
        ? data.mentors
        : data.mentors.filter((mentor) => mentor.categories.includes(program)),
    [data.mentors, program],
  )

  /** Sessions still to come, inside a shift, with a tutor for the program. */
  const upcoming = useMemo(() => {
    const ids = new Set(mentors.map((mentor) => mentor.id))
    return data.slots
      .filter(
        (slot) =>
          ids.has(slot.mentorId) &&
          msOf(slot.start) > now &&
          shiftOf(slot.start) !== undefined,
      )
      .toSorted((a, b) => msOf(a.start) - msOf(b.start))
  }, [data.slots, mentors, now])

  const days = useMemo(
    () =>
      Array.from({ length: DAYS_AHEAD }, (_, offset) => {
        const start = addDays(today, offset)
        const end = addDays(today, offset + 1)
        const open = upcoming.filter(
          (slot) =>
            !slot.bookingId &&
            msOf(slot.start) >= start &&
            msOf(slot.start) < end,
        ).length
        return { start, open }
      }),
    [today, upcoming],
  )

  const daySlots = useMemo(() => {
    const end = addDays(day, 1)
    return upcoming.filter(
      (slot) => msOf(slot.start) >= day && msOf(slot.start) < end,
    )
  }, [upcoming, day])

  const shiftStats = useMemo<ShiftStat[]>(
    () =>
      SHIFTS.map((shift) => {
        const inShift = daySlots.filter(
          (slot) => shiftOf(slot.start)?.id === shift.id,
        )
        const open = inShift.filter((slot) => !slot.bookingId).length
        return {
          shift,
          open,
          booked: inShift.length - open,
          over: shiftEnd(shift, day) <= now,
        }
      }),
    [daySlots, day, now],
  )

  const soonest = upcoming.find((slot) => !slot.bookingId) ?? null
  const shift = SHIFTS.find((candidate) => candidate.id === shiftId) ?? null
  const slot = data.slots.find((candidate) => candidate.id === slotId) ?? null
  const slotMentor = slot
    ? data.mentors.find((mentor) => mentor.id === slot.mentorId)
    : undefined
  const mentorName = (id: string) =>
    data.mentors.find((mentor) => mentor.id === id)?.name ?? 'a tutor'

  // Each new step takes focus (and scrolls into view) at its heading.
  const stage = booked ? 'done' : shift ? 'tutor' : 'shift'
  const shownStage = useRef(stage)
  useEffect(() => {
    if (shownStage.current === stage) return
    shownStage.current = stage
    headingRef.current?.focus()
  }, [stage])

  const step = booked ? STEPS.length : slot ? 2 : shift ? 1 : 0

  const openSession = (chosen: TrialSlot) => {
    setPickedDay(startOfDay(msOf(chosen.start)))
    setShiftId(shiftOf(chosen.start)?.id ?? null)
    setSlotId(chosen.id)
  }

  const onBooked = (booking: TrialBooking) => {
    setBooked(booking)
    setSlotId(null)
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
    setPickedDay(today)
    setShiftId(null)
    setSlotId(null)
    setBooked(null)
  }

  // Booked by mistake: take it straight back off the calendar (a soft delete,
  // kept under "Removed") and return to the same shift, keeping the details.
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
    setPickedDay(startOfDay(msOf(booking.start)))
    setShiftId(shiftOf(booking.start)?.id ?? null)
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
            Pick a time, choose a tutor and get the student booked in minutes.
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
          ) : shift ? (
            <TutorStage
              headingRef={headingRef}
              shift={shift}
              day={day}
              slots={daySlots.filter(
                (candidate) => shiftOf(candidate.start)?.id === shift.id,
              )}
              mentors={mentors}
              allMentors={data.mentors}
              program={program}
              onProgram={setProgram}
              onBack={() => setShiftId(null)}
              onPick={openSession}
            />
          ) : (
            <ShiftStage
              headingRef={headingRef}
              program={program}
              onProgram={setProgram}
              days={days}
              day={day}
              onDay={setPickedDay}
              stats={shiftStats}
              onShift={setShiftId}
              soonest={soonest}
              soonestTutor={soonest ? mentorName(soonest.mentorId) : ''}
              onSoonest={openSession}
            />
          )}
        </section>
      </div>

      {slot && slotMentor && !booked && (
        <StudentDetailsDialog
          slot={slot}
          mentor={slotMentor}
          draft={draft}
          onDraftChange={setDraft}
          salesRepId={salesRepId}
          onClose={() => setSlotId(null)}
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

function ShiftStage({
  headingRef,
  program,
  onProgram,
  days,
  day,
  onDay,
  stats,
  onShift,
  soonest,
  soonestTutor,
  onSoonest,
}: {
  headingRef: RefObject<HTMLHeadingElement>
  program: ProgramFilter
  onProgram: (program: ProgramFilter) => void
  days: readonly { start: number; open: number }[]
  day: number
  onDay: (day: number) => void
  stats: readonly ShiftStat[]
  onShift: (shift: ShiftId) => void
  soonest: TrialSlot | null
  soonestTutor: string
  onSoonest: (slot: TrialSlot) => void
}) {
  return (
    <>
      <StepHeading
        headingRef={headingRef}
        eyebrow="Step 01"
        title="When would you like to book?"
        subtitle="Choose a day and a shift that suits the family."
      />
      <ProgramFilterChips value={program} onChange={onProgram} />

      <fieldset className="mt-5 min-w-0">
        <legend className="mb-2 text-xs font-bold text-slate-500 dark:text-slate-400">
          Day
        </legend>
        <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-2">
          {days.map(({ start, open }, index) => {
            const date = new Date(start)
            const active = start === day
            return (
              <button
                key={start}
                type="button"
                aria-pressed={active}
                aria-label={`${longDay(start)}: ${
                  open ? `${open} open sessions` : 'no open sessions'
                }`}
                onClick={() => onDay(start)}
                className={`flex w-[4.5rem] shrink-0 snap-start flex-col items-center rounded-2xl border px-2 py-2.5 transition-colors ${
                  active
                    ? 'border-violet-900 bg-violet-900 text-white dark:border-violet-300 dark:bg-violet-300 dark:text-slate-950'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-violet-300 dark:border-white/10 dark:bg-transparent dark:text-slate-200 dark:hover:border-violet-400/50'
                }`}
              >
                <span className="text-[11px] font-bold tracking-wide uppercase opacity-80">
                  {index === 0
                    ? 'Today'
                    : date.toLocaleDateString([], { weekday: 'short' })}
                </span>
                <span className="text-xl leading-tight font-black tabular-nums">
                  {date.getDate()}
                </span>
                <span className="text-[11px] opacity-70">
                  {date.toLocaleDateString([], { month: 'short' })}
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
                  {open ? `${open} open` : 'None'}
                </span>
              </button>
            )
          })}
        </div>
      </fieldset>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <ShiftCard
            key={stat.shift.id}
            stat={stat}
            onChoose={() => onShift(stat.shift.id)}
          />
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-violet-50/80 px-4 py-3 text-sm text-slate-600 dark:bg-white/5 dark:text-slate-300">
        <Zap size={16} className="shrink-0 text-orange-500" aria-hidden />
        {soonest ? (
          <>
            <span className="min-w-0 flex-1">
              Soonest open session:{' '}
              <strong className="font-extrabold text-slate-900 dark:text-white">
                {trialTime(soonest.start)}
              </strong>{' '}
              with {soonestTutor}
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
            No open sessions coming up
            {program === 'all' ? '' : ' for this program'}. Ask a tutor to open
            some times.
          </span>
        )}
      </div>
    </>
  )
}

function ShiftCard({
  stat,
  onChoose,
}: {
  stat: ShiftStat
  onChoose: () => void
}) {
  const { shift, open, booked, over } = stat
  const Icon = shift.icon
  const tone = SHIFT_TONE[shift.tone]
  const status = over
    ? 'Already over'
    : open > 0
      ? `${open} open ${open === 1 ? 'session' : 'sessions'}`
      : booked > 0
        ? 'Fully booked'
        : 'No tutors on'

  return (
    <button
      type="button"
      disabled={open === 0}
      onClick={onChoose}
      className={`group relative flex flex-col items-start rounded-2xl border p-4 text-left transition-[translate,box-shadow,border-color,scale] duration-200 ease-out sm:p-5 ${tone.card} ${
        open > 0
          ? `hover:shadow-lg active:scale-[0.98] motion-safe:hover:-translate-y-0.5 ${tone.hover}`
          : 'cursor-not-allowed opacity-55 saturate-50'
      }`}
    >
      <span
        className={`flex size-11 items-center justify-center rounded-xl ${tone.icon}`}
      >
        <Icon size={22} aria-hidden />
      </span>
      {open > 0 && (
        <ArrowUpRight
          size={18}
          aria-hidden
          className="absolute top-4 right-4 opacity-40 transition-[opacity,translate] duration-200 group-hover:opacity-90 motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5"
        />
      )}
      <span className="mt-4 text-base font-extrabold">{shift.label}</span>
      <span className="mt-0.5 text-sm opacity-75">{shiftHours(shift)}</span>
      <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold">
        <span
          aria-hidden
          className={`size-2 rounded-full ${open > 0 ? 'bg-emerald-500' : 'bg-slate-400'}`}
        />
        {status}
      </span>
    </button>
  )
}

function TutorStage({
  headingRef,
  shift,
  day,
  slots,
  mentors,
  allMentors,
  program,
  onProgram,
  onBack,
  onPick,
}: {
  headingRef: RefObject<HTMLHeadingElement>
  shift: Shift
  day: number
  /** Upcoming sessions in this shift, for the tutors shown. */
  slots: readonly TrialSlot[]
  /** Tutors for the chosen program. */
  mentors: readonly Mentor[]
  allMentors: readonly Mentor[]
  program: ProgramFilter
  onProgram: (program: ProgramFilter) => void
  onBack: () => void
  onPick: (slot: TrialSlot) => void
}) {
  const Icon = shift.icon
  const tone = SHIFT_TONE[shift.tone]
  const rows = mentors.map((mentor) => {
    const theirs = slots.filter((slot) => slot.mentorId === mentor.id)
    return {
      mentor,
      slots: theirs,
      open: theirs.filter((slot) => !slot.bookingId).length,
    }
  })
  const teaching = rows
    .filter((row) => row.slots.length > 0)
    .toSorted((a, b) => b.open - a.open)
  const idle = rows.filter((row) => row.slots.length === 0)
  const openTotal = slots.filter((slot) => !slot.bookingId).length

  return (
    <>
      <StepHeading
        headingRef={headingRef}
        eyebrow="Step 02"
        title="Find the perfect time."
        subtitle={`Open one-hour sessions in the ${shift.label.toLowerCase()} shift.`}
      />
      <button
        type="button"
        onClick={onBack}
        className="mt-5 inline-flex items-center gap-1.5 rounded-lg py-1 pr-2 text-sm font-extrabold text-violet-800 transition-colors hover:text-violet-950 dark:text-violet-300 dark:hover:text-white"
      >
        <ArrowLeft size={16} aria-hidden /> All shifts
      </button>

      <div
        className={`mt-3 flex items-center gap-4 rounded-2xl border p-4 ${tone.card}`}
      >
        <span
          className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${tone.icon}`}
        >
          <Icon size={24} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-extrabold">{shift.label}</p>
          <p className="text-sm opacity-80">
            {shiftHours(shift)} · {longDay(day)}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-white/80 px-3 py-1 text-xs font-extrabold text-emerald-700 dark:bg-white/10 dark:text-emerald-300">
          {openTotal} open
        </span>
      </div>

      <ProgramFilterChips value={program} onChange={onProgram} />

      <div className="mt-5 flex items-center gap-4 text-xs font-bold text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2 rounded-full bg-emerald-500" />
          Available
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2 rounded-full bg-slate-400" />
          Booked
        </span>
      </div>

      {teaching.length === 0 ? (
        <div className="mt-3">
          <EmptyState>
            No {program === 'all' ? '' : `${gradeCategory(program).label} `}
            tutors are teaching in this shift. Try another shift
            {program === 'all' ? '' : ' or program'}.
          </EmptyState>
        </div>
      ) : (
        <ul className="mt-3 space-y-3">
          {teaching.map(({ mentor, slots: theirs, open }) => (
            <li
              key={mentor.id}
              className="rounded-2xl border border-slate-200 p-4 sm:p-5 dark:border-white/10"
            >
              <div className="flex items-center gap-3">
                <TutorAvatar
                  name={mentor.name}
                  tone={tutorTone(mentor.id, allMentors)}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold text-slate-900 dark:text-white">
                    {mentor.name}
                  </p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {mentor.categories
                      .map((id) => gradeCategory(id).label)
                      .join(' · ')}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-bold text-slate-500 dark:text-slate-400">
                  {open} of {theirs.length} free
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {theirs.map((slot) =>
                  slot.bookingId ? (
                    <span
                      key={slot.id}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-500"
                    >
                      <span className="font-bold tabular-nums line-through decoration-slate-300 dark:decoration-slate-600">
                        {clock(slot.start)}
                      </span>
                      <span className="text-[11px] font-bold">Booked</span>
                    </span>
                  ) : (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => onPick(slot)}
                      aria-label={`Book ${clock(slot.start)} with ${mentor.name}`}
                      className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800 transition-[background-color,border-color,scale] duration-150 hover:border-emerald-400 hover:bg-emerald-100 active:scale-[0.97] dark:border-emerald-400/25 dark:bg-emerald-500/10 dark:text-emerald-200 dark:hover:bg-emerald-500/20"
                    >
                      <span className="font-extrabold tabular-nums">
                        {clock(slot.start)}
                      </span>
                      <span className="text-[11px] font-bold opacity-80">
                        Available
                      </span>
                    </button>
                  ),
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {idle.length > 0 && teaching.length > 0 && (
        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
          Not teaching this shift:{' '}
          {idle.map((row) => row.mentor.name).join(', ')}.
        </p>
      )}
    </>
  )
}
