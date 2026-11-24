import type { LucideIcon } from 'lucide-react'
import { Sun, Sunrise, Sunset } from 'lucide-react'

export type ShiftTone = 'peach' | 'lavender' | 'pink'

export type DayPartId = 'morning' | 'afternoon' | 'evening'

/**
 * A part of the family's day. Booking offers half-hour start times from 6 AM
 * to 9:30 PM in the family's own time zone, grouped by these.
 */
export type DayPart = {
  id: DayPartId
  label: string
  /** Family-local hours; a time belongs to the part its hour falls in. */
  startHour: number
  endHour: number
  icon: LucideIcon
  tone: ShiftTone
}

const MORNING: DayPart = {
  id: 'morning',
  label: 'Morning',
  startHour: 6,
  endHour: 12,
  icon: Sunrise,
  tone: 'peach',
}
const AFTERNOON: DayPart = {
  id: 'afternoon',
  label: 'Afternoon',
  startHour: 12,
  endHour: 17,
  icon: Sun,
  tone: 'lavender',
}
const EVENING: DayPart = {
  id: 'evening',
  label: 'Evening',
  startHour: 17,
  endHour: 22,
  icon: Sunset,
  tone: 'pink',
}

export const DAY_PARTS: readonly DayPart[] = [MORNING, AFTERNOON, EVENING]

/** "06:00", "06:30" … "21:30". */
export const BOOKABLE_TIMES: readonly string[] = DAY_PARTS.flatMap((part) =>
  Array.from({ length: (part.endHour - part.startHour) * 2 }, (_, index) => {
    const minutes = part.startHour * 60 + index * 30
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
  }),
)

/** The part a family-local "HH:MM" falls in (early times count as morning). */
export function dayPartOf(time: string): DayPart {
  const hour = Number(time.slice(0, 2))
  if (hour < AFTERNOON.startHour) return MORNING
  return hour < EVENING.startHour ? AFTERNOON : EVENING
}
