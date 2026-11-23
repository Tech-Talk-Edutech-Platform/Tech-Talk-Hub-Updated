import { useQuery } from '@tanstack/react-query'
import { CalendarHeart, RefreshCw } from 'lucide-react'

import { supabase } from '../../../supabase'
import { queryKeys } from '../../../lib/queryClient'
import {
  MentorBookingsCalendar,
  type MentorCalendarItem,
} from '../../../features/sales/MentorBookingsCalendar'
import {
  GRADE_CATEGORIES,
  gradeLabel,
} from '../../../features/sales/gradeCategories'
import {
  classroomCodeOf,
  requestTrialInvite,
  toInviteEmail,
} from '../../../features/sales/trialInvites'
import { TRIAL_STATUS_LABEL } from '../../../features/sales/types'

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Scheduled',
  ongoing: 'In progress',
  completed: 'Completed',
}

const programLabel = (id: string) =>
  GRADE_CATEGORIES.find((category) => category.id === id)?.label ?? null

/**
 * Trials assigned to this tutor (from the schedule), with their classroom
 * links and, when the sales team booked it, the student's grade, program and
 * notes. For an upcoming classroom trial the tutor also sees the family's
 * join link and can email it to the parent again.
 */
async function loadTrials(tutorId: string): Promise<MentorCalendarItem[]> {
  const [events, bookings] = await Promise.all([
    supabase
      .from('calendar_events')
      .select(
        'id, title, start_time, end_time, meet_link, notes, session_status, booking_status',
      )
      .eq('tutor_id', tutorId)
      .eq('class_type', 'trial')
      .order('start_time', { ascending: true }),
    supabase
      .from('trial_bookings')
      .select(
        'id, calendar_event_id, parent_name, parent_email, student_name, student_grade, category_id, notes, status, created_at, uses_classroom, invite_email_status, invite_email_sent_at, invite_email_error',
      )
      .eq('mentor_id', tutorId)
      .is('removed_at', null)
      .order('created_at', { ascending: true }),
  ])
  if (events.error) throw events.error

  // The live booking for each slot (a cancelled one can be followed by a new
  // one). Without access to bookings the calendar still shows the events.
  const bookingBySlot = new Map(
    (bookings.data ?? [])
      .filter((booking) => booking.status !== 'cancelled')
      .map((booking) => [booking.calendar_event_id, booking]),
  )

  const now = Date.now()
  return events.data.map((event) => {
    const booking = bookingBySlot.get(event.id)
    const program = booking ? programLabel(booking.category_id) : null
    const roomCode = booking?.uses_classroom
      ? classroomCodeOf(event.meet_link)
      : null
    const bookingStatus = Object.entries(TRIAL_STATUS_LABEL).find(
      ([status]) => status === booking?.status,
    )?.[1]
    return {
      id: event.id,
      title: event.title || 'Trial class',
      start: event.start_time,
      end: event.end_time,
      meetLink: event.meet_link,
      invite:
        booking &&
        roomCode &&
        booking.status === 'scheduled' &&
        new Date(event.end_time).getTime() > now
          ? {
              bookingId: booking.id,
              roomCode,
              parentEmail: booking.parent_email ?? '',
              invite: toInviteEmail(booking),
            }
          : null,
      studentName:
        booking?.student_name ||
        event.title.replace(/^Trial:\s*/i, '') ||
        'Trial student',
      parentName: booking?.parent_name ?? null,
      detail: booking
        ? [program, gradeLabel(booking.student_grade)]
            .filter(Boolean)
            .join(' · ')
        : null,
      notes: booking?.notes ?? event.notes,
      statusLabel:
        bookingStatus ??
        STATUS_LABEL[event.session_status] ??
        event.session_status,
      cancelled: event.booking_status === 'cancelled',
    }
  })
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
          onSendInvite={async (bookingId, resend) => {
            const result = await requestTrialInvite(bookingId, resend)
            await trials.refetch()
            return result
          }}
        />
      )}
    </div>
  )
}
