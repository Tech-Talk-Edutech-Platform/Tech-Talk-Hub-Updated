import type { LucideIcon } from 'lucide-react'
import { CloudSun, Moon, Palette, Sun, Sunrise, Sunset } from 'lucide-react'

export type ShiftId =
  'early' | 'morning' | 'midday' | 'afternoon' | 'evening' | 'late'

export type ShiftTone = 'peach' | 'lavender' | 'pink'

export type Shift = {
  id: ShiftId
  label: string
  /** Local hours. A session belongs to the shift its start hour falls in. */
  startHour: number
  endHour: number
  icon: LucideIcon
  tone: ShiftTone
}

/**
 * The teaching day in two-hour shifts, as on the booking portal. A rep picks a
 * shift first, then one of the tutors' one-hour sessions inside it.
 */
export const SHIFTS: readonly Shift[] = [
  {
    id: 'early',
    label: 'Early birds',
    startHour: 8,
    endHour: 10,
    icon: Sunrise,
    tone: 'peach',
  },
  {
    id: 'morning',
    label: 'Morning',
    startHour: 10,
    endHour: 12,
    icon: Sun,
    tone: 'lavender',
  },
  {
    id: 'midday',
    label: 'Midday',
    startHour: 12,
    endHour: 14,
    icon: CloudSun,
    tone: 'pink',
  },
  {
    id: 'afternoon',
    label: 'Afternoon',
    startHour: 14,
    endHour: 16,
    icon: Palette,
    tone: 'peach',
  },
  {
    id: 'evening',
    label: 'Evening',
    startHour: 16,
    endHour: 18,
    icon: Sunset,
    tone: 'lavender',
  },
  {
    id: 'late',
    label: 'Late evening',
    startHour: 18,
    endHour: 20,
    icon: Moon,
    tone: 'pink',
  },
]

/** The shift a session starts in; undefined outside 8 AM – 8 PM. */
export function shiftOf(iso: string): Shift | undefined {
  const hour = new Date(iso).getHours()
  return SHIFTS.find((shift) => hour >= shift.startHour && hour < shift.endHour)
}

const hourLabel = (hour: number) => {
  const at = new Date()
  at.setHours(hour, 0, 0, 0)
  return at.toLocaleTimeString([], { hour: 'numeric' })
}

/** "8 AM – 10 AM" in the viewer's locale. */
export const shiftHours = (shift: Shift) =>
  `${hourLabel(shift.startHour)} – ${hourLabel(shift.endHour)}`

/** Local midnight of the day `ms` falls in. */
export function startOfDay(ms: number) {
  const day = new Date(ms)
  day.setHours(0, 0, 0, 0)
  return day.getTime()
}

/** Midnight `days` later; safe across daylight-saving changes. */
export function addDays(dayStart: number, days: number) {
  const day = new Date(dayStart)
  day.setDate(day.getDate() + days)
  return day.getTime()
}

/** When the shift ends on the given day. */
export function shiftEnd(shift: Shift, dayStart: number) {
  const end = new Date(dayStart)
  end.setHours(shift.endHour, 0, 0, 0)
  return end.getTime()
}
