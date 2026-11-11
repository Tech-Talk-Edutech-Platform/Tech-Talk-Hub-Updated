import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link2, MessageSquare, Pencil, Plus, Trash2, X } from 'lucide-react'
import { orNull } from './format'
import {
  addRosterRow,
  classroomKeys,
  listLeads,
  listPeople,
  listRoster,
  removeRosterRow,
  updateRosterRow,
  type LeadOption,
  type Person,
  type RosterDraft,
  type RosterRow,
} from './classroomAdminApi'
import {
  Button,
  Card,
  CardTitle,
  EmptyState,
  ErrorNote,
  Field,
  Loading,
  inputClass,
  textareaClass,
} from './ui'

const TIME_ZONES = Intl.supportedValuesOf('timeZone')

const blankDraft = (): RosterDraft => ({
  student_id: null,
  lead_id: null,
  display_name: '',
  grade: null,
  student_code: null,
  phone: null,
  email: null,
  country: null,
  city: null,
  time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  language: null,
  source: null,
  interests: [],
  special_requirement: null,
})

const toDraft = (row: RosterRow): RosterDraft => ({
  student_id: row.student_id,
  lead_id: row.lead_id,
  display_name: row.display_name,
  grade: row.grade,
  student_code: row.student_code,
  phone: row.phone,
  email: row.email,
  country: row.country,
  city: row.city,
  time_zone: row.time_zone,
  language: row.language,
  source: row.source,
  interests: row.interests,
  special_requirement: row.special_requirement,
})

const fromStudent = (draft: RosterDraft, person: Person): RosterDraft => ({
  ...draft,
  student_id: person.id,
  display_name: draft.display_name || person.name,
  email: draft.email ?? person.email,
})

const fromLead = (draft: RosterDraft, lead: LeadOption): RosterDraft => ({
  ...draft,
  lead_id: lead.id,
  student_id: draft.student_id ?? lead.student_user_id,
  display_name: draft.display_name || lead.student_name || '',
  grade: draft.grade ?? lead.grade,
  phone: draft.phone ?? lead.phone,
  email: draft.email ?? lead.email,
  country: draft.country ?? lead.country,
  source: draft.source ?? lead.lead_source,
})

const leadLabel = (lead: LeadOption) =>
  [
    lead.student_name || 'Unnamed student',
    lead.parent_name && `parent ${lead.parent_name}`,
    lead.grade && `grade ${lead.grade}`,
  ]
    .filter(Boolean)
    .join(' · ')

type Editing = { row: RosterRow | null }

/** The roster's optional free-text columns. */
type TextField =
  | 'grade'
  | 'student_code'
  | 'phone'
  | 'email'
  | 'country'
  | 'city'
  | 'language'
  | 'source'
  | 'special_requirement'

export function RosterEditor({ sessionId }: { sessionId: string }) {
  const queryClient = useQueryClient()
  const roster = useQuery({
    queryKey: classroomKeys.roster(sessionId),
    queryFn: () => listRoster(sessionId),
  })
  const [editing, setEditing] = useState<Editing | null>(null)

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: classroomKeys.roster(sessionId),
      }),
      queryClient.invalidateQueries({ queryKey: classroomKeys.sessions }),
    ])
  }
  const remove = useMutation({
    mutationFn: removeRosterRow,
    onSuccess: refresh,
  })

  const rows = roster.data ?? []
  return (
    <Card>
      <CardTitle
        aside={
          !editing && (
            <Button variant="primary" onClick={() => setEditing({ row: null })}>
              <Plus size={16} aria-hidden="true" />
              Add student
            </Button>
          )
        }
      >
        Students in this class
      </CardTitle>

      {editing && (
        <RosterForm
          key={editing.row?.id ?? 'new'}
          sessionId={sessionId}
          row={editing.row}
          position={rows.length}
          onDone={() => setEditing(null)}
          onSaved={refresh}
        />
      )}

      {roster.isPending ? (
        <Loading label="Loading students…" />
      ) : roster.isError ? (
        <ErrorNote>{roster.error.message}</ErrorNote>
      ) : rows.length === 0 ? (
        !editing && (
          <EmptyState>
            No students yet. The classroom shows their profile, local time and
            special requirements to the teacher.
          </EmptyState>
        )
      ) : (
        <ul className="mt-2 divide-y divide-slate-100 dark:divide-white/10">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-white">
                    {row.display_name}
                  </span>
                  <SourceChip row={row} />
                  {row.special_requirement && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-pink-50 px-2 py-0.5 text-[11px] font-bold text-pink-700 dark:bg-pink-500/10 dark:text-pink-300">
                      <MessageSquare size={11} aria-hidden="true" />
                      Special requirement
                    </span>
                  )}
                  {row.attended !== null && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        row.attended
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                          : 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300'
                      }`}
                    >
                      {row.attended ? 'Attended' : 'Absent'}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                  {[
                    row.grade && `Grade ${row.grade}`,
                    [row.city, row.country].filter(Boolean).join(', '),
                    row.time_zone,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditing({ row })}
                  aria-label={`Edit ${row.display_name}`}
                >
                  <Pencil size={14} aria-hidden="true" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  busy={remove.isPending && remove.variables === row.id}
                  square
                  aria-label={`Remove ${row.display_name}`}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Remove ${row.display_name} from this class? Their badges and projects for this class are removed too.`,
                      )
                    ) {
                      remove.mutate(row.id)
                    }
                  }}
                >
                  <Trash2 size={14} aria-hidden="true" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {remove.isError && (
        <div className="mt-3">
          <ErrorNote>{remove.error.message}</ErrorNote>
        </div>
      )}
    </Card>
  )
}

