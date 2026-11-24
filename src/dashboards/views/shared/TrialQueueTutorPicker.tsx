import { useEffect, useId, useState } from 'react'
import { Loader2, UserRoundCheck } from 'lucide-react'

import { supabase } from '../../../supabase'
import { categoryForGrade } from '../../../features/sales/gradeCategories'
import { useNow } from '../../../hooks/useNow'
import { sendWaitingInvites } from '../../../lib/sendWaitingInvites'
import { clockIn, sameClock, zoneOr, zonePlace } from '../../../lib/timeZones'
import type { Tables } from '../../../types/database'
import { requestedStartOf, type QueueLead } from './trialQueueTimes'

type QueueTutor = Pick<Tables<'users'>, 'id' | 'full_name'>

type Availability = {
  mentor_id: string
  slot_id: string | null
  busy: boolean
  time_zone: string
}

/**
 * The unassigned-trial queue's way past "no open slot": pick any tutor who is
 * free at the time the family asked for. The trial goes on their calendar
 * (book_trial_at), the same as a booking from Sales & Trials.
 */
export function TrialQueueTutorPicker({
  lead,
  tutors,
  disabled,
  run,
}: {
  lead: QueueLead
  tutors: readonly QueueTutor[]
  disabled: boolean
  /** The schedule's action runner: saving state, toasts and reload. */
  run: (action: () => Promise<void>, success: string) => Promise<void>
}) {
  const selectId = useId()
  const now = useNow(60_000)
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<Availability[] | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [choice, setChoice] = useState('')
  const start = requestedStartOf(lead)
  const program = categoryForGrade(lead.grade ?? '')
  const studentName = lead.student_name?.trim() ?? ''
  const family = zoneOr(lead.time_zone)

  useEffect(() => {
    if (!open || start === null) return undefined
    const request = new AbortController()
    void supabase
      .rpc('trial_tutor_availability', {
        p_start: new Date(start).toISOString(),
      })
      .abortSignal(request.signal)
      .then(({ data, error }) => {
        if (request.signal.aborted) return
        if (error) setProblem(error.message)
        else setRows(data)
      })
    return () => request.abort()
  }, [open, start])

  const missing =
    start === null
      ? 'The family didn’t pick a time.'
      : start <= now
        ? 'The time they asked for has passed. Agree a new one with the family.'
        : !studentName
          ? 'Add the student’s name to the lead first.'
          : !program
            ? 'Add the student’s grade (K–12) to the lead first.'
            : null

  if (!open) {
    return (
      <button
        type="button"
        disabled={disabled || missing !== null}
        title={missing ?? undefined}
        onClick={() => setOpen(true)}
        className="mt-2 w-full rounded-lg border border-indigo-200 px-3 py-2 text-xs font-extrabold text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-indigo-400/30 dark:text-indigo-200 dark:hover:bg-indigo-500/10"
      >
        Choose a tutor for this time
      </button>
    )
  }

  const byTutor = new Map((rows ?? []).map((row) => [row.mentor_id, row]))
  const options = tutors
    .flatMap((tutor) => {
      const row = byTutor.get(tutor.id)
      if (!row) return []
      const status = row.slot_id
        ? 'open slot'
        : row.busy
          ? 'in a class'
          : 'free'
      const theirs =
        start !== null && !sameClock(start, row.time_zone, family)
          ? ` · ${clockIn(start, row.time_zone)} ${zonePlace(row.time_zone)}`
          : ''
      return [
        {
          id: tutor.id,
          busy: row.busy && !row.slot_id,
          label: `${tutor.full_name?.trim() || 'Tutor'} (${status}${theirs})`,
          rank: row.slot_id ? 0 : row.busy ? 2 : 1,
        },
      ]
    })
    .toSorted((a, b) => a.rank - b.rank || a.label.localeCompare(b.label))

  return (
    <div className="mt-2 space-y-2">
      {problem ? (
        <p className="text-xs font-semibold text-rose-600">{problem}</p>
      ) : rows === null ? (
        <p className="flex items-center gap-1.5 text-xs text-slate-500">
          <Loader2 size={12} className="animate-spin" aria-hidden /> Checking
          the tutors’ calendars…
        </p>
      ) : (
        <>
          <label htmlFor={selectId} className="sr-only">
            Tutor for {studentName}
          </label>
          <select
            id={selectId}
            value={choice}
            onChange={(event) => setChoice(event.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold dark:border-white/10 dark:bg-slate-950"
          >
            <option value="">Choose a tutor…</option>
            {options.map((option) => (
              <option key={option.id} value={option.id} disabled={option.busy}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={disabled || !choice || start === null || !program}
              onClick={() => {
                if (start === null || !program) return
                void run(async () => {
                  const { error } = await supabase.rpc('book_trial_at', {
                    p_lead_id: lead.id,
                    p_mentor_id: choice,
                    p_start: new Date(start).toISOString(),
                    p_time_zone: family,
                    p_category: program.id,
                    p_student_name: studentName,
                    p_student_grade: lead.grade ?? '',
                  })
                  if (error) throw error
                  // The booking gets its classroom; email the family the link.
                  sendWaitingInvites()
                }, 'Trial booked and added to the tutor’s calendar.')
              }}
              className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <UserRoundCheck size={13} className="mr-1 inline" aria-hidden />
              Book this tutor
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  )
}
