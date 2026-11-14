import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck2,
  Check,
  Contact,
  Copy,
  ExternalLink,
  GraduationCap,
  MessageCircle,
  Search,
  UserPlus,
  UserRound,
} from 'lucide-react'
import { toast } from 'react-hot-toast'

import { useNow } from '../../hooks/useNow'
import { AddParentForm } from './AddParentForm'
import {
  categoryForGrade,
  GRADE_CATEGORIES,
  gradeCategory,
  gradeLabel,
} from './gradeCategories'
import { timeAgo, visibleLeads, waitingForTrial } from './leads'
import { formatPhone } from './phone'
import { useSalesData } from './salesDataContext'
import {
  inlineSelectClass,
  inputClass,
  primaryButton,
  searchInputClass,
  secondaryButton,
  selectClass,
  whatsappButton,
} from './styles'
import type { GradeCategoryId, Lead, TrialBooking, TrialSlot } from './types'
import { SOURCE_LABEL } from './types'
import {
  ContactButtons,
  EmptyState,
  Field,
  Initials,
  LeadStatusBadge,
  Panel,
} from './ui'
import {
  introMessage,
  trialTime,
  whatsappLink,
  whatsappMessage,
} from './whatsapp'

const ANY_MENTOR = 'any'

const STEPS = ['Parent', 'Child', 'Mentor & time', 'Confirm'] as const

const dayKey = (iso: string) => new Date(iso).toDateString()
const dayHeading = (iso: string) =>
  new Date(iso).toLocaleDateString([], {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  })
const timeOnly = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
const firstName = (name: string) => name.trim().split(/\s+/)[0] || name

type Child = { name: string; grade: string; notes: string }

const NO_CHILD: Child = { name: '', grade: '', notes: '' }

/**
 * Parent → child → mentor & time → confirm. The team starts with a parent's
 * contact details, gets the child's details by talking to them, then picks a
 * mentor who teaches the child's program. Booking puts the trial on that
 * mentor's calendar (with the meeting link) and queues the WhatsApp
 * confirmation to the parent.
 */
