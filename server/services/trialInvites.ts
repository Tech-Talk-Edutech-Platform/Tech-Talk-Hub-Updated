import { guestJoinPath } from './classroomGuest'
import { supabase } from '../supabase'
import {
  trialCalendarFile,
  trialInviteEmail,
  tutorTrialEmail,
  type TrialEmailData,
} from './emailTemplates'
import { MailerConfigError, mailerReady, sendEmail } from './mailer'

/**
 * Trial invites: the family gets the classroom's public join link by email
 * (no account needed), and the tutor gets a copy for their calendar.
 *
 * Each booking's classroom comes from the database
 * (supabase/migrations/20261117150000_trial_classrooms.sql). Emails go out
 *   - right after a booking, when the dashboard calls POST /api/trials/:id/invite;
 *   - from the every-minute sweep (sendPendingTrialInvites), which catches
 *     website bookings and retries failures up to MAX_ATTEMPTS times.
 * The outcome is saved on the booking (invite_email_*), so the sales and
 * admin screens show it.
 *
 * PUBLIC_SITE_URL is the site families open (default the live site); set it
 * to http://localhost:5173 to test locally.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_ATTEMPTS = 3

export function siteUrl(): string {
  return (
    process.env.PUBLIC_SITE_URL?.trim() || 'https://www.techtalk-hub.com'
  ).replace(/\/+$/, '')
}

function publicJoinUrl(invite: TrialInvite) {
  const expiresAt = Math.max(
    invite.end.getTime(),
    invite.start.getTime() + 60 * 60_000,
  )
  return siteUrl() + guestJoinPath(invite.roomCode, expiresAt)
}

export async function trialGuestLink(booking: BookingRow) {
  const invite = await loadTrialInvite(booking)
  if (invite.end.getTime() <= Date.now())
    throw new TrialInviteError('This trial has already finished.', 409)
  return publicJoinUrl(invite)
}

/** Tutors open the room without ?join=1 to host it (after signing in). */
const hostUrl = (roomCode: string) =>
  `${siteUrl()}/classroom/${encodeURIComponent(roomCode)}`

export class TrialInviteError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 403 | 404 | 409 | 503,
  ) {
    super(message)
  }
}

type BookingRow = {
  id: string
  status: string
  removed_at: string | null
  mentor_id: string
  /** The sales rep credited with the trial; null for an unassigned one. */
  marketer_id: string | null
  calendar_event_id: string
  category_id: string
  parent_name: string
  parent_email: string | null
  student_name: string
  student_grade: string
  notes: string | null
  uses_classroom: boolean
  invite_email_status: string
  invite_email_attempts: number
}

type TrialInvite = {
  booking: BookingRow
  roomCode: string
  start: Date
  end: Date
  tutor: { name: string; email: string | null }
  programLabel: string
}

export async function loadBooking(bookingId: string): Promise<BookingRow> {
  const { data, error } = await supabase
    .from('trial_bookings')
    .select(
      'id, status, removed_at, mentor_id, marketer_id, calendar_event_id, category_id, parent_name, parent_email, student_name, student_grade, notes, uses_classroom, invite_email_status, invite_email_attempts',
    )
    .eq('id', bookingId)
    .maybeSingle()
  if (error) {
    if (/invite_email/.test(error.message)) {
      throw new TrialInviteError(
        'Trial emails aren’t set up in the database yet: apply migration 20261117150000_trial_classrooms.sql.',
        503,
      )
    }
    throw new Error(`Couldn’t load the booking: ${error.message}`)
  }
  if (!data) throw new TrialInviteError('That booking was not found.', 404)
  const booking: BookingRow = data
  return booking
}

