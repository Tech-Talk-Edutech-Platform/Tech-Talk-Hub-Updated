import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Presentation, Video } from 'lucide-react'
import { useNow } from '../../../hooks/useNow'
import { EARLY_JOIN_MINUTES, isExpired } from '../../../lib/classroom/schedule'
import { SessionListItem } from '../admin/classroom/SessionsTab'
import {
  ClassroomSchemaMissing,
  classroomKeys,
  createSession,
  inviteStudents,
  listTutorSessions,
  newRoomCode,
  sessionSchedule,
  type InvitableStudent,
  type SessionSummary,
} from '../admin/classroom/classroomAdminApi'
import { fromLocalInput, toLocalInput } from '../admin/classroom/format'
import {
  Button,
  Card,
  EmptyState,
  ErrorNote,
  Field,
  inputClass,
  Loading,
} from '../admin/classroom/ui'
import { SessionInvites, StudentPicker } from './SessionInvites'

const NOBODY: ReadonlySet<string> = new Set()

/** Class lengths a tutor can pick, in minutes. */
const LENGTHS = [15, 30, 45, 60, 90, 120]

/** A start this far in the past still counts as "now" (the form sat open). */
const PAST_START_GRACE_MS = 5 * 60_000

/** The current time as a datetime-local value, to the minute. */
const nowInput = () => toLocalInput(new Date().toISOString())

type StartedCall = {
  session: SessionSummary
  /** The call was created but the invites failed; they can be retried below. */
  inviteError: string | null
}

/**
 * A new call the tutor hosts. Invited students join from their dashboard;
 * anyone else with the student link joins as a participant.
 */
function StartCallCard({ userId }: { userId: string }) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [startsAt, setStartsAt] = useState(nowInput)
  const [length, setLength] = useState(60)
  const [timeError, setTimeError] = useState<string | null>(null)
  const [invitees, setInvitees] = useState<InvitableStudent[]>([])
  const [started, setStarted] = useState<StartedCall | null>(null)

  const start = useMutation({
    mutationFn: async ({
      callTitle,
      scheduledAt,
    }: {
      callTitle: string
      scheduledAt: string
    }): Promise<StartedCall> => {
      const session = await createSession({
        room_code: newRoomCode(),
        title: callTitle,
        page_title: callTitle,
        class_type: 'regular',
        tutor_id: userId,
        material_id: null,
        scheduled_at: scheduledAt,
        duration_minutes: length,
        status: 'scheduled',
      })
      try {
        const students = await inviteStudents(session.id, invitees, 0)
        return { session: { ...session, students }, inviteError: null }
      } catch (error) {
        return {
          session: { ...session, students: [] },
          inviteError:
            error instanceof Error ? error.message : 'Couldn’t send invites.',
        }
      }
    },
    onSuccess: (result) => {
      setStarted(result)
      setTitle('')
      setStartsAt(nowInput())
      setInvitees([])
      void queryClient.invalidateQueries({
        queryKey: classroomKeys.tutorSessions(userId),
      })
    },
  })

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    const scheduledAt = fromLocalInput(startsAt)
    if (!scheduledAt) {
      setTimeError('Pick when the call starts.')
      return
    }
    // A start in the past would leave little or no time to join before the
    // link expires.
    if (Date.parse(scheduledAt) < Date.now() - PAST_START_GRACE_MS) {
      setTimeError('That time has passed. Pick a start time from now on.')
      return
    }
    setTimeError(null)
    start.mutate({ callTitle: title.trim() || 'Live class', scheduledAt })
  }

  return (
    <Card>
      <h3 className="mb-1 flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
        <Video size={18} className="text-purple-600" aria-hidden="true" />
        Start a call
      </h3>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        You host the call and can end it for everyone. You can invite the
        students assigned to you; they see the call under My Classroom on their
        dashboard and join from there.
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Call title" htmlFor="new-call-title">
          <input
            id="new-call-title"
            className={inputClass}
            value={title}
            maxLength={200}
            placeholder="Live class"
            onChange={(event) => setTitle(event.target.value)}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <Field label="Starts" htmlFor="new-call-starts" required>
            <input
              id="new-call-starts"
              type="datetime-local"
              className={inputClass}
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
            />
          </Field>
          <Field label="Length" htmlFor="new-call-length">
            <select
              id="new-call-length"
              className={inputClass}
              value={length}
              onChange={(event) => setLength(Number(event.target.value))}
            >
              {LENGTHS.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes} minutes
                </option>
              ))}
            </select>
          </Field>
        </div>
        <p className="-mt-1 text-xs text-slate-500 dark:text-slate-400">
          Students can join from {EARLY_JOIN_MINUTES} minutes before the start.
          If nobody joins by the end, the link expires. Once the class is going
          it isn’t cut off at the end; you end it when you’re done.
        </p>
        {timeError && <ErrorNote>{timeError}</ErrorNote>}
        <fieldset>
          <legend className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">
            Invite your students{' '}
            <span className="font-medium text-slate-400">(optional)</span>
          </legend>
          <StudentPicker
            tutorId={userId}
            exclude={NOBODY}
            selected={invitees}
            onChange={setInvitees}
          />
        </fieldset>
        <div className="flex justify-end">
          <Button type="submit" variant="primary" busy={start.isPending}>
            {invitees.length
              ? `Create call and invite ${invitees.length}`
              : 'Create call'}
          </Button>
        </div>
      </form>
      {start.isError && (
        <div className="mt-3">
          <ErrorNote>{start.error.message}</ErrorNote>
        </div>
      )}
      {started && (
        <div className="mt-4 space-y-3">
          {started.inviteError && (
            <ErrorNote>
              The call was created, but the invites didn’t send:{' '}
              {started.inviteError} Try again from Upcoming below.
            </ErrorNote>
          )}
          <ul>
            <SessionListItem session={started.session} tutorName="You" />
          </ul>
        </div>
      )}
    </Card>
  )
}