function SourceChip({ row }: { row: RosterRow }) {
  const label = row.student_id
    ? 'Registered student'
    : row.lead_id
      ? 'Trial lead'
      : 'Added by hand'
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
      {label}
    </span>
  )
}

function RosterForm({
  sessionId,
  row,
  position,
  onDone,
  onSaved,
}: {
  sessionId: string
  row: RosterRow | null
  position: number
  onDone: () => void
  onSaved: () => Promise<void>
}) {
  const people = useQuery({
    queryKey: classroomKeys.people,
    queryFn: listPeople,
  })
  const leads = useQuery({ queryKey: classroomKeys.leads, queryFn: listLeads })
  const [draft, setDraft] = useState<RosterDraft>(() =>
    row ? toDraft(row) : blankDraft(),
  )
  const [interests, setInterests] = useState(() =>
    (row?.interests ?? []).join(', '),
  )
  const set = (patch: Partial<RosterDraft>) =>
    setDraft((current) => ({ ...current, ...patch }))
  /** value/onChange for an optional text field ('' is stored as null). */
  const text = (key: TextField) => ({
    value: draft[key] ?? '',
    onChange: (event: { target: { value: string } }) => {
      const value = orNull(event.target.value)
      setDraft((current) => ({ ...current, [key]: value }))
    },
  })

  const students = (people.data ?? []).filter(
    (person) => person.role === 'student',
  )
  const linkedStudent = students.find(
    (person) => person.id === draft.student_id,
  )
  const linkedLead = leads.data?.find((lead) => lead.id === draft.lead_id)

  const save = useMutation({
    mutationFn: (next: RosterDraft) =>
      row
        ? updateRosterRow(row.id, next)
        : addRosterRow(sessionId, next, position),
    onSuccess: async () => {
      await onSaved()
      onDone()
    },
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    save.mutate({
      ...draft,
      display_name: draft.display_name.trim(),
      time_zone: draft.time_zone.trim() || 'UTC',
      interests: interests
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    })
  }

  const id = `roster-${row?.id ?? 'new'}`
  return (
    <form
      onSubmit={submit}
      className="mb-6 space-y-5 rounded-2xl border border-purple-100 bg-purple-50/40 p-4 md:p-5 dark:border-purple-500/20 dark:bg-purple-500/5"
    >
      <div className="flex items-center justify-between gap-3">
        <h4 className="font-black text-slate-900 dark:text-white">
          {row ? `Edit ${row.display_name}` : 'Add a student'}
        </h4>
        <Button
          size="sm"
          variant="ghost"
          onClick={onDone}
          square
          aria-label="Close without saving"
        >
          <X size={16} aria-hidden="true" />
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Registered student"
          htmlFor={`${id}-student`}
          hint="Links the class to their account, so badges and projects show on their dashboard."
        >
          <select
            id={`${id}-student`}
            value={draft.student_id ?? ''}
            onChange={(event) => {
              const person = students.find(
                (candidate) => candidate.id === event.target.value,
              )
              setDraft((current) =>
                person
                  ? fromStudent(current, person)
                  : { ...current, student_id: null },
              )
            }}
            className={inputClass}
          >
            <option value="">
              {people.isPending ? 'Loading students…' : 'Not linked'}
            </option>
            {students.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name} ({person.email})
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Trial lead"
          htmlFor={`${id}-lead`}
          hint="Fills in the details the parent gave when booking."
        >
          <select
            id={`${id}-lead`}
            value={draft.lead_id ?? ''}
            onChange={(event) => {
              const lead = leads.data?.find(
                (candidate) => candidate.id === event.target.value,
              )
              setDraft((current) =>
                lead ? fromLead(current, lead) : { ...current, lead_id: null },
              )
            }}
            className={inputClass}
          >
            <option value="">
              {leads.isPending ? 'Loading leads…' : 'Not from a lead'}
            </option>
            {(leads.data ?? []).map((lead) => (
              <option key={lead.id} value={lead.id}>
                {leadLabel(lead)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {(linkedStudent || linkedLead) && (
        <p className="flex items-center gap-2 text-xs font-medium text-purple-700 dark:text-purple-300">
          <Link2 size={14} aria-hidden="true" />
          {linkedStudent
            ? `Linked to ${linkedStudent.name}’s account${linkedLead ? ' and their trial lead' : ''}.`
            : `Filled in from the trial lead for ${linkedLead?.student_name || 'this student'}.`}{' '}
          The fields below are a copy you can edit.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Field
          label="Name shown in class"
          htmlFor={`${id}-name`}
          required
          className="md:col-span-2"
        >
          <input
            id={`${id}-name`}
            required
            maxLength={120}
            value={draft.display_name}
            onChange={(event) => set({ display_name: event.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="Grade" htmlFor={`${id}-grade`}>
          <input id={`${id}-grade`} {...text('grade')} className={inputClass} />
        </Field>
        <Field label="Student ID" htmlFor={`${id}-code`} hint="e.g. s2048117">
          <input
            id={`${id}-code`}
            {...text('student_code')}
            className={inputClass}
          />
        </Field>
        <Field label="Email" htmlFor={`${id}-email`}>
          <input
            id={`${id}-email`}
            type="email"
            {...text('email')}
            className={inputClass}
          />
        </Field>
        <Field label="Phone" htmlFor={`${id}-phone`}>
          <input
            id={`${id}-phone`}
            type="tel"
            {...text('phone')}
            className={inputClass}
          />
        </Field>
        <Field label="Country" htmlFor={`${id}-country`}>
          <input
            id={`${id}-country`}
            {...text('country')}
            className={inputClass}
          />
        </Field>
        <Field label="City" htmlFor={`${id}-city`}>
          <input id={`${id}-city`} {...text('city')} className={inputClass} />
        </Field>
        <Field
          label="Time zone"
          htmlFor={`${id}-tz`}
          required
          hint="The teacher sees the student’s local time."
        >
          <input
            id={`${id}-tz`}
            required
            list={`${id}-tz-list`}
            value={draft.time_zone}
            onChange={(event) => set({ time_zone: event.target.value })}
            className={inputClass}
          />
          <datalist id={`${id}-tz-list`}>
            {TIME_ZONES.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </datalist>
        </Field>
        <Field label="Language" htmlFor={`${id}-language`}>
          <input
            id={`${id}-language`}
            {...text('language')}
            className={inputClass}
          />
        </Field>
        <Field
          label="Booking source"
          htmlFor={`${id}-source`}
          hint="Landing page, referral…"
        >
          <input
            id={`${id}-source`}
            {...text('source')}
            className={inputClass}
          />
        </Field>
        <Field
          label="Interests"
          htmlFor={`${id}-interests`}
          hint="Separate with commas."
        >
          <input
            id={`${id}-interests`}
            value={interests}
            onChange={(event) => setInterests(event.target.value)}
            placeholder="Games, robots, drawing"
            className={inputClass}
          />
        </Field>
        <Field
          label="Special requirement"
          htmlFor={`${id}-special`}
          hint="Shown to the teacher with a pink tag in Class details."
          className="md:col-span-3"
        >
          <textarea
            id={`${id}-special`}
            rows={2}
            {...text('special_requirement')}
            className={textareaClass}
          />
        </Field>
      </div>

      {save.isError && <ErrorNote>{save.error.message}</ErrorNote>}
      <div className="flex gap-3">
        <Button type="submit" variant="primary" busy={save.isPending}>
          {row ? 'Save student' : 'Add to class'}
        </Button>
        <Button onClick={onDone}>Cancel</Button>
      </div>
    </form>
  )
}
