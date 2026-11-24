import {
  browserTimeZone,
  clockIn,
  dateKeyIn,
  dateTimeIn,
  dayIn,
  DEFAULT_TIME_ZONE,
  sameClock,
  zoneOr,
  zonedTimeToMs,
  zonePlace,
} from '../../../lib/timeZones'
import type { Tables } from '../../../types/database'

export type QueueLead = Pick<
  Tables<'leads'>,
  'id' | 'class_date' | 'class_time' | 'time_zone' | 'student_name' | 'grade'
>

/** When the family asked for (stored as Nairobi wall-clock time), or null. */
export function requestedStartOf(lead: QueueLead): number | null {
  if (!lead.class_date || !lead.class_time) return null
  return zonedTimeToMs(
    lead.class_date,
    lead.class_time.slice(0, 5),
    DEFAULT_TIME_ZONE,
  )
}

/**
 * "Thu 26 Nov, 8:00 AM (Denver) · 6:00 PM your time" for a queued trial: the
 * family's own time first, then yours when it differs.
 */
export function requestedTimeLabel(lead: QueueLead): string | null {
  const start = requestedStartOf(lead)
  if (start === null) return null
  const family = zoneOr(lead.time_zone)
  const viewer = browserTimeZone()
  const label = `${dateTimeIn(start, family)} (${zonePlace(family)})`
  if (sameClock(start, family, viewer)) return label
  const day =
    dateKeyIn(start, viewer) === dateKeyIn(start, family)
      ? ''
      : ` ${dayIn(start, viewer)}`
  return `${label} · ${clockIn(start, viewer)}${day} your time`
}