/** The tutor's own live classes, with their room links and invites. */
export default function TutorClassroomsView({ userId }: { userId: string }) {
  const sessions = useQuery({
    queryKey: classroomKeys.tutorSessions(userId),
    queryFn: () => listTutorSessions(userId),
  })

  // Expired links (nobody joined in time) can't be opened, so they're past.
  const now = useNow(60_000)
  const isUpcoming = (session: SessionSummary) =>
    (session.status === 'scheduled' || session.status === 'live') &&
    !isExpired(sessionSchedule(session), now)
  const upcoming = (sessions.data ?? []).filter(isUpcoming)
  const past = (sessions.data ?? []).filter((session) => !isUpcoming(session))

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <header>
        <h2 className="flex items-center gap-3 text-2xl font-black text-slate-900 dark:text-white">
          <Presentation className="text-purple-600" aria-hidden="true" />
          My Classrooms
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Open a class to teach it. Invite students so they can join from their
          dashboard, or send the student link to a parent or guest.
        </p>
      </header>

      {sessions.isPending ? (
        <Loading label="Loading your classes…" />
      ) : sessions.isError ? (
        sessions.error instanceof ClassroomSchemaMissing ? (
          <EmptyState>
            Classrooms aren’t set up yet. Ask an admin to apply the classroom
            database migration.
          </EmptyState>
        ) : (
          <ErrorNote>{sessions.error.message}</ErrorNote>
        )
      ) : (
        <>
          <StartCallCard userId={userId} />
          <Card>
            <h3 className="mb-4 text-lg font-black text-slate-900 dark:text-white">
              Upcoming
            </h3>
            {upcoming.length ? (
              <ul className="space-y-3">
                {upcoming.map((session) => (
                  <SessionListItem
                    key={session.id}
                    session={session}
                    tutorName="You"
                  >
                    <SessionInvites session={session} tutorId={userId} />
                  </SessionListItem>
                ))}
              </ul>
            ) : (
              <EmptyState>
                Nothing scheduled. Start a call above, or an admin can assign
                you a class in Dashboard › Classroom.
              </EmptyState>
            )}
          </Card>
          {past.length > 0 && (
            <Card>
              <h3 className="mb-4 text-lg font-black text-slate-900 dark:text-white">
                Past classes
              </h3>
              <ul className="space-y-3">
                {past.map((session) => (
                  <SessionListItem
                    key={session.id}
                    session={session}
                    tutorName="You"
                  />
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