async function loadTrialInvite(booking: BookingRow): Promise<TrialInvite> {
  if (booking.removed_at || booking.status === 'cancelled') {
    throw new TrialInviteError('This trial was removed or cancelled.', 409)
  }
  if (!booking.uses_classroom) {
    throw new TrialInviteError(
      'This trial was booked before classroom trials and uses the tutor’s Meet link.',
      409,
    )
  }

  const [sessionRes, eventRes, categoryRes] = await Promise.all([
    supabase
      .from('classroom_sessions')
      .select('room_code')
      .eq('trial_booking_id', booking.id)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('calendar_events')
      .select('start_time, end_time, tutor_id')
      .eq('id', booking.calendar_event_id)
      .maybeSingle(),
    supabase
      .from('grade_categories')
      .select('label')
      .eq('id', booking.category_id)
      .maybeSingle(),
  ])
  const session: { room_code: string } | null = sessionRes.data
  const event: {
    start_time: string
    end_time: string
    tutor_id: string | null
  } | null = eventRes.data
  if (!session) {
    throw new TrialInviteError(
      'This trial doesn’t have a classroom yet. Refresh in a moment and try again.',
      409,
    )
  }
  if (!event) throw new TrialInviteError('This trial’s time slot is gone.', 409)

  const { data: tutorRow } = await supabase
    .from('users')
    .select('full_name, email')
    .eq('id', event.tutor_id ?? booking.mentor_id)
    .maybeSingle()
  const tutor: { full_name: string | null; email: string | null } | null =
    tutorRow
  const category: { label: string } | null = categoryRes.data

  return {
    booking,
    roomCode: session.room_code,
    start: new Date(event.start_time),
    end: new Date(event.end_time),
    tutor: {
      name: tutor?.full_name?.trim() || 'your tutor',
      email: tutor?.email?.trim() || null,
    },
    programLabel: category?.label ?? 'Coding & AI',
  }
}

/**
 * Takes the booking's next send attempt. Only one caller wins for a given
 * attempt count, so the dashboard and the sweep never both email a family.
 */
async function claimAttempt(booking: BookingRow): Promise<boolean> {
  const { data, error } = await supabase
    .from('trial_bookings')
    .update({ invite_email_attempts: booking.invite_email_attempts + 1 })
    .eq('id', booking.id)
    .eq('invite_email_attempts', booking.invite_email_attempts)
    .select('id')
  if (error) throw new Error(`Couldn’t update the booking: ${error.message}`)
  return Array.isArray(data) && data.length === 1
}

async function recordOutcome(
  bookingId: string,
  outcome: { status: 'sent' } | { status: 'failed' | 'skipped'; error: string },
) {
  const { error } = await supabase
    .from('trial_bookings')
    .update(
      outcome.status === 'sent'
        ? {
            invite_email_status: 'sent',
            invite_email_sent_at: new Date().toISOString(),
            invite_email_error: null,
          }
        : {
            invite_email_status: outcome.status,
            invite_email_error: outcome.error,
          },
    )
    .eq('id', bookingId)
  if (error) console.error('Couldn’t save the invite outcome:', error.message)
}

export type InviteResult = {
  status: 'sent' | 'failed' | 'skipped'
  to: string | null
  error: string | null
}

/**
 * Emails the family their join link. `resend` sends again even when it was
 * already sent; otherwise a sent invite is left alone.
 */
