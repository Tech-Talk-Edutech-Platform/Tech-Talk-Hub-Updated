import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Award,
  CalendarClock,
  GraduationCap,
  Presentation,
  Video,
} from 'lucide-react'
import { BadgeMedal } from '../../../components/classroom/ui/BadgeMedal'
import {
  inviteJoinPath,
  listMyInvites,
  loadProfileBadges,
  studentClassroomKeys,
} from '../../../lib/classroom/invites'
import {
  clockTime,
  formatClassTime,
  joinWindow,
} from '../../../lib/classroom/schedule'
import { useNow } from '../../../hooks/useNow'
import type { ClassInvite } from '../../../types/classroom'
import { STATUS_LABEL } from '../admin/classroom/format'

/**
 * A class that runs over stays listed (with Join) this long after its end,
 * so a student who dropped out can get back in. The server still refuses
 * once everyone has left.
 */
const OVERTIME_LISTED_MS = 2 * 60 * 60_000

/** What the student can do with an invite right now. */
type InviteState = { kind: 'join' } | { kind: 'early'; opensAt: number }

function inviteState(invite: ClassInvite, now: number): InviteState | null {
  if (invite.status !== 'scheduled' && invite.status !== 'live') return null
  const slot = joinWindow(invite.schedule, now)
  if (slot.state === 'early') return { kind: 'early', opensAt: slot.opensAt }
  if (slot.state === 'open') return { kind: 'join' }
  if (slot.state === 'overtime' && now - slot.endsAt < OVERTIME_LISTED_MS) {
    return { kind: 'join' }
  }
  return null // expired, or long past its time
}

const isUpcoming = (invite: ClassInvite, now: number) =>
  inviteState(invite, now) !== null

/** Live classes first, then the soonest. */
const byUrgency = (a: ClassInvite, b: ClassInvite) => {
  if (a.status !== b.status) return a.status === 'live' ? -1 : 1
  return (
    Date.parse(a.schedule.scheduledAt ?? a.invitedAt) -
    Date.parse(b.schedule.scheduledAt ?? b.invitedAt)
  )
}

const cardClass =
  'rounded-[32px] border border-purple-200/60 bg-white/90 p-6 shadow-xl backdrop-blur-2xl md:p-8 dark:border-purple-500/25 dark:bg-white/5'

function CardHeading({
  id,
  icon,
  title,
  aside,
}: {
  id?: string
  icon: ReactNode
  title: string
  aside?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-300">
          {icon}
        </div>
        <h3 id={id} className="text-lg font-black tracking-tight">
          {title}
        </h3>
      </div>
      {aside}
    </div>
  )
}

function useInvites(userId: string) {
  return useQuery({
    queryKey: studentClassroomKeys.invites(userId),
    queryFn: listMyInvites,
    // A tutor can invite the student, or start the class, at any moment.
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  })
}

function InviteRow({
  invite,
  state,
}: {
  invite: ClassInvite
  state: InviteState
}) {
  const live = invite.status === 'live'
  return (
    <li
      className={`flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center ${
        live
          ? 'border-pink-300 bg-pink-50/70 dark:border-pink-500/40 dark:bg-pink-500/10'
          : 'border-purple-100 bg-purple-50/40 dark:border-purple-500/20 dark:bg-purple-950/20'
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="min-w-0 truncate text-base font-extrabold">
            {invite.title}
          </h4>
          {live ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-600 px-2.5 py-0.5 text-[10px] font-black tracking-wider text-white uppercase">
              <span
                aria-hidden="true"
                className="size-1.5 rounded-full bg-white motion-safe:animate-pulse"
              />
              Live now
            </span>
          ) : (
            <span className="rounded-full bg-purple-600/15 px-2.5 py-0.5 text-[10px] font-black tracking-wider text-purple-700 uppercase dark:text-purple-300">
              Invited
            </span>
          )}
        </div>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600 dark:text-gray-300">
          <span className="inline-flex items-center gap-1">
            <CalendarClock
              size={13}
              className="text-pink-500"
              aria-hidden="true"
            />
            <span className="tabular-nums">
              {formatClassTime(invite.schedule)}
            </span>
          </span>
          <span className="inline-flex items-center gap-1">
            <GraduationCap
              size={13}
              className="text-purple-500"
              aria-hidden="true"
            />
            {invite.tutorName ?? 'Your tutor'}
          </span>
        </p>
      </div>
      {state.kind === 'early' ? (
        <span className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-purple-200 px-5 py-3 text-sm font-bold text-purple-700 tabular-nums dark:border-purple-500/30 dark:text-purple-300">
          <CalendarClock size={16} aria-hidden="true" />
          Opens at {clockTime(state.opensAt)}
        </span>
      ) : (
        <a
          href={inviteJoinPath(invite.roomCode)}
          target="_blank"
          rel="noreferrer"
          className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black text-white shadow-lg transition-transform active:scale-[0.97] ${
            live
              ? 'bg-pink-600 shadow-pink-500/30 hover:bg-pink-700'
              : 'bg-purple-600 shadow-purple-500/20 hover:bg-purple-700'
          }`}
        >
          <Video size={16} aria-hidden="true" />
          Join class
        </a>
      )}
    </li>
  )
}

/**
 * The classes the student was invited to and can join now. On the home
 * dashboard (`compact`) it only appears while there's something to join.
 */
