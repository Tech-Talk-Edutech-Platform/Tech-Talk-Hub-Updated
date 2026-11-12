// When a class can be joined. The API server applies the same rules before it
// issues a video token (server/services/classroomAccess.ts); keep them in step.
//
//   start - 15 min  ............  start  ............  end (start + length)
//   |  too early  |  open (anyone can join)  |  after the end:
//                                              - nobody ever joined: expired,
//                                                the link is revoked
//                                              - someone joined: overtime, the
//                                                call keeps going until people
//                                                leave; nobody is cut off
//
// A class without a start time is always open; without a length it never
// expires.

/** Everyone can join this long before the start, to check camera and mic. */
export const EARLY_JOIN_MINUTES = 15

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
  | { state: 'expired'; startsAt: number; endsAt: number }
  | { state: 'overtime'; endsAt: number }

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

export function joinWindow(schedule: ClassSchedule, now: number): JoinWindow {
  const startsAt = parse(schedule.scheduledAt)
  if (startsAt === null) return { state: 'open' }
  const opensAt = startsAt - EARLY_JOIN_MINUTES * 60_000
  if (now < opensAt) return { state: 'early', opensAt, startsAt }
  const endsAt = scheduledEnd(schedule)
  if (endsAt === null || now <= endsAt) return { state: 'open' }
  return schedule.startedAt
    ? { state: 'overtime', endsAt }
    : { state: 'expired', startsAt, endsAt }
}

/** True once nobody can join: the class time passed and nobody came. */
export const isExpired = (schedule: ClassSchedule, now: number) =>
  joinWindow(schedule, now).state === 'expired'

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
