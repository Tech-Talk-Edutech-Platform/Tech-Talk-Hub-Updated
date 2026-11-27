import { Search } from 'lucide-react'

import type {
  PersonOption,
  RecordingFilterState,
  RecordingKind,
} from './recordingsApi'

type RecordingFiltersProps = {
  value: RecordingFilterState
  onChange: (value: RecordingFilterState) => void
  counts: Record<RecordingKind | 'all', number>
  /** Staff filter by trial/regular; admins also by tutor and student. */
  showKind: boolean
  tutors: PersonOption[]
  students: PersonOption[]
  shown: number
}

const selectClass =
  'rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-purple-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200'

const KIND_LABEL: Record<RecordingKind | 'all', string> = {
  all: 'All',
  regular: 'Regular classes',
  trial: 'Trial classes',
}

/** Search plus, for staff, trial/regular tabs and tutor/student pickers. */
export function RecordingFilters({
  value,
  onChange,
  counts,
  showKind,
  tutors,
  students,
  shown,
}: RecordingFiltersProps) {
  const set = (changes: Partial<RecordingFilterState>) =>
    onChange({ ...value, ...changes })

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900/40">
      {showKind && (
        <fieldset className="flex flex-wrap gap-2">
          <legend className="sr-only">Class type</legend>
          {(['all', 'regular', 'trial'] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              aria-pressed={value.kind === kind}
              onClick={() => set({ kind })}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                value.kind === kind
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300'
              }`}
            >
              {KIND_LABEL[kind]}
              <span className="tabular-nums opacity-70">{counts[kind]}</span>
            </button>
          ))}
        </fieldset>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search
            className="absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400"
            size={17}
            aria-hidden="true"
          />
          <label htmlFor="recording-search" className="sr-only">
            Search recordings
          </label>
          <input
            id="recording-search"
            type="search"
            value={value.search}
            onChange={(event) => set({ search: event.target.value })}
            placeholder="Search by title, tutor or student…"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-4 pl-10 text-sm text-slate-900 placeholder-slate-400 focus:border-purple-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:placeholder-slate-500"
          />
        </div>
        {tutors.length > 0 && (
          <>
            <label htmlFor="recording-filter-tutor" className="sr-only">
              Tutor
            </label>
            <select
              id="recording-filter-tutor"
              value={value.tutorId}
              onChange={(event) => set({ tutorId: event.target.value })}
              className={selectClass}
            >
              <option value="">All tutors</option>
              {tutors.map((tutor) => (
                <option key={tutor.id} value={tutor.id}>
                  {tutor.full_name}
                </option>
              ))}
            </select>
          </>
        )}
        {showKind && students.length > 0 && (
          <>
            <label htmlFor="recording-filter-student" className="sr-only">
              Student
            </label>
            <select
              id="recording-filter-student"
              value={value.studentId}
              onChange={(event) => set({ studentId: event.target.value })}
              className={selectClass}
            >
              <option value="">All students</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.full_name}
                </option>
              ))}
            </select>
          </>
        )}
        <p className="px-1 text-xs font-medium text-slate-500 tabular-nums dark:text-slate-400">
          {shown} shown
        </p>
      </div>
    </div>
  )
}
