import type { ClassroomSessionStatus } from '../../types/classroomTables'

const STATUSES: readonly ClassroomSessionStatus[] = [
  'scheduled',
  'live',
  'completed',
  'not_completed',
  'cancelled',
]

/**
 * Nobody can join a class in these states, hosts included, until an admin
 * reopens it. The API server (server/services/classroomAccess.ts) enforces
 * the same list; the database only lets admins move a class out of it.
 */
const ENDED_STATUSES: ReadonlySet<ClassroomSessionStatus> = new Set([
  'completed',
  'not_completed',
  'cancelled',
])

export function isEndedStatus(status: ClassroomSessionStatus | null): boolean {
  return status !== null && ENDED_STATUSES.has(status)
}

/** A status string from the database, or null if it isn't one we know. */
export function toSessionStatus(value: string): ClassroomSessionStatus | null {
  return STATUSES.find((status) => status === value) ?? null
}
