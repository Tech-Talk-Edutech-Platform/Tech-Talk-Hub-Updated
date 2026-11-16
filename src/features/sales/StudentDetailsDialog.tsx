import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowRight, MessageCircle, Search, UserPlus, X } from 'lucide-react'

import { AddParentForm } from './AddParentForm'
import { eyebrowClass, gradientButton, tutorTone } from './bookingStyles'
import {
  categoryForGrade,
  GRADE_CATEGORIES,
  gradeCategory,
  gradeLabel,
} from './gradeCategories'
import { visibleLeads, waitingForTrial } from './leads'
import { formatPhone } from './phone'
import { useSalesData } from './salesDataContext'
import { inputClass, searchInputClass, selectClass } from './styles'
import { draftFor, type StudentDraft } from './studentDraft'
import type {
  GradeCategoryId,
  Lead,
  Mentor,
  TrialBooking,
  TrialSlot,
} from './types'
import { Field, Initials, LeadStatusBadge, TutorAvatar } from './ui'
import { introMessage, whatsappLink } from './whatsapp'

const firstName = (name: string) => name.trim().split(/\s+/)[0] || name

const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

/** "Mon 16 November · 4:00 PM – 5:00 PM" */
const sessionLabel = (slot: TrialSlot) =>
  `${new Date(slot.start).toLocaleDateString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  })} · ${clock(slot.start)} – ${clock(slot.end)}`

const sectionLabel =
  'mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300'

/**
 * The last step: who the session is for. The rep picks the parent (or adds a
 * new one), then the student's name, grade and program. Booking puts the
 * trial on the tutor's calendar and queues the parent's WhatsApp confirmation.
 */
