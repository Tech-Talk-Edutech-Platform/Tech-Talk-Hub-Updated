import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Award, BellRing, FolderGit2, Video } from 'lucide-react'
import type { ReactNode } from 'react'
import { BadgeMedal } from '../../../../components/classroom/ui/BadgeMedal'
import {
  END_COMPLETED_VIA,
  END_NOT_COMPLETED,
} from '../../../../data/classroom'
import { RecordingLink } from '../../../../lib/classroom/recordingLink'
import {
  asBadgeIcon,
  asBadgeOrnament,
} from '../../../../lib/classroom/repository'
import {
  classroomKeys,
  listBadges,
  listRoster,
  loadSessionActivity,
  resolveAlert,
  type SessionRow,
} from './classroomAdminApi'
import { Button, Card, CardTitle, ErrorNote, Loading, StatusPill } from './ui'

const ALERT_LABEL = {
  ac: 'Academic counsellor',
  support: 'Support team',
} as const

const END_REASONS = [...END_COMPLETED_VIA, ...END_NOT_COMPLETED]

const time = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })

function minutes(seconds: number | null) {
  if (seconds === null) return null
  const total = Math.round(seconds / 60)
  return total < 60
    ? `${total} min`
    : `${Math.floor(total / 60)} h ${total % 60} min`
}

function Section({
  icon,
  title,
  count,
  empty,
  children,
}: {
  icon: ReactNode
  title: string
  count: number
  empty: string
  children: ReactNode
}) {
  return (
    <div>
      <h4 className="mb-2 flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
        <span className="text-purple-600 dark:text-purple-300">{icon}</span>
        {title}
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 tabular-nums dark:bg-white/10 dark:text-slate-300">
          {count}
        </span>
      </h4>
      {count === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{empty}</p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-white/10">
          {children}
        </ul>
      )}
    </div>
  )
}

/** What happened in the class: the end report, badges, projects, alerts, recordings. */
export function SessionActivityPanel({ session }: { session: SessionRow }) {
  const queryClient = useQueryClient()
  const activity = useQuery({
    queryKey: classroomKeys.activity(session.id),
    queryFn: () => loadSessionActivity(session.id),
  })
  const roster = useQuery({
    queryKey: classroomKeys.roster(session.id),
    queryFn: () => listRoster(session.id),
  })
  const badges = useQuery({
    queryKey: classroomKeys.badges,
    queryFn: listBadges,
  })
  const resolve = useMutation({
    mutationFn: resolveAlert,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: classroomKeys.activity(session.id),
      }),
  })

  const studentName = (rosterId: string) =>
    roster.data?.find((row) => row.id === rosterId)?.display_name ??
    'Removed student'
  const reason = END_REASONS.find((option) => option.id === session.end_reason)
  const ended =
    session.status === 'completed' || session.status === 'not_completed'

  return (
    <Card>
      <CardTitle
        aside={
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void activity.refetch()}
            busy={activity.isFetching}
          >
            Refresh
          </Button>
        }
      >
        Class activity
      </CardTitle>

      {ended && (
        <div className="mb-6 rounded-2xl bg-slate-50 p-4 text-sm dark:bg-white/5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={session.status} />
            {session.elapsed_seconds !== null && (
              <span className="font-bold text-slate-700 tabular-nums dark:text-slate-200">
                Ran {minutes(session.elapsed_seconds)}
              </span>
            )}
            {session.ended_at && (
              <span className="text-slate-500 dark:text-slate-400">
                · ended {time(session.ended_at)}
              </span>
            )}
          </div>
          {(reason || session.end_details) && (
            <p className="mt-2 text-slate-600 dark:text-slate-300">
              {reason && (
                <strong className="font-bold text-slate-800 dark:text-slate-100">
                  {reason.label}.{' '}
                </strong>
              )}
              {session.end_details}
            </p>
          )}
        </div>
      )}

      {activity.isPending ? (
        <Loading label="Loading class activity…" />
      ) : activity.isError ? (
        <ErrorNote>{activity.error.message}</ErrorNote>
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          <Section
            icon={<Award size={16} aria-hidden="true" />}
            title="Badges given"
            count={activity.data.awards.length}
            empty="No badges given yet."
          >
            {activity.data.awards.map((award) => {
              const badge = badges.data?.find(
                (row) => row.id === award.badge_id,
              )
              return (
                <li key={award.id} className="flex items-center gap-3 py-2">
                  {badge && (
                    <BadgeMedal
                      icon={asBadgeIcon(badge.icon)}
                      ornament={asBadgeOrnament(badge.ornament)}
                      size={32}
                    />
                  )}
                  <div className="min-w-0 text-sm">
                    <p className="truncate font-bold text-slate-900 dark:text-white">
                      {badge?.name ?? 'Badge'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {studentName(award.session_student_id)} ·{' '}
                      {time(award.created_at)}
                    </p>
                  </div>
                </li>
              )
            })}
          </Section>

          <Section
            icon={<FolderGit2 size={16} aria-hidden="true" />}
            title="Projects submitted"
            count={activity.data.projects.length}
            empty="No projects submitted yet."
          >
            {activity.data.projects.map((project) => (
              <li key={project.id} className="py-2 text-sm">
                <a
                  href={project.project_url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-purple-700 hover:underline dark:text-purple-300"
                >
                  {project.activity_title}
                </a>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {studentName(project.session_student_id)} ·{' '}
                  {time(project.created_at)}
                </p>
                {project.note && (
                  <p className="mt-1 text-slate-600 dark:text-slate-300">
                    {project.note}
                  </p>
                )}
              </li>
            ))}
          </Section>

          <Section
            icon={<BellRing size={16} aria-hidden="true" />}
            title="Alerts from the teacher"
            count={activity.data.alerts.length}
            empty="No alerts sent."
          >
            {activity.data.alerts.map((alert) => (
              <li
                key={alert.id}
                className="flex items-center justify-between gap-3 py-2 text-sm"
              >
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {ALERT_LABEL[alert.alert_type]}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Sent {time(alert.created_at)}
                    {alert.resolved_at &&
                      ` · resolved ${time(alert.resolved_at)}`}
                  </p>
                </div>
                {alert.resolved_at ? (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                    Resolved
                  </span>
                ) : (
                  <Button
                    size="sm"
                    busy={resolve.isPending && resolve.variables === alert.id}
                    onClick={() => resolve.mutate(alert.id)}
                  >
                    Mark resolved
                  </Button>
                )}
              </li>
            ))}
          </Section>

          <Section
            icon={<Video size={16} aria-hidden="true" />}
            title="Recordings"
            count={activity.data.recordings.length}
            empty="No recordings from this class."
          >
            {activity.data.recordings.map((recording) => (
              <li key={recording.id} className="py-2 text-sm">
                <RecordingLink
                  recording={recording.recording_url}
                  className="font-bold text-purple-700 hover:underline dark:text-purple-300"
                >
                  {recording.title}
                </RecordingLink>
                {recording.created_at && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {time(recording.created_at)}
                  </p>
                )}
              </li>
            ))}
          </Section>
        </div>
      )}
      {resolve.isError && (
        <div className="mt-4">
          <ErrorNote>{resolve.error.message}</ErrorNote>
        </div>
      )}
    </Card>
  )
}
