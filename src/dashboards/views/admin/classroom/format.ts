import type { ClassroomSessionStatus } from '../../../../types/classroomTables'

/* Formatting helpers shared by Dashboard › Classroom. */

export const STATUS_LABEL: Record<ClassroomSessionStatus, string> = {
  scheduled: 'Scheduled',
  live: 'Live',
  completed: 'Completed',
  not_completed: 'Not completed',
  cancelled: 'Cancelled',
}

/** "Mon 10 Nov, 4:30 PM", or "Not scheduled". */
export function formatWhen(iso: string | null) {
  if (!iso) return 'Not scheduled'
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** ISO timestamp -> the value a datetime-local input expects (local time). */
export function toLocalInput(iso: string | null) {
  if (!iso) return ''
  const date = new Date(iso)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

/** A datetime-local value (local time) -> ISO timestamp, or null. */
export function fromLocalInput(value: string) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

/** Trimmed text, or null when empty. */
export const orNull = (value: string) => value.trim() || null