export function StudentDetailsDialog({
  slot,
  mentor,
  draft,
  onDraftChange,
  salesRepId,
  onClose,
  onBooked,
}: {
  slot: TrialSlot
  mentor: Mentor
  draft: StudentDraft
  onDraftChange: (draft: StudentDraft) => void
  /** The rep booking; null for an admin, who books for the parent's rep. */
  salesRepId: string | null
  onClose: () => void
  onBooked: (booking: TrialBooking) => void
}) {
  const data = useSalesData()
  const titleId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [adding, setAdding] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
    return () => {
      if (dialog?.open) dialog.close()
    }
  }, [])

  const lead = data.leads.find((c) => c.id === draft.leadId) ?? null
  const tutor = firstName(mentor.name)
  const byGrade = categoryForGrade(draft.grade)
  // The student's program: the one picked, else the grade's if this tutor
  // teaches it. Null means the rep has to choose.
  const program =
    draft.program && mentor.categories.includes(draft.program)
      ? draft.program
      : byGrade && mentor.categories.includes(byGrade.id)
        ? byGrade.id
        : null
  const bookerId = salesRepId ?? lead?.salesRepId ?? null
  const booker = data.reps.find((rep) => rep.id === bookerId)?.name ?? null

  const update = (patch: Partial<StudentDraft>) => {
    setProblem(null)
    onDraftChange({ ...draft, ...patch })
  }

  const chooseParent = (chosen: Lead) => {
    const previous = draftFor(data.leads, data.bookings, chosen.id)
    // Keep what's been typed; fill the gaps from an earlier trial (a rebooking).
    update({
      leadId: chosen.id,
      studentName: draft.studentName || previous.studentName,
      grade: draft.grade || previous.grade,
      program: draft.grade ? draft.program : previous.program,
      notes: draft.notes || previous.notes,
    })
    setAdding(false)
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const studentName = draft.studentName.trim()
    if (!lead) {
      setProblem('Choose the parent, or add a new one.')
      return
    }
    if (!studentName) {
      setProblem('Add the student’s name.')
      return
    }
    if (!draft.grade) {
      setProblem('Choose the student’s grade.')
      return
    }
    if (!program) {
      setProblem(
        `Choose one of ${tutor}’s programs for ${firstName(studentName)}, or pick another tutor.`,
      )
      return
    }
    try {
      const booking = data.bookTrial({
        slotId: slot.id,
        leadId: lead.id,
        salesRepId: salesRepId ?? lead.salesRepId,
        category: program,
        parentName: lead.parentName,
        parentPhone: lead.phone,
        parentEmail: lead.email,
        studentName,
        studentGrade: draft.grade,
        source: lead.source,
        notes: draft.notes.trim(),
      })
      onBooked(booking)
    } catch (error) {
      setProblem(
        error instanceof Error ? error.message : 'Couldn’t book that session.',
      )
    }
  }

  return (
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- backdrop click to close; Escape (onCancel) is the keyboard equivalent
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby={titleId}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto overscroll-contain rounded-[28px] border-0 bg-white p-5 text-slate-900 shadow-2xl transition-[opacity,scale] duration-200 ease-out backdrop:bg-slate-950/50 backdrop:backdrop-blur-sm motion-reduce:transition-none sm:p-8 dark:bg-slate-900 dark:text-white starting:open:scale-95 starting:open:opacity-0"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close without booking"
        className="absolute top-4 right-4 rounded-full bg-violet-50 p-2 text-violet-800 transition-colors hover:bg-violet-100 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
      >
        <X size={16} aria-hidden />
      </button>

      <div className="px-8 text-center">
        <p className={eyebrowClass}>Final step</p>
        <h2
          id={titleId}
          className="mt-2 text-2xl font-black tracking-tight text-fuchsia-900 dark:text-white"
        >
          Who’s joining us?
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Add the student’s details to secure this session.
        </p>
      </div>

      <div className="mt-5 flex items-center gap-3 rounded-2xl bg-linear-to-r from-orange-50 via-pink-50 to-violet-50 p-3.5 dark:from-orange-500/10 dark:via-pink-500/10 dark:to-violet-500/10">
        <TutorAvatar
          name={mentor.name}
          tone={tutorTone(mentor.id, data.mentors)}
        />
        <div className="min-w-0">
          <p className="font-extrabold">{mentor.name}</p>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            {sessionLabel(slot)}
          </p>
        </div>
      </div>

      {adding ? (
        <section className="mt-5" aria-label="New parent">
          <p className="mb-3 text-sm font-extrabold">New parent</p>
          <AddParentForm
            salesRepId={salesRepId}
            submitLabel="Save parent"
            onCancel={() => setAdding(false)}
            onSaved={chooseParent}
          />
        </section>
      ) : (
        <>
          {lead ? (
            <ChosenParent
              lead={lead}
              repName={booker}
              onChange={() => update({ leadId: null })}
            />
          ) : (
            <ParentSearch
              salesRepId={salesRepId}
              onChoose={chooseParent}
              onAdd={() => setAdding(true)}
            />
          )}

          <form onSubmit={submit} noValidate className="mt-4 space-y-4">
            <Field label="Student’s full name">
              <input
                value={draft.studentName}
                onChange={(event) =>
                  update({ studentName: event.target.value })
                }
                placeholder="e.g. Brian Mwangi"
                autoComplete="off"
                className={inputClass}
              />
            </Field>
            <Field label="Grade">
              <select
                value={draft.grade}
                // A new grade picks its own program again.
                onChange={(event) =>
                  update({ grade: event.target.value, program: null })
                }
                className={selectClass}
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

            {draft.grade && (
              <ProgramChoice
                mentor={mentor}
                grade={draft.grade}
                selected={program}
                onChange={(chosen) => update({ program: chosen })}
              />
            )}

            <Field
              label={`Notes for ${tutor} (optional)`}
              hint="Read before the trial."
            >
              <textarea
                value={draft.notes}
                onChange={(event) => update({ notes: event.target.value })}
                rows={2}
                placeholder="Loves Minecraft, tried Scratch at school, a bit shy…"
                className={inputClass}
              />
            </Field>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Booked by{' '}
              <strong className="font-bold text-slate-700 dark:text-slate-200">
                {booker ?? 'the admin team'}
              </strong>
            </p>

            {problem && (
              <p
                role="alert"
                className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
              >
                {problem}
              </p>
            )}

            <button type="submit" className={`${gradientButton} w-full`}>
              Confirm & book session <ArrowRight size={16} aria-hidden />
            </button>
            <p className="text-center text-xs leading-5 text-slate-500 dark:text-slate-400">
              It goes on {tutor}’s calendar with the meeting link
              {lead
                ? `, and ${firstName(lead.parentName)} gets the WhatsApp confirmation.`
                : '.'}
            </p>
          </form>
        </>
      )}
    </dialog>
  )
}

