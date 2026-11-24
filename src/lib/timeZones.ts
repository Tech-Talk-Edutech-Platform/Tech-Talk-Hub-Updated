/**
 * Time zones for trial booking. Families book in their own time ("8 AM in
 * Denver"), tutors read the same moment in theirs ("6 PM in Nairobi"). Times
 * are stored as instants; a zone is an IANA name such as "America/Denver".
 */

/** Where Tech Talk Hub's tutors are, and what a missing zone means. */
export const DEFAULT_TIME_ZONE = 'Africa/Nairobi'

export function isTimeZone(zone: string | null | undefined): zone is string {
  if (!zone) return false
  try {
    return Boolean(
      new Intl.DateTimeFormat('en-US', { timeZone: zone }).resolvedOptions()
        .timeZone,
    )
  } catch {
    return false
  }
}

/** This browser's zone. */
export function browserTimeZone(): string {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
    return isTimeZone(zone) ? zone : DEFAULT_TIME_ZONE
  } catch {
    return DEFAULT_TIME_ZONE
  }
}

/** The zone if it's usable, else Nairobi. */
export const zoneOr = (zone: string | null | undefined) =>
  isTimeZone(zone) ? zone : DEFAULT_TIME_ZONE

/** "America/Denver" → "Denver"; "America/Argentina/Buenos_Aires" → "Buenos Aires". */
export function zonePlace(zone: string): string {
  return (zone.split('/').pop() ?? zone).replace(/_/g, ' ')
}

const partsFormat = new Map<string, Intl.DateTimeFormat>()

/** The wall clock in `zone` at `ms`. */
export function zonedParts(ms: number, zone: string) {
  let format = partsFormat.get(zone)
  if (!format) {
    format = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    partsFormat.set(zone, format)
  }
  const parts = format.formatToParts(ms)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0)
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour') % 24,
    minute: get('minute'),
    second: get('second'),
  }
}

/** Minutes `zone` is ahead of UTC at `ms`. */
function offsetMinutes(ms: number, zone: string): number {
  const p = zonedParts(ms, zone)
  const wall = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return Math.round((wall - Math.floor(ms / 1000) * 1000) / 60_000)
}

const pad = (value: number) => String(value).padStart(2, '0')

/** "2026-11-25": the day `ms` falls on in `zone`. */
export function dateKeyIn(ms: number, zone: string): string {
  const p = zonedParts(ms, zone)
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`
}

/** "18:30": the time `ms` shows in `zone`. */
export function timeKeyIn(ms: number, zone: string): string {
  const p = zonedParts(ms, zone)
  return `${pad(p.hour)}:${pad(p.minute)}`
}

/**
 * The instant the clock in `zone` reads `date` ("2026-11-25") at `time`
 * ("08:00"). A time a daylight-saving change skips lands an hour off; check
 * it with timeKeyIn() when that matters.
 */
export function zonedTimeToMs(
  date: string,
  time: string,
  zone: string,
): number {
  const [year = 1970, month = 1, day = 1] = date.split('-').map(Number)
  const [hour = 0, minute = 0] = time.split(':').map(Number)
  const wall = Date.UTC(year, month - 1, day, hour, minute)
  const first = wall - offsetMinutes(wall, zone) * 60_000
  return wall - offsetMinutes(first, zone) * 60_000
}

/** "2026-11-28", `days` after the day `date` names (calendar days). */
export function addDaysToKey(date: string, days: number): string {
  const [year = 1970, month = 1, day = 1] = date.split('-').map(Number)
  const next = new Date(Date.UTC(year, month - 1, day + days))
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`
}

/** Whether two zones show the same clock at `ms` (no need to say both). */
export function sameClock(ms: number, a: string, b: string): boolean {
  return offsetMinutes(ms, a) === offsetMinutes(ms, b)
}

const toMs = (at: string | number) =>
  typeof at === 'number' ? at : new Date(at).getTime()

/** "6:00 PM" in `zone`. */
export const clockIn = (at: string | number, zone: string) =>
  new Date(toMs(at)).toLocaleTimeString([], {
    timeZone: zone,
    hour: 'numeric',
    minute: '2-digit',
  })

