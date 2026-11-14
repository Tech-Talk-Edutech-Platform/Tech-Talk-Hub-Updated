import { useQuery } from '@tanstack/react-query'
import { CalendarHeart, RefreshCw } from 'lucide-react'

import { supabase } from '../../../supabase'
import { queryKeys } from '../../../lib/queryClient'
import {
  MentorBookingsCalendar,
  type MentorCalendarItem,
} from '../../../features/sales/MentorBookingsCalendar'

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Scheduled',
  ongoing: 'In progress',
  completed: 'Completed',
}

/** Trials assigned to this tutor (from the schedule), with meeting links. */
async function loadTrials(tutorId: string): Promise<MentorCalendarItem[]> {
  const { data, error } = await supabase
    .from('calendar_events')
    .select(
      'id, title, start_time, end_time, meet_link, notes, session_status, booking_status',
    )
    .eq('tutor_id', tutorId)
    .eq('class_type', 'trial')
    .order('start_time', { ascending: true })
  if (error) throw error

  return data.map((event) => ({
    id: event.id,
    title: event.title || 'Trial class',
    start: event.start_time,
    end: event.end_time,
    meetLink: event.meet_link,
    studentName: event.title.replace(/^Trial:\s*/i, '') || 'Trial student',
    notes: event.notes,
    statusLabel: STATUS_LABEL[event.session_status] ?? event.session_status,
    cancelled: event.booking_status === 'cancelled',
  }))
}

export default function TutorTrialBookingsView({ userId }: { userId: string }) {
  const trials = useQuery({
    queryKey: queryKeys.schedule.tutorTrials(userId),
    queryFn: () => loadTrials(userId),
    staleTime: 30_000,
  })

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
            <CalendarHeart className="text-pink-600" aria-hidden /> Trial
            bookings
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Free trial classes assigned to you. Each one is a student’s first
            look at Tech Talk Hub: introduce yourself, walk them through a mini
            project, and tell the parent what the full classes look like.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void trials.refetch()}
          disabled={trials.isFetching}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
        >
          <RefreshCw
            size={15}
            className={trials.isFetching ? 'animate-spin' : ''}
            aria-hidden
          />
          Refresh
        </button>
      </header>

      {trials.isPending ? (
        <p className="py-16 text-center text-sm font-semibold text-slate-500">
          Loading your trials…
        </p>
      ) : trials.isError ? (
        <p
          role="alert"
          className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
        >
          Couldn’t load your trials. Check your connection and refresh.
        </p>
      ) : (
        <MentorBookingsCalendar
          items={trials.data}
          emptyMessage="No trials booked with you yet. Keep your availability open in My Schedule so the team can book them."
        />
      )}
    </div>
  )
}
