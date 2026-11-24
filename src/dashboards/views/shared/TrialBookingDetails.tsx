import { useQuery } from '@tanstack/react-query'
import { CalendarHeart } from 'lucide-react'

import { useNow } from '../../../hooks/useNow'
import { otherZoneTime } from '../../../lib/timeZones'
import { supabase } from '../../../supabase'
import {
  GRADE_CATEGORIES,
  gradeLabel,
} from '../../../features/sales/gradeCategories'
import { TrialInvitePanel } from '../../../features/sales/TrialInvitePanel'
import {
  classroomCodeOf,
  requestTrialInvite,
  toInviteEmail,
} from '../../../features/sales/trialInvites'

const programLabel = (id: string) =>
  GRADE_CATEGORIES.find((category) => category.id === id)?.label ?? null

/** The live booking on a trial slot (a cancelled one can be followed by a new one). */
async function loadBooking(eventId: string) {
  const { data, error } = await supabase
    .from('trial_bookings')
    .select(
      'id, parent_name, parent_email, student_name, student_grade, category_id, notes, status, uses_classroom, invite_email_status, invite_email_sent_at, invite_email_error, family_time_zone',
    )
    .eq('calendar_event_id', eventId)
    .is('removed_at', null)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

/**
 * A trial on My Schedule / Global Schedule: who booked it (grade, program,
 * the sales team's notes) and, for an upcoming classroom trial, the family's
 * join link with its email status and a button to email it again.
 * This used to be the tutor's separate "Trial Bookings" page.
 */
export function TrialBookingDetails({
  eventId,
  meetLink,
  startTime,
  endTime,
}: {
  eventId: string
  meetLink: string | null
  /** For the family's own time; left out, it isn't shown. */
  startTime?: string
  endTime: string
}) {
  const now = useNow(60_000)
  const booking = useQuery({
    queryKey: ['schedule', 'trial-booking', eventId],
    queryFn: () => loadBooking(eventId),
    staleTime: 15_000,
  })

  if (booking.isPending) {
    return (
      <p className="rounded-xl bg-pink-50/60 p-3 text-sm font-semibold text-slate-500 dark:bg-pink-500/5">
        Loading the trial booking…
      </p>
    )
  }
  // No booking (an admin-made trial, or no access): the event details above
  // still say everything there is.
  if (booking.isError || !booking.data) return null

  const row = booking.data
  const roomCode = row.uses_classroom ? classroomCodeOf(meetLink) : null
  const upcoming =
    row.status === 'scheduled' && new Date(endTime).getTime() > now
  const facts = [
    {
      label: 'Student',
      value: [row.student_name, gradeLabel(row.student_grade)]
        .filter(Boolean)
        .join(' · '),
    },
    { label: 'Program', value: programLabel(row.category_id) },
    { label: 'Parent', value: row.parent_name },
    {
      label: 'Family’s time',
      value: startTime ? otherZoneTime(startTime, row.family_time_zone) : null,
    },
  ].filter((fact): fact is { label: string; value: string } => !!fact.value)

  return (
    <section
      aria-label="Trial booking"
      className="space-y-3 rounded-2xl bg-pink-50/70 p-4 dark:bg-pink-500/5"
    >
      <h4 className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white">
        <CalendarHeart size={16} className="text-pink-600" aria-hidden />
        Trial booking
      </h4>
      <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
        {facts.map((fact) => (
          <div key={fact.label}>
            <dt className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {fact.label}
            </dt>
            <dd className="font-bold text-slate-900 dark:text-white">
              {fact.value}
            </dd>
          </div>
        ))}
      </dl>
      {row.notes && (
        <p className="rounded-xl bg-white/80 px-3 py-2 text-sm whitespace-pre-line text-slate-700 dark:bg-white/5 dark:text-slate-200">
          <span className="font-bold">Notes from sales: </span>
          {row.notes}
        </p>
      )}
      {roomCode && upcoming && (
        <TrialInvitePanel
          target={{
            roomCode,
            bookingId: row.id,
            parentEmail: row.parent_email ?? '',
            invite: toInviteEmail(row),
          }}
          onSend={async (resend) => {
            const result = await requestTrialInvite(row.id, resend)
            await booking.refetch()
            return result
          }}
        />
      )}
    </section>
  )
}
