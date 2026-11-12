// The student's side of the classroom: the classes they were invited to and
// the badges they were given (migration 20261112120000).
import type { Json } from '../../types/database'
import type { ClassInvite, ProfileBadge } from '../../types/classroom'
import { plannedDb } from '../plannedDb'
import { asBadgeIcon, asBadgeOrnament, isMissingSchema } from './repository'
import { toSessionStatus } from './sessionStatus'

export const studentClassroomKeys = {
  invites: (userId: string) =>
    ['student-classroom', 'invites', userId] as const,
  badges: (userId: string) => ['student-classroom', 'badges', userId] as const,
}

/** The student opens a class from an invite; they always join as a participant. */
export const inviteJoinPath = (roomCode: string) =>
  `/classroom/${encodeURIComponent(roomCode)}?join=1`

/**
 * The signed-in student's invites, newest first. Empty until the migration is
 * applied, so the dashboard still renders.
 */
export async function listMyInvites(): Promise<ClassInvite[]> {
  const { data, error } = await plannedDb.rpc('classroom_my_invites')
  if (isMissingSchema(error)) return []
  if (error) throw new Error(error.message || 'Couldn’t load your classes.')
  return (data ?? []).flatMap((row) => {
    const status = toSessionStatus(row.status)
    if (!status) return []
    return [
      {
        sessionId: row.session_id,
        roomCode: row.room_code,
        title: row.title,
        status,
        schedule: {
          scheduledAt: row.scheduled_at ?? null,
          durationMinutes: row.duration_minutes ?? null,
          startedAt: row.started_at ?? null,
        },
        tutorName: row.tutor_name?.trim() || null,
        invitedAt: row.invited_at,
        attended: row.attended,
      },
    ]
  })
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const text = (value: unknown) => (typeof value === 'string' ? value : '')

/** users.badges, defensively: entries without an award id or name are dropped. */
export function parseProfileBadges(value: Json | null): ProfileBadge[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!isRecord(item)) return []
    const awardId = text(item.award_id)
    const name = text(item.name).trim()
    if (!awardId || !name) return []
    const awardedAt = Date.parse(text(item.awarded_at))
    return [
      {
        awardId,
        name,
        icon: asBadgeIcon(text(item.icon)),
        ornament: asBadgeOrnament(text(item.ornament)),
        classTitle: text(item.class_title).trim() || null,
        awardedAt: Number.isNaN(awardedAt) ? 0 : awardedAt,
      },
    ]
  })
}

/** A student's badges, newest first. Empty until the migration is applied. */
export async function loadProfileBadges(
  userId: string,
): Promise<ProfileBadge[]> {
  const { data, error } = await plannedDb
    .from('users')
    .select('badges')
    .eq('id', userId)
    .maybeSingle()
  if (isMissingSchema(error)) return []
  if (error) throw new Error(error.message || 'Couldn’t load your badges.')
  return parseProfileBadges(data?.badges ?? null).toSorted(
    (a, b) => b.awardedAt - a.awardedAt,
  )
}
