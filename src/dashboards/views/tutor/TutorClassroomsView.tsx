import { useQuery } from '@tanstack/react-query'
import { Presentation } from 'lucide-react'
import { SessionListItem } from '../admin/classroom/SessionsTab'
import {
  ClassroomSchemaMissing,
  classroomKeys,
  listTutorSessions,
} from '../admin/classroom/classroomAdminApi'
import { Card, EmptyState, ErrorNote, Loading } from '../admin/classroom/ui'

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
      ) : sessions.data.length === 0 ? (
        <EmptyState>
          No classes are assigned to you yet. An admin assigns them in Dashboard
          › Classroom.
        </EmptyState>
      ) : (
        <>
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
              <EmptyState>Nothing scheduled.</EmptyState>
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
