import type { Lead, TrialBooking } from './types'

/** "just now", "3 h ago", "2 d ago". */
export function timeAgo(iso: string, now: number) {
  const minutes = Math.max(
    0,
    Math.round((now - new Date(iso).getTime()) / 60_000),
  )
  if (minutes < 60) return minutes < 2 ? 'just now' : `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  return `${Math.round(hours / 24)} d ago`
}

/** A trial that didn't happen, so the parent needs another one. */
export const needsRebooking = (booking: TrialBooking | undefined) =>
  booking?.status === 'cancelled' || booking?.status === 'no_show'

/**
 * A rep sees their own parents plus new ones nobody has picked up yet; admins
 * (`repId` null) see everyone.
 */
export const visibleLeads = (leads: readonly Lead[], repId: string | null) =>
  leads.filter(
    (lead) =>
      repId === null ||
      lead.salesRepId === repId ||
      (lead.salesRepId === null && lead.status === 'new'),
  )

/** Still waiting for a trial: not contacted yet, contacted, or to rebook. */
export function waitingForTrial(
  lead: Lead,
  bookings: ReadonlyMap<string, TrialBooking>,
) {
  if (lead.status === 'new' || lead.status === 'contacted') return true
  return (
    lead.status === 'trial_booked' &&
    needsRebooking(bookings.get(lead.bookingId ?? ''))
  )
}