export function ClassInvitesCard({
  userId,
  compact = false,
}: {
  userId: string
  compact?: boolean
}) {
  const invites = useInvites(userId)
  // Ticks so "Opens at 3:45 PM" turns into Join on time.
  const now = useNow(15_000)
  const open = (invites.data ?? [])
    .flatMap((invite) => {
      const state = inviteState(invite, now)
      return state ? [{ invite, state }] : []
    })
    .toSorted((a, b) => byUrgency(a.invite, b.invite))

  if (compact && !open.length) return null

  return (
    <section className={cardClass} aria-labelledby="class-invites-heading">
      <CardHeading
        id="class-invites-heading"
        icon={<Presentation size={20} aria-hidden="true" />}
        title="Class invites"
      />
      {invites.isPending ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Loading your classes…
        </p>
      ) : invites.isError ? (
        <p role="alert" className="text-sm font-medium text-red-600">
          {invites.error.message}
        </p>
      ) : open.length ? (
        <ul className="space-y-3">
          {open.map(({ invite, state }) => (
            <InviteRow key={invite.sessionId} invite={invite} state={state} />
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-purple-200 bg-purple-50/30 py-8 text-center text-xs font-medium text-gray-500 dark:border-purple-500/20 dark:bg-purple-950/20 dark:text-gray-400">
          No classes to join right now. When your tutor invites you, the class
          shows up here with a Join button.
        </p>
      )}
    </section>
  )
}

function pastLabel(invite: ClassInvite, now: number) {
  if (invite.attended === true) return 'Attended'
  if (invite.attended === false) return 'Missed'
  if (invite.status === 'scheduled' || invite.status === 'live') {
    // Not ended by the tutor, but past its time: either nobody came (the
    // link expired) or it ran over and finished.
    return joinWindow(invite.schedule, now).state === 'expired'
      ? 'Expired'
      : 'Finished'
  }
  return STATUS_LABEL[invite.status]
}

function PastClassesCard({ userId }: { userId: string }) {
  const invites = useInvites(userId)
  const now = useNow(60_000)
  const past = (invites.data ?? []).filter((invite) => !isUpcoming(invite, now))
  if (!past.length) return null

  return (
    <section className={cardClass}>
      <CardHeading
        icon={<CalendarClock size={20} aria-hidden="true" />}
        title="Past classes"
      />
      <ul className="divide-y divide-purple-100 dark:divide-purple-500/15">
        {past.map((invite) => (
          <li
            key={invite.sessionId}
            className="flex flex-wrap items-center justify-between gap-2 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{invite.title}</p>
              <p className="text-xs text-gray-500 tabular-nums dark:text-gray-400">
                {formatClassTime(invite.schedule)} ·{' '}
                {invite.tutorName ?? 'Your tutor'}
              </p>
            </div>
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
              {pastLabel(invite, now)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** The badges the student was given in class (users.badges). */
export function StudentBadgesCard({ userId }: { userId: string }) {
  const badges = useQuery({
    queryKey: studentClassroomKeys.badges(userId),
    queryFn: () => loadProfileBadges(userId),
    refetchOnWindowFocus: true,
  })
  const list = badges.data ?? []

  return (
    <section className={cardClass}>
      <CardHeading
        icon={<Award size={20} aria-hidden="true" />}
        title="My badges"
        aside={
          list.length > 0 && (
            <span className="rounded-full bg-yellow-400/20 px-3 py-1 text-xs font-black text-yellow-700 tabular-nums dark:text-yellow-300">
              {list.length} earned
            </span>
          )
        }
      />
      {badges.isPending ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Loading your badges…
        </p>
      ) : badges.isError ? (
        <p role="alert" className="text-sm font-medium text-red-600">
          {badges.error.message}
        </p>
      ) : list.length ? (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {list.map((badge) => (
            <li
              key={badge.awardId}
              className="flex flex-col items-center rounded-2xl border border-purple-100 bg-purple-50/40 px-2 pt-1 pb-3 text-center dark:border-purple-500/20 dark:bg-purple-950/20"
            >
              <BadgeMedal
                icon={badge.icon}
                ornament={badge.ornament}
                size={88}
              />
              <p className="-mt-1 text-sm leading-tight font-extrabold">
                {badge.name}
              </p>
              {badge.classTitle && (
                <p className="mt-1 line-clamp-1 text-[11px] text-gray-500 dark:text-gray-400">
                  {badge.classTitle}
                </p>
              )}
              {badge.awardedAt > 0 && (
                <p className="text-[11px] font-bold text-pink-500 tabular-nums">
                  {new Date(badge.awardedAt).toLocaleDateString(undefined, {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-purple-200 bg-purple-50/30 py-8 text-center text-xs font-medium text-gray-500 dark:border-purple-500/20 dark:bg-purple-950/20 dark:text-gray-400">
          No badges yet. Your tutor gives badges during live classes, and each
          one is saved here.
        </p>
      )}
    </section>
  )
}

/** Dashboard › My Classroom (students): invites to join, past classes, badges. */
export default function StudentClassroomView({ userId }: { userId: string }) {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <header>
        <h2 className="flex items-center gap-3 text-2xl font-black text-slate-900 dark:text-white">
          <Presentation className="text-purple-600" aria-hidden="true" />
          My Classroom
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Classes your tutor invited you to. Press Join class when it’s time.
        </p>
      </header>
      <ClassInvitesCard userId={userId} />
      <StudentBadgesCard userId={userId} />
      <PastClassesCard userId={userId} />
    </div>
  )
}
