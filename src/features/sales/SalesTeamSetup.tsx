import { useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  GraduationCap,
  Target,
} from 'lucide-react'
import { toast } from 'react-hot-toast'

import { useNow } from '../../hooks/useNow'
import { GRADE_CATEGORIES, gradeRange } from './gradeCategories'
import { problemText, useSalesData } from './salesDataContext'
import { inputClass } from './styles'
import type { GradeCategoryId, Mentor, SalesRep } from './types'
import { EmptyState, Initials, Panel } from './ui'

/**
 * Admin settings behind the sales dashboard: which programs each tutor takes
 * trials for, whether they have a meeting link, and each rep's target.
 */
export function SalesTeamSetup() {
  const data = useSalesData()
  const now = useNow(60_000)
  const monthName = new Date(now).toLocaleDateString([], { month: 'long' })
  const missingLinks = data.mentors.filter((mentor) => !mentor.meetLink)

  return (
    <div className="space-y-5">
      {missingLinks.length > 0 && (
        <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden />
          <p>
            <strong>
              {missingLinks.map((mentor) => mentor.name).join(', ')}{' '}
              {missingLinks.length === 1 ? 'has' : 'have'} no meeting link.
            </strong>{' '}
            Parents’ confirmations say the link will follow until one is added.
            Add it in Users & Staff → Edit.
          </p>
        </div>
      )}

      <Panel title="Tutors taking trials" icon={GraduationCap}>
        <p className="mb-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
          Reps only see a tutor’s open slots for the programs ticked here. A
          tutor nobody has set up takes every program. Tutors open slots from
          their own calendar (“Free Slot”).
        </p>
        {data.mentors.length === 0 ? (
          <EmptyState>
            No tutors yet. Add one in Users & Staff with the Tutor role.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-white/10">
            {data.mentors.map((mentor) => (
              <MentorRow key={mentor.id} mentor={mentor} />
            ))}
          </ul>
        )}
      </Panel>

      <Panel title={`Sales targets · ${monthName}`} icon={Target}>
        {data.reps.length === 0 ? (
          <EmptyState>
            Nobody on the sales team yet. Add someone in Users & Staff with the
            Sales & Marketing role.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-white/10">
            {data.reps.map((rep) => (
              <TargetRow key={rep.id} rep={rep} />
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}

function MentorRow({ mentor }: { mentor: Mentor }) {
  const data = useSalesData()
  const [saving, setSaving] = useState(false)

  const toggle = async (id: GradeCategoryId) => {
    const next = mentor.categories.includes(id)
      ? mentor.categories.filter((category) => category !== id)
      : [...mentor.categories, id]
    if (next.length === 0) {
      toast.error(`${mentor.name} needs at least one program.`)
      return
    }
    setSaving(true)
    try {
      await data.setMentorPrograms(mentor.id, next)
    } catch (error) {
      toast.error(problemText(error, 'Couldn’t save the programs.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <li className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <Initials name={mentor.name} size={34} />
        <div className="min-w-0">
          <p className="font-extrabold text-slate-900 dark:text-white">
            {mentor.name}
          </p>
          <p className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            {mentor.meetLink ? (
              <>
                <CheckCircle2
                  size={12}
                  className="text-emerald-600"
                  aria-hidden
                />
                Meeting link set
              </>
            ) : (
              <>
                <AlertTriangle
                  size={12}
                  className="text-amber-600"
                  aria-hidden
                />
                No meeting link
              </>
            )}
            {mentor.programsChosen === false && ' · takes every program'}
          </p>
        </div>
      </div>
      <fieldset
        disabled={saving}
        aria-busy={saving}
        className="flex flex-wrap gap-1.5 disabled:opacity-60"
      >
        <legend className="sr-only">Programs {mentor.name} teaches</legend>
        {GRADE_CATEGORIES.map((category) => {
          const on = mentor.categories.includes(category.id)
          return (
            <button
              key={category.id}
              type="button"
              aria-pressed={on}
              onClick={() => void toggle(category.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition ring-inset ${
                on
                  ? 'bg-purple-600 text-white ring-purple-600 hover:bg-purple-700'
                  : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50 dark:bg-transparent dark:text-slate-300 dark:ring-white/15 dark:hover:bg-white/5'
              }`}
            >
              {category.label}
              <span className="ml-1 font-medium opacity-75">
                {gradeRange(category)}
              </span>
            </button>
          )
        })}
      </fieldset>
    </li>
  )
}

function TargetRow({ rep }: { rep: SalesRep }) {
  const data = useSalesData()
  const [value, setValue] = useState(String(rep.monthlyTarget))
  const [saving, setSaving] = useState(false)
  const target = Number(value)
  const changed = value.trim() !== '' && target !== rep.monthlyTarget

  const save = async () => {
    setSaving(true)
    try {
      await data.setMonthlyTarget(rep.id, target)
      toast.success(`${rep.name}’s target is ${target} sales this month.`)
    } catch (error) {
      toast.error(problemText(error, 'Couldn’t save the target.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <span className="flex min-w-0 items-center gap-3">
        <Initials name={rep.name} size={34} />
        <span className="font-extrabold text-slate-900 dark:text-white">
          {rep.name}
        </span>
      </span>
      <form
        className="flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          if (changed) void save()
        }}
      >
        <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
          Sales to close
          <input
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className={`${inputClass} w-20 tabular-nums`}
          />
        </label>
        <button
          type="submit"
          disabled={!changed || saving}
          className="rounded-xl bg-purple-600 px-3 py-2.5 text-xs font-extrabold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </form>
    </li>
  )
}
