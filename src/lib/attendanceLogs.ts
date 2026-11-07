import { supabase } from '../supabase'
import { plannedDb } from './plannedDb'

/** An attendance record with the names the audit views show. */
export interface AttendanceLog {
  id: string
  /** Planned column: 'present', 'absent', or null while untracked. */
  status: string | null
  created_at: string | null
  students: { full_name: string } | null
  calendar_events: {
    title: string
    start_time: string
    tutors: { full_name: string } | null
  } | null
}

/**
 * Attendance records, newest first. Neither `event_attendance` nor
 * `calendar_events` links to `users`, so student and tutor names are looked
 * up by id.
 */
export async function loadAttendanceLogs({
  signal,
  limit,
}: {
  signal?: AbortSignal
  limit?: number
} = {}): Promise<AttendanceLog[]> {
  let query = plannedDb
    .from('event_attendance')
    .select(
      'id, status, created_at, student_id, calendar_events(title, start_time, tutor_id)',
    )
    .order('created_at', { ascending: false })
  if (limit) query = query.limit(limit)
  if (signal) query = query.abortSignal(signal)

  const { data, error } = await query
  if (error) throw error

  const userIds = [
    ...new Set(
      data.flatMap((row) => [
        ...(row.student_id ? [row.student_id] : []),
        ...(row.calendar_events?.tutor_id
          ? [row.calendar_events.tutor_id]
          : []),
      ]),
    ),
  ]
  const names = new Map<string, string>()

  if (userIds.length > 0) {
    let peopleQuery = supabase
      .from('users')
      .select('id, full_name')
      .in('id', userIds)
    if (signal) peopleQuery = peopleQuery.abortSignal(signal)

    const { data: people, error: peopleError } = await peopleQuery
    if (peopleError) throw peopleError
    for (const person of people) names.set(person.id, person.full_name)
  }

  const named = (id: string | null) => {
    const fullName = id ? names.get(id) : undefined
    return fullName ? { full_name: fullName } : null
  }

  return data.map((row) => ({
    id: row.id,
    status: row.status,
    created_at: row.created_at,
    students: named(row.student_id),
    calendar_events: row.calendar_events && {
      title: row.calendar_events.title,
      start_time: row.calendar_events.start_time,
      tutors: named(row.calendar_events.tutor_id),
    },
  }))
}
