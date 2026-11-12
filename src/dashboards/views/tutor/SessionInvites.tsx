import { useId, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, UserPlus, X } from 'lucide-react'
import {
  classroomKeys,
  inviteStudents,
  listInvitableStudents,
  withdrawInvite,
  type InvitableStudent,
  type SessionSummary,
} from '../admin/classroom/classroomAdminApi'
import { Button, ErrorNote, inputClass } from '../admin/classroom/ui'

type StudentPickerProps = {
  tutorId: string
  /** Students already in the class (users.id); not offered again. */
  exclude: ReadonlySet<string>
  selected: InvitableStudent[]
  onChange: (next: InvitableStudent[]) => void
}

/** Search and tick which of the tutor's own students to invite. */
export function StudentPicker({
  tutorId,
  exclude,
  selected,
  onChange,
}: StudentPickerProps) {
  const searchId = useId()
  const [search, setSearch] = useState('')
  const students = useQuery({
    queryKey: classroomKeys.invitable(tutorId),
    queryFn: () => listInvitableStudents(tutorId),
    staleTime: 5 * 60_000,
  })

  const term = search.trim().toLowerCase()
  const options = (students.data ?? []).filter(
    (student) =>
      !exclude.has(student.id) &&
      (!term ||
        student.name.toLowerCase().includes(term) ||
        student.email.toLowerCase().includes(term)),
  )
  let emptyMessage =
    'No students are assigned to you yet. An admin assigns them in Users & Staff.'
  if (term) emptyMessage = 'None of your students match that search.'
  else if (students.data?.length) {
    emptyMessage = 'All your students are already invited.'
  }
  const isSelected = (id: string) => selected.some((item) => item.id === id)
  const toggle = (student: InvitableStudent) =>
    onChange(
      isSelected(student.id)
        ? selected.filter((item) => item.id !== student.id)
        : [...selected, student],
    )

  return (
    <div className="space-y-2">
      <label htmlFor={searchId} className="sr-only">
        Search students
      </label>
      <div className="relative">
        <Search
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400"
        />
        <input
          id={searchId}
          type="search"
          className={`${inputClass} pl-10`}
          placeholder="Search your students"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      {students.isPending ? (
        <p className="px-1 py-3 text-sm text-slate-500 dark:text-slate-400">
          Loading students…
        </p>
      ) : students.isError ? (
        <ErrorNote>{students.error.message}</ErrorNote>
      ) : options.length ? (
        <ul className="max-h-56 space-y-1 overflow-y-auto rounded-2xl border border-slate-100 bg-white p-1.5 dark:border-white/10 dark:bg-white/5">
          {options.map((student) => (
            <li key={student.id}>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 hover:bg-slate-50 dark:hover:bg-white/10">
                <input
                  type="checkbox"
                  className="size-4 shrink-0 accent-purple-600"
                  checked={isSelected(student.id)}
                  onChange={() => toggle(student)}
                />
                <span className="sr-only">Invite</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                    {student.name}
                  </span>
                  <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                    {student.email}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-1 py-3 text-sm text-slate-500 dark:text-slate-400">
          {emptyMessage}
        </p>
      )}
    </div>
  )
}

/**
 * Under each upcoming class on My Classrooms: who's invited, and a picker to
 * invite more. Invited students see the class under Dashboard › My Classroom
 * and can be given badges and projects in the room.
 */
export function SessionInvites({
  session,
  tutorId,
}: {
  session: SessionSummary
  tutorId: string
}) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<InvitableStudent[]>([])
  const refresh = () =>
    queryClient.invalidateQueries({
      queryKey: classroomKeys.tutorSessions(tutorId),
    })

  const invite = useMutation({
    mutationFn: (students: InvitableStudent[]) =>
      inviteStudents(session.id, students, session.students.length),
    onSuccess: async () => {
      setSelected([])
      setOpen(false)
      await refresh()
    },
  })
  const withdraw = useMutation({
    mutationFn: withdrawInvite,
    onSuccess: refresh,
  })

  const invitedIds = new Set(
    session.students.flatMap((student) =>
      student.student_id ? [student.student_id] : [],
    ),
  )
  // Withdrawing deletes the roster row along with anything given in class,
  // so it's only offered (and only allowed) before the class starts.
  const canWithdraw = session.status === 'scheduled'

  return (
    <div className="mt-4 border-t border-slate-100 pt-4 dark:border-white/10">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
          Invited:
        </span>
        {session.students.length ? (
          session.students.map((student) => (
            <span
              key={student.id}
              className="inline-flex items-center gap-1 rounded-full bg-white py-1 pr-1 pl-3 text-xs font-bold text-slate-700 ring-1 ring-slate-200 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10"
            >
              {student.display_name}
              {canWithdraw ? (
                <button
                  type="button"
                  onClick={() => withdraw.mutate(student.id)}
                  disabled={withdraw.isPending}
                  aria-label={`Withdraw ${student.display_name}’s invite`}
                  className="grid size-5 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  <X size={12} aria-hidden="true" />
                </button>
              ) : (
                <span className="w-2" />
              )}
            </span>
          ))
        ) : (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Nobody yet. Invite one of your students so they can join from their
            dashboard and you can give them badges.
          </span>
        )}
        <Button
          size="sm"
          variant={open ? 'ghost' : 'secondary'}
          className="ml-auto"
          aria-expanded={open}
          onClick={() => {
            setOpen((value) => !value)
            invite.reset()
          }}
        >
          <UserPlus size={14} aria-hidden="true" />
          {open ? 'Close' : 'Invite students'}
        </Button>
      </div>

      {withdraw.isError && (
        <div className="mt-3">
          <ErrorNote>{withdraw.error.message}</ErrorNote>
        </div>
      )}

      {open && (
        <div className="mt-3 space-y-3">
          <StudentPicker
            tutorId={tutorId}
            exclude={invitedIds}
            selected={selected}
            onChange={setSelected}
          />
          {invite.isError && <ErrorNote>{invite.error.message}</ErrorNote>}
          <div className="flex justify-end">
            <Button
              variant="primary"
              size="sm"
              disabled={!selected.length}
              busy={invite.isPending}
              onClick={() => invite.mutate(selected)}
            >
              {selected.length > 1
                ? `Send ${selected.length} invites`
                : 'Send invite'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