export async function sendTrialInvite(
  bookingId: string,
  { resend = false }: { resend?: boolean } = {},
): Promise<InviteResult> {
  const booking = await loadBooking(bookingId)
  if (booking.invite_email_status === 'sent' && !resend) {
    return { status: 'sent', to: booking.parent_email, error: null }
  }

  const to = booking.parent_email?.trim() ?? ''
  if (!EMAIL_PATTERN.test(to)) {
    const error =
      'No email address for this parent. Add one, or share the link on WhatsApp.'
    await recordOutcome(booking.id, { status: 'skipped', error })
    return { status: 'skipped', to: null, error }
  }

  const invite = await loadTrialInvite(booking)
  if (invite.end.getTime() <= Date.now()) {
    throw new TrialInviteError('This trial has already finished.', 409)
  }

  const ready = mailerReady()
  if (!ready.ready) throw new TrialInviteError(ready.reason, 503)

  if (!(await claimAttempt(booking))) {
    throw new TrialInviteError(
      'This invite is being sent right now. Refresh in a moment.',
      409,
    )
  }

  const data: TrialEmailData = {
    parentName: booking.parent_name,
    studentName: booking.student_name,
    studentGrade: booking.student_grade,
    programLabel: invite.programLabel,
    tutorName: invite.tutor.name,
    start: invite.start,
    end: invite.end,
    joinUrl: publicJoinUrl(invite),
    roomCode: invite.roomCode,
  }
  const calendar = (url: string, title: string) => ({
    filename: 'trial-class.ics',
    content: trialCalendarFile({
      uid: `trial-${booking.id}`,
      start: invite.start,
      end: invite.end,
      title,
      description: `Join the class: ${url}`,
      url,
    }),
  })

  try {
    await sendEmail({
      to,
      ...trialInviteEmail(data),
      calendar: calendar(
        data.joinUrl,
        `${booking.student_name}'s trial class · Tech Talk Hub`,
      ),
    })
  } catch (error) {
    if (error instanceof MailerConfigError) {
      throw new TrialInviteError(error.message, 503)
    }
    const reason =
      error instanceof Error ? error.message : 'The email didn’t send.'
    console.error(`Trial invite ${booking.id} failed:`, reason)
    await recordOutcome(booking.id, { status: 'failed', error: reason })
    return { status: 'failed', to, error: reason }
  }
  await recordOutcome(booking.id, { status: 'sent' })

  // The tutor's copy goes with the first invite only. A failure here doesn't
  // undo the family's invite.
  if (booking.invite_email_status !== 'sent' && invite.tutor.email) {
    const url = hostUrl(invite.roomCode)
    try {
      await sendEmail({
        to: invite.tutor.email,
        ...tutorTrialEmail({ ...data, tutorUrl: url, notes: booking.notes }),
        calendar: calendar(
          url,
          `Trial: ${booking.student_name} · Tech Talk Hub`,
        ),
      })
    } catch (error) {
      console.error(
        `Tutor email for trial ${booking.id} failed:`,
        error instanceof Error ? error.message : error,
      )
    }
  }

  return { status: 'sent', to, error: null }
}

/**
 * Sends invites nobody has sent yet (website bookings) and retries failed
 * ones, for upcoming trials. Runs every minute; does nothing until email is
 * configured, so bookings made before then still go out once it is.
 */
export async function sendPendingTrialInvites(): Promise<void> {
  if (!mailerReady().ready) return

  const { data, error } = await supabase
    .from('trial_bookings')
    .select('id, calendar_events!inner(start_time)')
    .is('removed_at', null)
    .eq('status', 'scheduled')
    .eq('uses_classroom', true)
    .or(
      `invite_email_status.eq.pending,and(invite_email_status.eq.failed,invite_email_attempts.lt.${MAX_ATTEMPTS})`,
    )
    .gt('calendar_events.start_time', new Date().toISOString())
    .order('created_at', { ascending: true })
    .limit(20)
  if (error) {
    // Before the migration the columns don't exist: nothing to send.
    if (!/invite_email|trial_bookings/.test(error.message)) {
      console.error('Trial invite sweep:', error.message)
    }
    return
  }

  const rows: { id: string }[] = data ?? []
  for (const row of rows) {
    try {
      // One at a time on purpose: SMTP providers throttle bursts.
      // oxlint-disable-next-line eslint/no-await-in-loop -- see above
      await sendTrialInvite(row.id)
    } catch (sweepError) {
      // Taken by the dashboard, no classroom yet, etc.: try next minute.
      if (!(sweepError instanceof TrialInviteError)) {
        console.error(
          `Trial invite ${row.id}:`,
          sweepError instanceof Error ? sweepError.message : sweepError,
        )
      }
    }
  }
}
