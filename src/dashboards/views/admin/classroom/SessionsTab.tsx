import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  STATUS_LABEL,
  formatWhen,
  fromLocalInput,
  orNull,
  toLocalInput,
} from './format'
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  Plus,
  RotateCcw,
  Search,
  Shuffle,
  Trash2,
} from 'lucide-react'
import { reopenSession } from '../../../../lib/classroom/repository'
import { isEndedStatus } from '../../../../lib/classroom/sessionStatus'
import type { ClassroomSessionStatus } from '../../../../types/classroomTables'
import type { Database } from '../../../../types/database'
import { RosterEditor } from './RosterEditor'
import { SessionActivityPanel } from './SessionActivityPanel'
import {
  classroomKeys,
  canTeach,
  createSession,
  deleteSession,
  listMaterials,
  listPeople,
  listSessions,
  newRoomCode,
  updateSession,
  type MaterialRow,
  type Person,
  type SessionDraft,
  type SessionRow,
  type SessionSummary,
} from './classroomAdminApi'
import {
  Button,
  Card,
  CardTitle,
  EmptyState,
  ErrorNote,
  Field,
  Loading,
  StatusPill,
  inputClass,
} from './ui'

type ClassType = Database['public']['Enums']['class_type']

const CLASS_TYPES: { value: ClassType; label: string }[] = [
  { value: 'trial', label: 'Trial' },
  { value: 'regular', label: 'Regular' },
  { value: 'makeup', label: 'Make-up' },
]

const STATUSES: ClassroomSessionStatus[] = [
  'scheduled',
  'live',
  'completed',
  'not_completed',
  'cancelled',
]

const asClassType = (value: string): ClassType =>
  CLASS_TYPES.find((option) => option.value === value)?.value ?? 'trial'

const asStatus = (value: string): ClassroomSessionStatus =>
  STATUSES.find((status) => status === value) ?? 'scheduled'

const teacherLink = (roomCode: string) =>
  `${window.location.origin}/classroom/${roomCode}`
const studentLink = (roomCode: string) => `${teacherLink(roomCode)}?join=1`

/** Copy button that says "Copied" for a moment. */
function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={() => {
        navigator.clipboard.writeText(text).then(
          () => {
            setCopied(true)
            window.setTimeout(() => setCopied(false), 1600)
          },
          () => window.prompt('Copy this link:', text),
        )
      }}
    >
      {copied ? (
        <Check size={14} aria-hidden="true" />
      ) : (
        <Copy size={14} aria-hidden="true" />
      )}
      {copied ? 'Copied' : label}
    </Button>
  )
}

function OpenRoomLink({ roomCode }: { roomCode: string }) {
  return (
    <a
      href={`/classroom/${roomCode}`}
      target="_blank"
      rel="noreferrer"
      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-2xl bg-purple-600 px-3 text-xs font-bold text-white shadow-md shadow-purple-500/20 transition-colors hover:bg-purple-700"
    >
      <ExternalLink size={14} aria-hidden="true" />
      Open classroom
    </a>
  )
}

/** One class in a list: what, when, who, plus its room links. */
export function SessionListItem({
  session,
  tutorName,
  onManage,
  onReopen,
  reopening = false,
}: {
  session: SessionSummary
  tutorName: string | null
  onManage?: () => void
  /** Admins only: shown for ended or cancelled classes, which nobody can join. */
  onReopen?: () => void
  reopening?: boolean
}) {
  const names = session.students.map((student) => student.display_name)
  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 transition-colors hover:bg-white lg:flex-row lg:items-center dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="min-w-0 truncate text-base font-black text-slate-900 dark:text-white">
            {session.title}
          </h4>
          <StatusPill status={session.status} />
        </div>
        <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
          <span className="tabular-nums">
            {formatWhen(session.scheduled_at)}
          </span>
          {' · '}Room{' '}
          <span className="font-bold text-slate-700 tabular-nums dark:text-slate-200">
            {session.room_code}
          </span>
          {' · '}
          {tutorName ?? 'No tutor yet'}
        </p>
        <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
          {names.length
            ? `Students: ${names.join(', ')}`
            : 'No students booked yet'}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <OpenRoomLink roomCode={session.room_code} />
        <CopyButton
          text={studentLink(session.room_code)}
          label="Student link"
        />
        {onReopen && isEndedStatus(session.status) && (
          <Button size="sm" onClick={onReopen} busy={reopening}>
            <RotateCcw size={14} aria-hidden="true" />
            Reopen
          </Button>
        )}
        {onManage && (
          <Button size="sm" onClick={onManage}>
            Manage
          </Button>
        )}
      </div>
    </li>
  )
}

