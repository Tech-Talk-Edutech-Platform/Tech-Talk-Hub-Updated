import { useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import {
  CalendarPlus,
  Check,
  Copy,
  MessageCircle,
  Plus,
  Undo2,
  Video,
} from 'lucide-react'
import { toast } from 'react-hot-toast'

import { bookingReference, googleCalendarLink } from './bookings'
import {
  eyebrowClass,
  gradientButton,
  stepHeadingClass,
  tutorTone,
} from './bookingStyles'
import { gradeCategory, gradeLabel } from './gradeCategories'
import { formatPhone } from './phone'
import { useSalesData } from './salesDataContext'
import { secondaryButton, whatsappButton } from './styles'
import { classroomHostPath } from './trialInvites'
import { TrialInvitePanel } from './TrialInvitePanel'
import type { TrialBooking } from './types'
import { StatusBadge, TutorAvatar } from './ui'
import { whatsappLink, whatsappMessage } from './whatsapp'

const firstName = (name: string) => name.trim().split(/\s+/)[0] || name
const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

/**
 * "You're all booked": the booking ticket with its reference, the trial's
 * classroom link (emailed to the parent), and the parent's WhatsApp
 * confirmation to send by hand until WhatsApp Business is connected.
 */
export function BookingComplete({
  booking: bookedNow,
  headingRef,
  inviteSending,
  onBookAnother,
  onUndo,
}: {
  booking: TrialBooking
  headingRef: RefObject<HTMLHeadingElement>
  /** The class link is being emailed to the parent. */
  inviteSending: boolean
  onBookAnother: () => void
  onUndo: () => void
}) {
  const data = useSalesData()
  // The latest copy, so the email status updates as it goes out.
  const booking =
    data.bookings.find((candidate) => candidate.id === bookedNow.id) ??
    bookedNow
  const classroomCode = booking.classroomCode
  const emailed = classroomCode !== null && booking.parentEmail.trim() !== ''
  const mentor = data.mentors.find((m) => m.id === booking.mentorId)
  const tutorName = mentor?.name ?? 'the tutor'
  const message = whatsappMessage('trial_confirmation', booking, mentor)
  const reference = bookingReference(booking.id)
  const booker =
    data.reps.find((rep) => rep.id === booking.salesRepId)?.name ?? 'Admin team'
  const [copied, setCopied] = useState<'reference' | 'message' | null>(null)

  const copy = async (what: 'reference' | 'message', text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(what)
      window.setTimeout(
        () => setCopied((current) => (current === what ? null : current)),
        2000,
      )
    } catch {
      toast.error('Couldn’t copy. Select the text and copy it instead.')
    }
  }

  const rows: [string, ReactNode][] = [
    ['Student', booking.studentName],
    [
      'Grade',
      `${gradeLabel(booking.studentGrade)} · ${gradeCategory(booking.category).label}`,
    ],
    ['Tutor', tutorName],
    [
      'Date',
      new Date(booking.start).toLocaleDateString([], {
        weekday: 'short',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    ],
    ['Time', `${clock(booking.start)} – ${clock(booking.end)}`],
    ['Parent', `${booking.parentName} · ${formatPhone(booking.parentPhone)}`],
    ['Booked by', booker],
    ['Status', <StatusBadge key="status" status={booking.status} />],
  ]

  return (
    <div>
      <div className="text-center">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/60 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/5">
          <Check size={30} strokeWidth={2.5} aria-hidden />
        </span>
        <p className={`mt-5 ${eyebrowClass}`}>Complete</p>
        <h3
          ref={headingRef}
          tabIndex={-1}
          className={`mt-2 ${stepHeadingClass}`}
        >
          You’re all booked! 🎉
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
          {firstName(booking.studentName)} is on {tutorName}’s trial calendar.{' '}
          {emailed
            ? `${firstName(booking.parentName)} gets the class link by email, and their WhatsApp confirmation is queued.`
            : `${firstName(booking.parentName)}’s WhatsApp confirmation is queued.`}
        </p>
      </div>

      <div className="mt-7 grid gap-5 lg:grid-cols-2">
        <section
          aria-label="Booking details"
          className="rounded-3xl border border-orange-100 bg-linear-to-br from-orange-50 via-pink-50 to-violet-50 p-5 dark:border-white/10 dark:from-orange-500/10 dark:via-pink-500/10 dark:to-violet-500/10"
        >
          <div className="flex items-center gap-3">
            <TutorAvatar
              name={tutorName}
              tone={tutorTone(booking.mentorId, data.mentors)}
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Booking ID
              </p>
              <p className="font-mono text-base font-black tracking-wide text-slate-900 dark:text-white">
                {reference}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void copy('reference', reference)}
              aria-label="Copy booking ID"
              className="rounded-xl bg-white/80 p-2.5 text-slate-600 shadow-xs transition-colors hover:bg-white hover:text-slate-900 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15 dark:hover:text-white"
            >
              {copied === 'reference' ? (
                <Check size={16} aria-hidden />
              ) : (
                <Copy size={16} aria-hidden />
              )}
            </button>
          </div>
          <dl className="mt-4 divide-y divide-slate-900/5 text-sm dark:divide-white/10">
            {rows.map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between gap-4 py-2.5"
              >
                <dt className="shrink-0 text-slate-500 dark:text-slate-400">
                  {label}
                </dt>
                <dd className="min-w-0 text-right font-bold break-words text-slate-900 dark:text-white">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          {classroomCode && (
            <div className="mt-4">
              <TrialInvitePanel
                target={{
                  roomCode: classroomCode,
                  parentEmail: booking.parentEmail,
                  invite: booking.inviteEmail,
                }}
                onSend={(resend) => data.sendInvite(booking.id, { resend })}
                sending={inviteSending}
                hostPath={classroomHostPath(classroomCode)}
              />
            </div>
          )}
          <div
            className={`mt-4 grid gap-2 ${classroomCode ? '' : 'sm:grid-cols-2'}`}
          >
            {!classroomCode &&
              (booking.meetLink ? (
                <a
                  href={booking.meetLink}
                  target="_blank"
                  rel="noreferrer"
                  className={secondaryButton}
                >
                  <Video size={16} aria-hidden /> Join meeting
                </a>
              ) : (
                <span
                  className={`${secondaryButton} cursor-default opacity-60`}
                  title="The classroom link appears once the booking finishes saving"
                >
                  <Video size={16} aria-hidden /> Link to follow
                </span>
              ))}
            <a
              href={googleCalendarLink(booking, tutorName)}
              target="_blank"
              rel="noreferrer"
              className={secondaryButton}
            >
              <CalendarPlus size={16} aria-hidden /> Add to Google Calendar
            </a>
          </div>
        </section>

        <section
          aria-label="WhatsApp confirmation"
          className="flex flex-col rounded-3xl border border-slate-200 p-5 dark:border-white/10"
        >
          <p className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white">
            <MessageCircle size={16} className="text-emerald-600" aria-hidden />
            WhatsApp confirmation
          </p>
          <div className="mt-3 flex-1 rounded-2xl rounded-tl-sm bg-[#e7ffdb] p-4 text-sm leading-6 whitespace-pre-line text-slate-900 dark:bg-emerald-950/60 dark:text-emerald-50">
            {message}
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
            Queued to send automatically once WhatsApp Business is connected.
            Until then, send it yourself:
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <a
              href={whatsappLink(booking.parentPhone, message)}
              target="_blank"
              rel="noreferrer"
              className={whatsappButton}
            >
              <MessageCircle size={16} aria-hidden /> Open in WhatsApp
            </a>
            <button
              type="button"
              onClick={() => void copy('message', message)}
              className={secondaryButton}
            >
              {copied === 'message' ? (
                <Check size={16} aria-hidden />
              ) : (
                <Copy size={16} aria-hidden />
              )}
              {copied === 'message' ? 'Copied' : 'Copy message'}
            </button>
          </div>
        </section>
      </div>

      <div className="mt-7 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={onBookAnother}
          className={gradientButton}
        >
          <Plus size={16} aria-hidden /> Make another booking
        </button>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Wrong time, tutor or parent?{' '}
          <button
            type="button"
            onClick={onUndo}
            className="inline-flex items-center gap-1 font-extrabold text-rose-600 hover:underline dark:text-rose-400"
          >
            <Undo2 size={13} aria-hidden /> Undo this booking
          </button>
        </p>
      </div>
    </div>
  )
}
