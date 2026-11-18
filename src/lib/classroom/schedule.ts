// When a class can be joined. The API server applies the same rules before it
// issues a video token (server/services/classroomAccess.ts); keep them in step.
//
//   start - 15 min  .......  start  .......  link expiry (an hour after the
//   |  too early  |  open (anyone can join)  |  start, or the end if later)
//                                            |  after the link expiry:
//                                            - nobody ever joined: expired,
//                                              the link is revoked
//                                            - someone joined: overtime. The
//                                              call isn't cut off, and people
//                                              can join while others are still
//                                              in it. Once it's empty the link
//                                              is revoked for everyone.
//
// A class without a start time is always open.

/** Everyone can join this long before the start, to check camera and mic. */
export const EARLY_JOIN_MINUTES = 15

/**
 * The link works for this long after the start (or until the scheduled end,
 * for longer classes). After that only a call people are still in can be
 * joined.
 */
export const LINK_ACTIVE_MINUTES = 60

/**
 * A class past its link expiry that people joined stays listed (with Join)
 * this long, since the call may still be running. The server decides whether
 * anyone is still in it.
 */
const OVERTIME_LISTED_MS = 2 * 60 * 60_000

export type ClassSchedule = {
  /** ISO start time, or null for a class with no set time. */
  scheduledAt: string | null
  durationMinutes: number | null
  /** When someone first joined (set by the API server), or null. */
  startedAt: string | null
}

export const NO_SCHEDULE: ClassSchedule = {
  scheduledAt: null,
  durationMinutes: null,
  startedAt: null,
}

export type JoinWindow =
  | { state: 'open' }
  | { state: 'early'; opensAt: number; startsAt: number }
  | { state: 'expired'; startsAt: number; expiresAt: number }
  | { state: 'overtime'; expiresAt: number }

const parse = (iso: string | null) => {
  if (!iso) return null
  const time = Date.parse(iso)
  return Number.isNaN(time) ? null : time
}

/** The scheduled end (epoch ms), or null when there's no start or length. */
export function scheduledEnd(schedule: ClassSchedule): number | null {
  const start = parse(schedule.scheduledAt)
  if (start === null || !schedule.durationMinutes) return null
  return start + schedule.durationMinutes * 60_000
}

/**
 * When the link stops working unless people are in the call (epoch ms): an
 * hour after the start, or the scheduled end if that's later. Null without a
 * start time.
 */
export function linkExpiry(schedule: ClassSchedule): number | null {
  const start = parse(schedule.scheduledAt)
  if (start === null) return null
  const end = scheduledEnd(schedule) ?? start
  return Math.max(start + LINK_ACTIVE_MINUTES * 60_000, end)
}

export function joinWindow(schedule: ClassSchedule, now: number): JoinWindow {
  const startsAt = parse(schedule.scheduledAt)
  if (startsAt === null) return { state: 'open' }
  const opensAt = startsAt - EARLY_JOIN_MINUTES * 60_000
  if (now < opensAt) return { state: 'early', opensAt, startsAt }
  const expiresAt = linkExpiry(schedule) ?? startsAt
  if (now <= expiresAt) return { state: 'open' }
  return schedule.startedAt
    ? { state: 'overtime', expiresAt }
    : { state: 'expired', startsAt, expiresAt }
}

/** True once nobody can join: the link time passed and nobody came. */
export const isExpired = (schedule: ClassSchedule, now: number) =>
  joinWindow(schedule, now).state === 'expired'

/**
 * Whether the class belongs with the upcoming ones: it can be joined now or
 * later, or it ran past its link expiry recently and may still be going.
 */
export function isStillJoinable(schedule: ClassSchedule, now: number) {
  const slot = joinWindow(schedule, now)
  if (slot.state === 'expired') return false
  if (slot.state === 'overtime')
    return now - slot.expiresAt < OVERTIME_LISTED_MS
  return true
}

/** "4:00 PM" */
export const clockTime = (time: number) =>
  new Date(time).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })

/** "Mon 10 Nov, 4:00 – 5:00 PM", or the start alone without a length. */
export function formatClassTime(schedule: ClassSchedule) {
  const start = parse(schedule.scheduledAt)
  if (start === null) return 'No set time'
  const day = new Date(start).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
  const end = scheduledEnd(schedule)
  return end === null
    ? `${day}, ${clockTime(start)}`
    : `${day}, ${clockTime(start)} – ${clockTime(end)}`
}
