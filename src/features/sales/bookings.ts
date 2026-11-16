import type { TrialBooking, TrialSlot, WhatsAppMessage } from './types'
import { JOIN_LINK_TO_FOLLOW } from './whatsapp'

/**
 * Removing (soft-deleting) a booking is for errors: booked by mistake, a
 * duplicate, the wrong parent or time. A trial the parent cancelled stays,
 * marked "Cancelled", so it still counts in the numbers.
 */

/** Why this booking can't be removed, or null when it can. */
export function removeProblem(booking: TrialBooking): string | null {
  if (booking.removal) return 'This booking was already removed.'
  if (booking.status !== 'scheduled') {
    return 'This trial already has an outcome. Change the outcome instead.'
  }
  return null
}

/** Why a removed booking can't be restored, or null when it can. */
export function restoreProblem(
  booking: TrialBooking,
  all: { bookings: readonly TrialBooking[]; slots: readonly TrialSlot[] },
  now: number,
): string | null {
  if (!booking.removal) return 'This booking isn’t removed.'
  if (new Date(booking.start).getTime() <= now) {
    return 'The trial time has passed. Book a new trial instead.'
  }
  const slot = all.slots.find((candidate) => candidate.id === booking.slotId)
  if (!slot || (slot.bookingId && slot.bookingId !== booking.id)) {
    return 'Someone else has been booked into this time since.'
  }
  const other = all.bookings.find(
    (candidate) =>
      candidate.id !== booking.id &&
      !candidate.removal &&
      candidate.leadId !== null &&
      candidate.leadId === booking.leadId &&
      candidate.status === 'scheduled',
  )
  if (other) return 'This parent has another trial booked since.'
  return null
}

/** True when the parent has already been sent this booking's details. */
export function parentAlreadyMessaged(
  booking: TrialBooking,
  messages: readonly WhatsAppMessage[],
) {
  return messages.some(
    (message) =>
      message.bookingId === booking.id &&
      message.direction === 'outbound' &&
      (message.status === 'sent' ||
        message.status === 'delivered' ||
        message.status === 'read'),
  )
}

/** A short reference to quote to the parent, e.g. "TTH-B8ABE697". */
export function bookingReference(bookingId: string) {
  // FNV-1a, so a booking always gets the same reference.
  let hash = 0x81_1c_9d_c5
  for (let index = 0; index < bookingId.length; index += 1) {
    hash ^= bookingId.charCodeAt(index)
    hash = Math.imul(hash, 0x01_00_01_93)
  }
  return `TTH-${(hash >>> 0).toString(16).toUpperCase().padStart(8, '0')}`
}

/** "2026-11-16T13:00:00.000Z" → "20261116T130000Z", as Google Calendar wants. */
const calendarStamp = (iso: string) =>
  new Date(iso).toISOString().replace(/[-:]|\.\d{3}/g, '')

/** Opens Google Calendar with the trial filled in, to save to your own calendar. */
export function googleCalendarLink(booking: TrialBooking, tutorName: string) {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Coding trial: ${booking.studentName} with ${tutorName}`,
    dates: `${calendarStamp(booking.start)}/${calendarStamp(booking.end)}`,
    details: [
      `Free coding trial with Tech Talk Hub (${bookingReference(booking.id)}).`,
      `Student: ${booking.studentName}`,
      `Parent: ${booking.parentName}`,
      `Join: ${booking.meetLink || JOIN_LINK_TO_FOLLOW}`,
    ].join('\n'),
    location: booking.meetLink || 'Online',
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
