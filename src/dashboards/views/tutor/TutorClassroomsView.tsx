import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Presentation, Video } from 'lucide-react'
import { SessionListItem } from '../admin/classroom/SessionsTab'
import {
  ClassroomSchemaMissing,
  classroomKeys,
  createSession,
  listTutorSessions,
  newRoomCode,
  type SessionSummary,
} from '../admin/classroom/classroomAdminApi'
import {
  Button,
  Card,
  EmptyState,
  ErrorNote,
  Field,
  inputClass,
  Loading,
} from '../admin/classroom/ui'

/** A new call the tutor hosts. Anyone with the student link joins as a participant. */
function StartCallCard({ userId }: { userId: string }) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [created, setCreated] = useState<SessionSummary | null>(null)

  const start = useMutation({
    mutationFn: (callTitle: string) =>
      createSession({
        room_code: newRoomCode(),
        title: callTitle,
        page_title: callTitle,
        class_type: 'regular',
        tutor_id: userId,
        material_id: null,
        scheduled_at: new Date().toISOString(),
        duration_minutes: 60,
        status: 'scheduled',
      }),
    onSuccess: (session) => {
      setCreated({ ...session, students: [] })
      setTitle('')
      void queryClient.invalidateQueries({
        queryKey: classroomKeys.tutorSessions(userId),
      })
    },
  })

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    const callTitle = title.trim() || 'Live class'
    start.mutate(callTitle)
  }

  return (
    <Card>
      <h3 className="mb-1 flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
        <Video size={18} className="text-purple-600" aria-hidden="true" />
        Start a call
      </h3>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        You host the call and can end it for everyone. Anyone you send the
        student link to joins as a participant and can only leave.
      </p>
      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <Field label="Call title" htmlFor="new-call-title" className="flex-1">
          <input
            id="new-call-title"
            className={inputClass}
            value={title}
            maxLength={200}
            placeholder="Live class"
            onChange={(event) => setTitle(event.target.value)}
          />
        </Field>
        <Button type="submit" variant="primary" busy={start.isPending}>
          Create call
        </Button>
      </form>
      {start.isError && (
        <div className="mt-3">
          <ErrorNote>{start.error.message}</ErrorNote>
        </div>
      )}
      {created && (
        <ul className="mt-4">
          <SessionListItem session={created} tutorName="You" />
        </ul>
      )}
    </Card>
  )
}

/** The tutor's own live classes, with their room links. */
export default function TutorClassroomsView({ userId }: { userId: string }) {
  const sessions = useQuery({
    queryKey: classroomKeys.tutorSessions(userId),
    queryFn: () => listTutorSessions(userId),
  })

  const upcoming = (sessions.data ?? []).filter(
    (session) => session.status === 'scheduled' || session.status === 'live',
  )
  const past = (sessions.data ?? []).filter(
    (session) => session.status !== 'scheduled' && session.status !== 'live',
  )

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <header>
        <h2 className="flex items-center gap-3 text-2xl font-black text-slate-900 dark:text-white">
          <Presentation className="text-purple-600" aria-hidden="true" />
          My Classrooms
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Open a class to teach it. Send the student link to the student or
          parent; it opens the room as an attendee.
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
                  />
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