function ChosenParent({
  lead,
  repName,
  onChange,
}: {
  lead: Lead
  repName: string | null
  onChange: () => void
}) {
  return (
    <div className="mt-5">
      <p className={sectionLabel}>Parent</p>
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3 dark:border-white/10">
        <Initials name={lead.parentName} size={36} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold">{lead.parentName}</p>
          <p className="truncate text-xs text-slate-500 tabular-nums dark:text-slate-400">
            {formatPhone(lead.phone)}
            {lead.email && ` · ${lead.email}`}
          </p>
        </div>
        <a
          href={whatsappLink(
            lead.phone,
            introMessage(lead.parentName, repName),
          )}
          target="_blank"
          rel="noreferrer"
          aria-label={`Ask ${lead.parentName} for the student’s details on WhatsApp`}
          title="Ask for the student’s details on WhatsApp"
          className="rounded-lg p-2 text-emerald-600 transition-colors hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-500/10"
        >
          <MessageCircle size={16} aria-hidden />
        </a>
        <button
          type="button"
          onClick={onChange}
          className="rounded-lg px-2 py-1.5 text-xs font-extrabold text-violet-800 transition-colors hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-white/10"
        >
          Change
        </button>
      </div>
    </div>
  )
}

function ParentSearch({
  salesRepId,
  onChoose,
  onAdd,
}: {
  salesRepId: string | null
  onChoose: (lead: Lead) => void
  onAdd: () => void
}) {
  const data = useSalesData()
  const [query, setQuery] = useState('')

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

  return (
    <div className="mt-5">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
          Parent
        </p>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1 rounded-lg px-1.5 py-1 text-xs font-extrabold text-violet-800 transition-colors hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-white/10"
        >
          <UserPlus size={14} aria-hidden /> New parent
        </button>
      </div>
      <label className="relative block">
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
        <p className="mt-2 rounded-xl border border-dashed border-slate-200 p-3 text-center text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
          {query
            ? 'No parents match that search.'
            : 'No parents waiting for a trial.'}{' '}
          <button
            type="button"
            onClick={onAdd}
            className="font-extrabold text-violet-800 hover:underline dark:text-violet-300"
          >
            Add a new parent
          </button>
        </p>
      ) : (
        <ul className="mt-2 max-h-52 space-y-0.5 overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 p-1.5 dark:border-white/10">
          {candidates.map((lead) => (
            <li key={lead.id}>
              <button
                type="button"
                onClick={() => onChoose(lead)}
                className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-violet-50 dark:hover:bg-white/5"
              >
                <Initials name={lead.parentName} size={30} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">
                    {lead.parentName}
                  </span>
                  <span className="block truncate text-xs text-slate-500 tabular-nums dark:text-slate-400">
                    {formatPhone(lead.phone)}
                  </span>
                </span>
                <LeadStatusBadge status={lead.status} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * The student's program, limited to what this tutor teaches. It follows the
 * grade unless the student is ahead of or behind it.
 */
function ProgramChoice({
  mentor,
  grade,
  selected,
  onChange,
}: {
  mentor: Mentor
  grade: string
  selected: GradeCategoryId | null
  onChange: (program: GradeCategoryId) => void
}) {
  const name = useId()
  const byGrade = categoryForGrade(grade)
  const tutor = firstName(mentor.name)
  const outside = byGrade && !mentor.categories.includes(byGrade.id)

  return (
    <fieldset>
      <legend className={sectionLabel}>Program</legend>
      {outside && (
        <p className="mb-2 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
          {gradeLabel(grade)} usually joins {byGrade.label}, which {tutor}{' '}
          doesn’t teach. Pick one of {tutor}’s programs if it suits the student,
          or choose another tutor.
        </p>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        {mentor.categories.map((id) => {
          const option = gradeCategory(id)
          return (
            <label
              key={id}
              className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 p-3 text-sm transition-colors hover:border-violet-300 has-checked:border-violet-500 has-checked:bg-violet-50 dark:border-white/10 dark:has-checked:border-violet-400 dark:has-checked:bg-violet-500/10"
            >
              <input
                type="radio"
                name={name}
                checked={selected === id}
                onChange={() => onChange(id)}
                className="mt-0.5 size-4 shrink-0 accent-violet-700"
              />
              <span className="flex flex-col font-bold">
                {option.label}
                <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                  {option.ages}
                  {id === byGrade?.id && ' · matches the grade'}
                </span>
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