export function SessionsTab() {
  const [editing, setEditing] = useState<{ id: string | null } | null>(null)

  if (editing) {
    return (
      <SessionDetail
        key={editing.id ?? 'new'}
        sessionId={editing.id}
        onOpen={(id) => setEditing({ id })}
        onBack={() => setEditing(null)}
      />
    )
  }
  return (
    <SessionList
      onNew={() => setEditing({ id: null })}
      onManage={(id) => setEditing({ id })}
    />
  )
}

function SessionList({
  onNew,
  onManage,
}: {
  onNew: () => void
  onManage: (id: string) => void
}) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<ClassroomSessionStatus | 'all'>('all')
  const queryClient = useQueryClient()
  const sessions = useQuery({
    queryKey: classroomKeys.sessions,
    queryFn: listSessions,
  })
  // Ended classes are closed to everyone until an admin reopens them here.
  const reopen = useMutation({
    mutationFn: reopenSession,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: classroomKeys.sessions }),
  })
  const people = useQuery({
    queryKey: classroomKeys.people,
    queryFn: listPeople,
  })
  const nameOf = (id: string | null) =>
    id ? (people.data?.find((person) => person.id === id)?.name ?? null) : null

  const term = search.trim().toLowerCase()
  const visible = (sessions.data ?? []).filter((session) => {
    if (status !== 'all' && session.status !== status) return false
    if (!term) return true
    return [
      session.title,
      session.room_code,
      nameOf(session.tutor_id) ?? '',
      ...session.students.map((student) => student.display_name),
    ].some((value) => value.toLowerCase().includes(term))
  })

  return (
    <Card>
      <CardTitle
        aside={
          <Button variant="primary" onClick={onNew}>
            <Plus size={16} aria-hidden="true" />
            New class
          </Button>
        }
      >
        Classes
      </CardTitle>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={16}
            aria-hidden="true"
            className="absolute top-1/2 left-4 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            aria-label="Search classes"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by class, room code, tutor or student"
            className={`${inputClass} pl-11`}
          />
        </div>
        <select
          aria-label="Filter by status"
          value={status}
          onChange={(event) =>
            setStatus(
              event.target.value === 'all'
                ? 'all'
                : asStatus(event.target.value),
            )
          }
          className={`${inputClass} sm:w-48`}
        >
          <option value="all">All statuses</option>
          {STATUSES.map((value) => (
            <option key={value} value={value}>
              {STATUS_LABEL[value]}
            </option>
          ))}
        </select>
      </div>

      {sessions.isPending ? (
        <Loading label="Loading classes…" />
      ) : sessions.isError ? (
        <ErrorNote>{sessions.error.message}</ErrorNote>
      ) : visible.length === 0 ? (
        <EmptyState>
          {sessions.data.length
            ? 'No classes match your search.'
            : 'No classes yet. Create one, add its students, then share the classroom link.'}
        </EmptyState>
      ) : (
        <>
          {reopen.isError && (
            <div className="mb-3">
              <ErrorNote>{reopen.error.message}</ErrorNote>
            </div>
          )}
          <ul className="space-y-3">
            {visible.map((session) => (
              <SessionListItem
                key={session.id}
                session={session}
                tutorName={nameOf(session.tutor_id)}
                onManage={() => onManage(session.id)}
                onReopen={() => reopen.mutate(session.id)}
                reopening={reopen.isPending && reopen.variables === session.id}
              />
            ))}
          </ul>
        </>
      )}
    </Card>
  )
}

