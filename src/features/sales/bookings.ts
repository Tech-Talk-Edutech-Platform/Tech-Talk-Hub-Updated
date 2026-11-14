import type { TrialBooking, TrialSlot, WhatsAppMessage } from './types'

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