/** "Tue 25 Nov" in `zone`. */
export const dayIn = (at: string | number, zone: string) =>
  new Date(toMs(at)).toLocaleDateString([], {
    timeZone: zone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

/** "Tue 25 Nov, 6:00 PM" in `zone`. */
export const dateTimeIn = (at: string | number, zone: string) =>
  new Date(toMs(at)).toLocaleString([], {
    timeZone: zone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })

/** "GMT-7", "GMT+3" (or "MST" where offsets aren't supported). */
export function offsetLabel(zone: string, at: string | number = Date.now()) {
  for (const style of ['shortOffset', 'short'] as const) {
    try {
      const name = new Intl.DateTimeFormat('en-US', {
        timeZone: zone,
        timeZoneName: style,
      })
        .formatToParts(toMs(at))
        .find((part) => part.type === 'timeZoneName')?.value
      if (name) return name
    } catch {
      // Older browsers don't know 'shortOffset'.
    }
  }
  return ''
}

/** "Denver (GMT-7)" for pickers. */
export const zoneLabel = (zone: string, at: string | number = Date.now()) => {
  const offset = offsetLabel(zone, at)
  return offset ? `${zonePlace(zone)} (${offset})` : zonePlace(zone)
}

/**
 * The family's time, said for someone whose clock is in `viewerZone`, when
 * the two differ: "8:00 AM Tue 25 Nov in Denver". Null when they're the same.
 */
export function otherZoneTime(
  at: string | number,
  zone: string | null | undefined,
  viewerZone: string = browserTimeZone(),
): string | null {
  if (!isTimeZone(zone) || sameClock(toMs(at), zone, viewerZone)) return null
  const sameDay = dateKeyIn(toMs(at), zone) === dateKeyIn(toMs(at), viewerZone)
  return `${clockIn(at, zone)}${sameDay ? '' : ` ${dayIn(at, zone)}`} in ${zonePlace(zone)}`
}

/** Zones families are most often in, listed first in pickers. */
export const COMMON_TIME_ZONES: readonly string[] = [
  'Africa/Nairobi',
  'Africa/Kampala',
  'Africa/Dar_es_Salaam',
  'Africa/Kigali',
  'Africa/Addis_Ababa',
  'Africa/Lagos',
  'Africa/Accra',
  'Africa/Johannesburg',
  'Africa/Cairo',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Dubai',
  'Asia/Riyadh',
  'Asia/Kolkata',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Phoenix',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Vancouver',
  'Australia/Sydney',
]

let allZones: readonly string[] | null = null

/** Every zone this browser knows, for "Other time zones". */
export function allTimeZones(): readonly string[] {
  if (allZones) return allZones
  try {
    allZones = Intl.supportedValuesOf('timeZone')
  } catch {
    allZones = COMMON_TIME_ZONES
  }
  return allZones
}

/** Countries with one time zone, by dialling code (longest code first). */
const ZONE_BY_DIAL_CODE: readonly (readonly [string, string])[] = [
  ['254', 'Africa/Nairobi'],
  ['256', 'Africa/Kampala'],
  ['255', 'Africa/Dar_es_Salaam'],
  ['250', 'Africa/Kigali'],
  ['251', 'Africa/Addis_Ababa'],
  ['257', 'Africa/Bujumbura'],
  ['252', 'Africa/Mogadishu'],
  ['211', 'Africa/Juba'],
  ['234', 'Africa/Lagos'],
  ['233', 'Africa/Accra'],
  ['260', 'Africa/Lusaka'],
  ['263', 'Africa/Harare'],
  ['265', 'Africa/Blantyre'],
  ['267', 'Africa/Gaborone'],
  ['971', 'Asia/Dubai'],
  ['966', 'Asia/Riyadh'],
  ['974', 'Asia/Qatar'],
  ['27', 'Africa/Johannesburg'],
  ['20', 'Africa/Cairo'],
  ['44', 'Europe/London'],
  ['49', 'Europe/Berlin'],
  ['91', 'Asia/Kolkata'],
]

/**
 * A good first guess at a family's zone from their phone number, for
 * countries with a single zone. +1 (US, Canada) has several, so: null.
 */
export function zoneFromPhone(phone: string | null | undefined): string | null {
  const digits = (phone ?? '').replace(/\D/g, '')
  if (!(phone ?? '').trim().startsWith('+') && !digits.startsWith('00')) {
    return null
  }
  const international = digits.replace(/^00/, '')
  return (
    ZONE_BY_DIAL_CODE.find(([code]) => international.startsWith(code))?.[1] ??
    null
  )
}
