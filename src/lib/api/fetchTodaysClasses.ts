import { getErrorMessage } from '../getErrorMessage'
import { getSupabase } from '../supabase'

/** Returns the number of calendar events booked for a tutor today. */
export async function fetchTodaysClasses(tutorId: string): Promise<number> {
  if (!tutorId) return 0

  try {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const { data, error } = await getSupabase()
      .from('calendar_events')
      .select('*', { count: 'exact' })
      .eq('tutor_id', tutorId)
      .gte('start_time', todayStart.toISOString())
      .lte('start_time', todayEnd.toISOString())

    if (error) throw error

    return data?.length || 0
  } catch (error: unknown) {
    console.error(
      "Fetch Today's Classes Error:",
      getErrorMessage(error, String(error)),
    )
    return 0
  }
}
