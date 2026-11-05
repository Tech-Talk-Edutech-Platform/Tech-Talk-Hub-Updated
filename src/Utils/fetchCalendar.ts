import { supabase } from '../supabase'

export interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
}

interface CalendarEventRow {
  id: string
  title: string
  start_time: string
  end_time: string
}

export const fetchEvents = async (): Promise<CalendarEvent[]> => {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('id, title, start_time, end_time')

  if (error || !data) return []

  return data.map((e: CalendarEventRow) => ({
    id: e.id,
    title: e.title,
    start: e.start_time,
    end: e.end_time,
  }))
}
// Real-time updates (optional but 🔥)
// supabase
//   .channel("calendar_changes")
//   .on(
//     "postgres_changes",
//     { event: "*", schema: "public", table: "calendar_events" },
//     payload => refetchEvents()
//   )
//   .subscribe();