function SessionDetail({
  sessionId,
  onOpen,
  onBack,
}: {
  sessionId: string | null
  onOpen: (id: string) => void
  onBack: () => void
}) {
  const sessions = useQuery({
    queryKey: classroomKeys.sessions,
    queryFn: listSessions,
  })
  const people = useQuery({
    queryKey: classroomKeys.people,
    queryFn: listPeople,
  })
  const materials = useQuery({
    queryKey: classroomKeys.materials,
    queryFn: listMaterials,
  })
  const session = sessionId
    ? (sessions.data?.find((candidate) => candidate.id === sessionId) ?? null)
    : null

  const back = (
    <Button variant="ghost" onClick={onBack} className="-ml-2">
      <ArrowLeft size={16} aria-hidden="true" />
      All classes
    </Button>
  )

  if (sessionId && sessions.isPending) {
    return (
      <div className="space-y-4">
        {back}
        <Loading label="Loading the class…" />
      </div>
    )
  }
  if (sessionId && !session) {
    return (
      <div className="space-y-4">
        {back}
        <ErrorNote>
          {sessions.error?.message ?? 'This class no longer exists.'}
        </ErrorNote>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {back}
      <SessionForm
        session={session}
        people={people.data ?? []}
        materials={materials.data ?? []}
        onCreated={onOpen}
        onDeleted={onBack}
      />
      {session ? (
        <>
          <RosterEditor sessionId={session.id} />
          <SessionActivityPanel session={session} />
        </>
      ) : (
        <EmptyState>
          Save the class first, then add its students here.
        </EmptyState>
      )}
    </div>
  )
}

const emptyDraft = (): SessionDraft => ({
  room_code: newRoomCode(),
  title: '',
  page_title: 'Live class',
  class_type: 'trial',
  tutor_id: null,
  material_id: null,
  scheduled_at: null,
  duration_minutes: 60,
  status: 'scheduled',
})

const toDraft = (session: SessionRow): SessionDraft => ({
  room_code: session.room_code,
  title: session.title,
  page_title: session.page_title,
  class_type: session.class_type,
  tutor_id: session.tutor_id,
  material_id: session.material_id,
  scheduled_at: session.scheduled_at,
  duration_minutes: session.duration_minutes,
  status: session.status,
})

function SessionForm({
  session,
  people,
  materials,
  onCreated,
  onDeleted,
}: {
  session: SessionRow | null
  people: Person[]
  materials: MaterialRow[]
  onCreated: (id: string) => void
  onDeleted: () => void
}) {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<SessionDraft>(() =>
    session ? toDraft(session) : emptyDraft(),
  )
  const [saved, setSaved] = useState(false)
  const set = (patch: Partial<SessionDraft>) => {
    setSaved(false)
    setDraft((current) => ({ ...current, ...patch }))
  }
  const tutors = people.filter(canTeach)

  const save = useMutation({
    mutationFn: (next: SessionDraft) =>
      session ? updateSession(session.id, next) : createSession(next),
    onSuccess: async (row) => {
      await queryClient.invalidateQueries({ queryKey: classroomKeys.sessions })
      if (session) setSaved(true)
      else onCreated(row.id)
    },
  })
  const remove = useMutation({
    mutationFn: deleteSession,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: classroomKeys.sessions })
      onDeleted()
    },
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    save.mutate({
      ...draft,
      title: draft.title.trim(),
      room_code: draft.room_code.trim(),
      page_title: draft.page_title.trim() || 'Live class',
    })
  }

  const id = session?.id ?? 'new'
  return (
    <Card>
      <CardTitle
        aside={
          session && (
            <div className="flex flex-wrap items-center gap-1.5">
              <OpenRoomLink roomCode={session.room_code} />
              <CopyButton
                text={teacherLink(session.room_code)}
                label="Teacher link"
              />
              <CopyButton
                text={studentLink(session.room_code)}
                label="Student link"
              />
            </div>
          )
        }
      >
        {session ? 'Class settings' : 'New class'}
      </CardTitle>

      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Class title" htmlFor={`${id}-title`} required>
            <input
              id={`${id}-title`}
              required
              maxLength={200}
              value={draft.title}
              onChange={(event) => set({ title: event.target.value })}
              placeholder="AI & Coding Trial [Grade 6-8]"
              className={inputClass}
            />
          </Field>
          <Field
            label="Room code"
            htmlFor={`${id}-room`}
            required
            hint="The classroom link is /classroom/<room code>. 4–64 letters, numbers, - or _."
          >
            <div className="flex gap-2">
              <input
                id={`${id}-room`}
                required
                pattern="[A-Za-z0-9_\-]{4,64}"
                value={draft.room_code}
                onChange={(event) => set({ room_code: event.target.value })}
                className={`${inputClass} tabular-nums`}
              />
              <Button
                onClick={() => set({ room_code: newRoomCode() })}
                aria-label="Generate a new room code"
                title="Generate a new room code"
                square
              >
                <Shuffle size={16} aria-hidden="true" />
              </Button>
            </div>
          </Field>
          <Field label="Tutor" htmlFor={`${id}-tutor`}>
            <select
              id={`${id}-tutor`}
              value={draft.tutor_id ?? ''}
              onChange={(event) =>
                set({ tutor_id: orNull(event.target.value) })
              }
              className={inputClass}
            >
              <option value="">No tutor yet (admins only)</option>
              {tutors.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                  {person.role === 'tutor' ? '' : ' (admin)'}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Lesson material" htmlFor={`${id}-material`}>
            <select
              id={`${id}-material`}
              value={draft.material_id ?? ''}
              onChange={(event) =>
                set({ material_id: orNull(event.target.value) })
              }
              className={inputClass}
            >
              <option value="">No lesson material</option>
              {materials.map((material) => (
                <option key={material.id} value={material.id}>
                  {material.title}
                  {material.is_active ? '' : ' (hidden)'}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Starts at" htmlFor={`${id}-when`}>
            <input
              id={`${id}-when`}
              type="datetime-local"
              value={toLocalInput(draft.scheduled_at)}
              onChange={(event) =>
                set({ scheduled_at: fromLocalInput(event.target.value) })
              }
              className={inputClass}
            />
          </Field>
          <Field
            label="Length (minutes)"
            htmlFor={`${id}-length`}
            hint="The End class form asks for a reason if the class runs shorter."
          >
            <input
              id={`${id}-length`}
              type="number"
              min={5}
              max={600}
              value={draft.duration_minutes ?? ''}
              onChange={(event) =>
                set({
                  duration_minutes: event.target.value
                    ? Number(event.target.value)
                    : null,
                })
              }
              className={inputClass}
            />
          </Field>
          <Field label="Class type" htmlFor={`${id}-type`}>
            <select
              id={`${id}-type`}
              value={draft.class_type}
              onChange={(event) =>
                set({ class_type: asClassType(event.target.value) })
              }
              className={inputClass}
            >
              {CLASS_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Status"
            htmlFor={`${id}-status`}
            hint="Set automatically when the teacher opens and ends the class."
          >
            <select
              id={`${id}-status`}
              value={draft.status}
              onChange={(event) =>
                set({ status: asStatus(event.target.value) })
              }
              className={inputClass}
            >
              {STATUSES.map((value) => (
                <option key={value} value={value}>
                  {STATUS_LABEL[value]}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Browser tab title"
            htmlFor={`${id}-tab`}
            hint="Shown in the browser tab while the class is open."
            className="md:col-span-2"
          >
            <input
              id={`${id}-tab`}
              maxLength={120}
              value={draft.page_title}
              onChange={(event) => set({ page_title: event.target.value })}
              className={inputClass}
            />
          </Field>
        </div>

        {save.isError && <ErrorNote>{save.error.message}</ErrorNote>}
        {remove.isError && <ErrorNote>{remove.error.message}</ErrorNote>}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="primary" busy={save.isPending}>
            {session ? 'Save changes' : 'Create class'}
          </Button>
          {saved && (
            <output className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              Saved
            </output>
          )}
          {session && (
            <Button
              variant="danger"
              className="ml-auto"
              busy={remove.isPending}
              onClick={() => {
                if (
                  window.confirm(
                    `Delete “${session.title}”? Its students, badges, projects and alerts are deleted too. Recordings are kept.`,
                  )
                ) {
                  remove.mutate(session.id)
                }
              }}
            >
              <Trash2 size={16} aria-hidden="true" />
              Delete class
            </Button>
          )}
        </div>
      </form>
    </Card>
  )
}