export function BookTrialWizard({
  salesRepId,
  initialLeadId = null,
}: {
  salesRepId: string | null
  /** Start on the child's details for this parent (from the parents list). */
  initialLeadId?: string | null
}) {
  const data = useSalesData()
  const [step, setStep] = useState(initialLeadId ? 1 : 0)
  const [leadId, setLeadId] = useState<string | null>(initialLeadId)
  const [child, setChild] = useState<Child>(() =>
    previousChild(data.leads, data.bookings, initialLeadId),
  )
  const [programOverride, setProgramOverride] =
    useState<GradeCategoryId | null>(null)
  const [mentorId, setMentorId] = useState(ANY_MENTOR)
  const [slotId, setSlotId] = useState<string | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [booked, setBooked] = useState<TrialBooking | null>(null)
  // Read once: the open-slot list doesn't need to tick while the form is open.
  const [now] = useState(() => Date.now())

  const lead = data.leads.find((candidate) => candidate.id === leadId) ?? null
  const category = programOverride ?? categoryForGrade(child.grade)?.id ?? null
  const repName =
    data.reps.find((rep) => rep.id === (salesRepId ?? lead?.salesRepId))
      ?.name ?? null

  const mentorsForCategory = useMemo(
    () =>
      category
        ? data.mentors.filter((mentor) => mentor.categories.includes(category))
        : [],
    [data.mentors, category],
  )

  const openSlots = useMemo(() => {
    const mentorIds = new Set(mentorsForCategory.map((mentor) => mentor.id))
    return data.slots
      .filter(
        (slot) =>
          !slot.bookingId &&
          new Date(slot.start).getTime() > now &&
          mentorIds.has(slot.mentorId),
      )
      .toSorted(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
      )
  }, [data.slots, mentorsForCategory, now])

  const slotsByDay = useMemo(() => {
    const chosen =
      mentorId === ANY_MENTOR
        ? openSlots
        : openSlots.filter((slot) => slot.mentorId === mentorId)
    const groups = new Map<string, TrialSlot[]>()
    for (const slot of chosen) {
      const key = dayKey(slot.start)
      groups.set(key, [...(groups.get(key) ?? []), slot])
    }
    return [...groups.values()]
  }, [openSlots, mentorId])

  const mentorName = (id: string) =>
    data.mentors.find((mentor) => mentor.id === id)?.name ?? 'Mentor'
  const chosenSlot = data.slots.find((slot) => slot.id === slotId) ?? null

  const chooseParent = (chosen: Lead) => {
    setLeadId(chosen.id)
    setChild(previousChild(data.leads, data.bookings, chosen.id))
    setProgramOverride(null)
    setSlotId(null)
    setStep(1)
  }

  const reset = () => {
    setStep(0)
    setLeadId(null)
    setChild(NO_CHILD)
    setProgramOverride(null)
    setMentorId(ANY_MENTOR)
    setSlotId(null)
    setProblem(null)
    setBooked(null)
  }

  const book = () => {
    if (!lead || !category || !chosenSlot) return
    try {
      const booking = data.bookTrial({
        slotId: chosenSlot.id,
        leadId: lead.id,
        // Admins book on behalf of the parent's rep.
        salesRepId: salesRepId ?? lead.salesRepId,
        category,
        parentName: lead.parentName,
        parentPhone: lead.phone,
        parentEmail: lead.email,
        studentName: child.name.trim(),
        studentGrade: child.grade,
        source: lead.source,
        notes: child.notes.trim(),
      })
      setBooked(booking)
      setProblem(null)
      toast.success('Trial booked and assigned to the mentor.')
    } catch (error) {
      setProblem(
        error instanceof Error ? error.message : 'Couldn’t book that slot.',
      )
    }
  }

  if (booked) {
    return <BookingConfirmation booking={booked} onBookAnother={reset} />
  }

  return (
    <div className="space-y-4">
      <ol className="flex flex-wrap gap-2" aria-label="Booking steps">
        {STEPS.map((label, index) => (
          <li
            key={label}
            aria-current={index === step ? 'step' : undefined}
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${
              index === step
                ? 'bg-purple-600 text-white'
                : index < step
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-200'
                  : 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400'
            }`}
          >
            {index < step ? <Check size={12} aria-hidden /> : index + 1}
            <span>{label}</span>
          </li>
        ))}
      </ol>

      {step > 0 && (
        <button
          type="button"
          onClick={() => {
            setProblem(null)
            setStep((current) => current - 1)
          }}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft size={15} aria-hidden /> Back
        </button>
      )}

      {step === 0 && (
        <ParentStep salesRepId={salesRepId} onChoose={chooseParent} />
      )}

      {step === 1 && lead && (
        <ChildStep
          lead={lead}
          repName={repName}
          child={child}
          onChildChange={setChild}
          category={category}
          programOverride={programOverride}
          onProgramOverride={setProgramOverride}
          onContinue={() => {
            setSlotId(null)
            setMentorId(ANY_MENTOR)
            setStep(2)
          }}
        />
      )}

      {step === 2 && category && (
        <Panel
          title={`${gradeCategory(category).label} mentors for ${firstName(child.name)}`}
          icon={UserRound}
        >
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            Every mentor here teaches {gradeCategory(category).label} (
            {gradeCategory(category).ages}). Pick one, or take the earliest time
            with anyone.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <MentorChoice
              title="Earliest available"
              subtitle="Any mentor for this program"
              openCount={openSlots.length}
              next={openSlots[0]?.start}
              selected={mentorId === ANY_MENTOR}
              onChoose={() => setMentorId(ANY_MENTOR)}
            />
            {mentorsForCategory.map((mentor) => {
              const theirs = openSlots.filter((s) => s.mentorId === mentor.id)
              return (
                <MentorChoice
                  key={mentor.id}
                  title={mentor.name}
                  subtitle={mentor.categories
                    .map((id) => gradeCategory(id).label)
                    .join(' · ')}
                  openCount={theirs.length}
                  next={theirs[0]?.start}
                  selected={mentorId === mentor.id}
                  onChoose={() => setMentorId(mentor.id)}
                />
              )
            })}
          </div>

          <h3 className="mt-6 mb-3 flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white">
            <CalendarCheck2 size={16} className="text-purple-500" aria-hidden />
            {mentorId === ANY_MENTOR
              ? 'Open times · all mentors'
              : `Open times · ${mentorName(mentorId)}`}
          </h3>
          {slotsByDay.length === 0 ? (
            <EmptyState>
              No open times. Ask the mentor to add availability, or choose
              another mentor.
            </EmptyState>
          ) : (
            <div className="max-h-[420px] space-y-4 overflow-y-auto pr-1">
              {slotsByDay.map((slots) => (
                <div key={slots[0]?.id}>
                  <h4 className="mb-2 text-xs font-extrabold tracking-wide text-slate-500 uppercase">
                    {dayHeading(slots[0]?.start ?? '')}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {slots.map((slot) => (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => {
                          setSlotId(slot.id)
                          setStep(3)
                        }}
                        className={`rounded-xl border px-3 py-2 text-left text-sm transition hover:border-purple-400 ${
                          slotId === slot.id
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-500/10'
                            : 'border-slate-200 dark:border-white/10'
                        }`}
                      >
                        <span className="block font-extrabold text-slate-900 tabular-nums dark:text-white">
                          {timeOnly(slot.start)}
                        </span>
                        {mentorId === ANY_MENTOR && (
                          <span className="block text-xs text-slate-500">
                            {mentorName(slot.mentorId)}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}

      {step === 3 && lead && category && chosenSlot && (
        <Panel title="Check and book" icon={CalendarCheck2}>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-sm">
            <dt className="text-slate-500">Parent</dt>
            <dd className="font-bold text-slate-900 dark:text-white">
              {lead.parentName}
              <span className="block text-xs font-normal text-slate-500">
                {formatPhone(lead.phone)}
                {lead.email && ` · ${lead.email}`}
              </span>
            </dd>
            <dt className="text-slate-500">Child</dt>
            <dd className="font-bold text-slate-900 dark:text-white">
              {child.name.trim()} · {gradeLabel(child.grade)}
            </dd>
            <dt className="text-slate-500">Program</dt>
            <dd className="font-bold text-slate-900 dark:text-white">
              {gradeCategory(category).label}
            </dd>
            <dt className="text-slate-500">Mentor</dt>
            <dd className="font-bold text-slate-900 dark:text-white">
              {mentorName(chosenSlot.mentorId)}
            </dd>
            <dt className="text-slate-500">When</dt>
            <dd className="font-bold text-slate-900 dark:text-white">
              {trialTime(chosenSlot.start)}
            </dd>
            {child.notes.trim() && (
              <>
                <dt className="text-slate-500">For the mentor</dt>
                <dd className="text-slate-700 dark:text-slate-200">
                  {child.notes.trim()}
                </dd>
              </>
            )}
            <dt className="text-slate-500">Came from</dt>
            <dd className="text-slate-700 dark:text-slate-200">
              {SOURCE_LABEL[lead.source]}
            </dd>
          </dl>
          <p className="mt-5 rounded-xl bg-purple-50 px-3 py-2 text-sm text-purple-900 dark:bg-purple-500/10 dark:text-purple-200">
            The trial goes on {mentorName(chosenSlot.mentorId)}’s calendar with
            the meeting link, and {firstName(lead.parentName)} gets a WhatsApp
            confirmation.
          </p>
          {problem && (
            <p role="alert" className="mt-3 text-sm font-semibold text-red-600">
              {problem}
            </p>
          )}
          <div className="mt-5 flex justify-end">
            <button type="button" onClick={book} className={primaryButton}>
              <CalendarCheck2 size={16} aria-hidden /> Book trial
            </button>
          </div>
        </Panel>
      )}
    </div>
  )
}

/** For a rebooking, the child's details from the trial that didn't happen. */
function previousChild(
  leads: readonly Lead[],
  bookings: readonly TrialBooking[],
  leadId: string | null,
): Child {
  const bookingId = leads.find((lead) => lead.id === leadId)?.bookingId
  const previous = bookings.find((booking) => booking.id === bookingId)
  return previous
    ? {
        name: previous.studentName,
        grade: previous.studentGrade,
        notes: previous.notes,
      }
    : NO_CHILD
}

function ParentStep({
  salesRepId,
  onChoose,
}: {
  salesRepId: string | null
  onChoose: (lead: Lead) => void
}) {
  const data = useSalesData()
  const now = useNow(60_000)
  const [query, setQuery] = useState('')
  const [adding, setAdding] = useState(false)

  const candidates = useMemo(() => {
    const bookings = new Map(data.bookings.map((b) => [b.id, b]))
    const needle = query.trim().toLowerCase()
    const digits = needle.replace(/\D/g, '')
    return visibleLeads(data.leads, salesRepId)
      .filter((lead) => waitingForTrial(lead, bookings))
      .filter(
        (lead) =>
          !needle ||
          lead.parentName.toLowerCase().includes(needle) ||
          lead.email.toLowerCase().includes(needle) ||
          (digits.length >= 3 && lead.phone.includes(digits)),
      )
      .toSorted(
        (a, b) =>
          // Parents already spoken to are the likeliest to book now.
          Number(b.status === 'contacted') - Number(a.status === 'contacted') ||
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
  }, [data.leads, data.bookings, salesRepId, query])

  if (adding) {
    return (
      <Panel title="New parent" icon={UserPlus}>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Start with the parent’s contact details. You’ll add the child’s
          details next.
        </p>
        <AddParentForm
          salesRepId={salesRepId}
          submitLabel="Save and continue"
          onCancel={() => setAdding(false)}
          onSaved={onChoose}
        />
      </Panel>
    )
  }

  return (
    <Panel
      title="Which parent is this trial for?"
      icon={Contact}
      action={
        <button
          type="button"
          onClick={() => setAdding(true)}
          className={secondaryButton}
        >
          <UserPlus size={16} aria-hidden /> New parent
        </button>
      }
    >
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        Choose a parent you’ve reached out to. You’ll fill in their child’s
        details from your conversation next.
      </p>
      <label className="relative mb-4 block">
        <span className="sr-only">Search parents</span>
        <Search
          size={16}
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, phone or email"
          className={searchInputClass}
        />
      </label>
      {candidates.length === 0 ? (
        <EmptyState>
          {query
            ? 'No parents match that search.'
            : 'No parents waiting for a trial.'}{' '}
          Add a new parent to book for them.
        </EmptyState>
      ) : (
        <ul className="max-h-[440px] space-y-2 overflow-y-auto pr-1">
          {candidates.map((lead) => (
            <li key={lead.id}>
              <button
                type="button"
                onClick={() => onChoose(lead)}
                className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-3 text-left transition hover:border-purple-400 hover:bg-purple-50/40 dark:border-white/10 dark:hover:bg-purple-500/5"
              >
                <Initials name={lead.parentName} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-extrabold text-slate-900 dark:text-white">
                      {lead.parentName}
                    </span>
                    <LeadStatusBadge status={lead.status} />
                  </span>
                  <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                    {formatPhone(lead.phone)}
                    {lead.email && ` · ${lead.email}`} ·{' '}
                    {SOURCE_LABEL[lead.source]} · added{' '}
                    {timeAgo(lead.createdAt, now)}
                  </span>
                </span>
                <ArrowRight
                  size={16}
                  aria-hidden
                  className="shrink-0 text-slate-400"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

function ChildStep({
  lead,
  repName,
  child,
  onChildChange,
  category,
  programOverride,
  onProgramOverride,
  onContinue,
}: {
  lead: Lead
  repName: string | null
  child: Child
  onChildChange: (child: Child) => void
  category: GradeCategoryId | null
  programOverride: GradeCategoryId | null
  onProgramOverride: (program: GradeCategoryId | null) => void
  onContinue: () => void
}) {
  const [problem, setProblem] = useState<string | null>(null)
  const byGrade = categoryForGrade(child.grade)
  const program = category ? gradeCategory(category) : null

  const update = <K extends keyof Child>(key: K, value: Child[K]) =>
    onChildChange({ ...child, [key]: value })

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!child.name.trim()) {
      setProblem('Add the child’s name.')
      return
    }
    if (!child.grade) {
      setProblem('Choose the child’s grade.')
      return
    }
    setProblem(null)
    onContinue()
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Panel title="The child’s details" icon={GraduationCap}>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Child’s name">
            <input
              value={child.name}
              onChange={(event) => update('name', event.target.value)}
              className={inputClass}
              autoComplete="off"
              required
            />
          </Field>
          <Field label="Grade">
            <select
              value={child.grade}
              onChange={(event) => update('grade', event.target.value)}
              className={selectClass}
              required
            >
              <option value="">Choose a grade…</option>
              {GRADE_CATEGORIES.map((group) => (
                <optgroup
                  key={group.id}
                  label={`${group.label} · ${group.ages}`}
                >
                  {group.grades.map((grade) => (
                    <option key={grade} value={grade}>
                      {gradeLabel(grade)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field
              label="Interests and experience (optional)"
              hint="The mentor reads this before the trial."
            >
              <textarea
                value={child.notes}
                onChange={(event) => update('notes', event.target.value)}
                rows={3}
                placeholder="Loves Minecraft, has tried Scratch at school, a bit shy…"
                className={inputClass}
              />
            </Field>
          </div>

          {program && (
            <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4 sm:col-span-2 dark:border-purple-500/30 dark:bg-purple-500/10">
              <p className="text-xs font-bold text-purple-700 dark:text-purple-300">
                Program
              </p>
              <p className="mt-0.5 text-base font-black text-slate-900 dark:text-white">
                {program.label}{' '}
                <span className="text-sm font-bold text-slate-500">
                  · {program.ages}
                </span>
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {program.focus}
              </p>
              <label className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                Change program
                <select
                  value={programOverride ?? ''}
                  onChange={(event) => {
                    const chosen = GRADE_CATEGORIES.find(
                      (option) => option.id === event.target.value,
                    )
                    onProgramOverride(chosen?.id ?? null)
                  }}
                  className={inlineSelectClass}
                >
                  <option value="">
                    {byGrade
                      ? `Match the grade (${byGrade.label})`
                      : 'Match the grade'}
                  </option>
                  {GRADE_CATEGORIES.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span className="font-normal text-slate-500">
                  If the child is ahead of or behind their grade.
                </span>
              </label>
            </div>
          )}

          {problem && (
            <p
              role="alert"
              className="text-sm font-semibold text-red-600 sm:col-span-2"
            >
              {problem}
            </p>
          )}
          <div className="flex justify-end sm:col-span-2">
            <button type="submit" className={primaryButton}>
              Choose a mentor <ArrowRight size={16} aria-hidden />
            </button>
          </div>
        </form>
      </Panel>

      <Panel title="Parent" icon={Contact}>
        <div className="flex items-start gap-3">
          <Initials name={lead.parentName} size={40} />
          <div className="min-w-0">
            <p className="font-extrabold text-slate-900 dark:text-white">
              {lead.parentName}
            </p>
            <p className="text-sm text-slate-600 tabular-nums dark:text-slate-300">
              {formatPhone(lead.phone)}
            </p>
            {lead.email && (
              <p className="text-sm break-all text-slate-600 dark:text-slate-300">
                {lead.email}
              </p>
            )}
            <p className="mt-1 text-xs text-slate-500">
              {SOURCE_LABEL[lead.source]}
            </p>
          </div>
        </div>
        {lead.notes && (
          <p className="mt-3 text-xs text-slate-500 italic">“{lead.notes}”</p>
        )}
        <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">
          Haven’t spoken to {firstName(lead.parentName)} yet? The WhatsApp
          message asks for the child’s name, grade and interests.
        </p>
        <div className="mt-3">
          <ContactButtons
            phone={lead.phone}
            email={lead.email}
            message={introMessage(lead.parentName, repName)}
          />
        </div>
      </Panel>
    </div>
  )
}

function MentorChoice({
  title,
  subtitle,
  openCount,
  next,
  selected,
  onChoose,
}: {
  title: string
  subtitle: string
  openCount: number
  next: string | undefined
  selected: boolean
  onChoose: () => void
}) {
  return (
    <button
      type="button"
      onClick={onChoose}
      disabled={openCount === 0}
      aria-pressed={selected}
      className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition hover:border-purple-400 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 ${
        selected
          ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-500/30 dark:bg-purple-500/10'
          : 'border-slate-200 dark:border-white/10'
      }`}
    >
      <Initials name={title} size={40} />
      <span className="min-w-0">
        <span className="block font-extrabold text-slate-900 dark:text-white">
          {title}
        </span>
        <span className="block text-xs text-slate-500">{subtitle}</span>
        <span className="mt-2 block text-xs font-bold text-purple-600 dark:text-purple-300">
          {openCount === 0
            ? 'No open times'
            : `${openCount} open · next ${next ? trialTime(next) : ''}`}
        </span>
      </span>
    </button>
  )
}

function BookingConfirmation({
  booking,
  onBookAnother,
}: {
  booking: TrialBooking
  onBookAnother: () => void
}) {
  const data = useSalesData()
  const mentor = data.mentors.find((m) => m.id === booking.mentorId)
  const message = whatsappMessage('trial_confirmation', booking, mentor)
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Couldn’t copy. Select the text and copy it instead.')
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Trial booked" icon={CalendarCheck2}>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-slate-500">Child</dt>
          <dd className="font-bold text-slate-900 dark:text-white">
            {booking.studentName} · {gradeLabel(booking.studentGrade)}
          </dd>
          <dt className="text-slate-500">Program</dt>
          <dd className="font-bold text-slate-900 dark:text-white">
            {gradeCategory(booking.category).label}
          </dd>
          <dt className="text-slate-500">When</dt>
          <dd className="font-bold text-slate-900 dark:text-white">
            {trialTime(booking.start)}
          </dd>
          <dt className="text-slate-500">Mentor</dt>
          <dd className="font-bold text-slate-900 dark:text-white">
            {mentor?.name ?? '—'}
          </dd>
          <dt className="text-slate-500">Meeting</dt>
          <dd>
            <a
              href={booking.meetLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-bold break-all text-purple-600 hover:underline dark:text-purple-300"
            >
              {booking.meetLink} <ExternalLink size={13} aria-hidden />
            </a>
          </dd>
          <dt className="text-slate-500">Parent</dt>
          <dd className="font-bold text-slate-900 dark:text-white">
            {booking.parentName} · {formatPhone(booking.parentPhone)}
          </dd>
        </dl>
        <p className="mt-4 text-xs text-slate-500">
          It’s now on {mentor?.name ?? 'the mentor'}’s trial calendar with the
          meeting link.
        </p>
        <button
          type="button"
          onClick={onBookAnother}
          className={`${secondaryButton} mt-4`}
        >
          Book another trial
        </button>
      </Panel>

      <Panel title="WhatsApp confirmation" icon={MessageCircle}>
        <div className="rounded-2xl bg-[#e7ffdb] p-4 text-sm leading-6 whitespace-pre-line text-slate-900 shadow-inner dark:bg-emerald-950/60 dark:text-emerald-50">
          {message}
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          Queued to send automatically once WhatsApp Business is connected.
          Until then, send it yourself in one tap:
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={whatsappLink(booking.parentPhone, message)}
            target="_blank"
            rel="noreferrer"
            className={whatsappButton}
          >
            <MessageCircle size={16} aria-hidden /> Open in WhatsApp
          </a>
          <button
            type="button"
            onClick={() => void copy()}
            className={secondaryButton}
          >
            {copied ? (
              <Check size={16} aria-hidden />
            ) : (
              <Copy size={16} aria-hidden />
            )}
            {copied ? 'Copied' : 'Copy message'}
          </button>
        </div>
      </Panel>
    </div>
  )
}
