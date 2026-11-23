import { visibleLeads, waitingForTrial } from './leads'
import type { SalesData } from './salesDataContext'
import type { Lead, TrialBooking } from './types'

const DAY = 86_400_000
/** A parent reached out to this long ago without a booking needs another nudge. */
const FOLLOW_UP_AFTER = 2 * DAY

export const created = (lead: Lead) => new Date(lead.createdAt).getTime()
const contacted = (lead: Lead) =>
  lead.lastContactedAt ? new Date(lead.lastContactedAt).getTime() : 0
export const start = (b: TrialBooking) => new Date(b.start).getTime()

/** What a rep should do today: who to contact, which trials are coming up or need an outcome. */
export function workQueue(data: SalesData, repId: string, now: number) {
  const bookingsById = new Map(data.bookings.map((b) => [b.id, b]))
  const waiting = visibleLeads(data.leads, repId).filter((lead) =>
    waitingForTrial(lead, bookingsById),
  )
  const mine = data.bookings.filter((b) => b.salesRepId === repId)
  const endOfTomorrow = new Date(now)
  endOfTomorrow.setDate(endOfTomorrow.getDate() + 1)
  endOfTomorrow.setHours(23, 59, 59, 999)

  return {
    soon: mine
      .filter(
        (b) =>
          b.status === 'scheduled' &&
          new Date(b.end).getTime() >= now &&
          start(b) <= endOfTomorrow.getTime(),
      )
      .toSorted((a, b) => start(a) - start(b)),
    // Oldest first: the longer a parent waits, the colder they get.
    notContacted: waiting
      .filter((lead) => lead.status === 'new')
      .toSorted((a, b) => created(a) - created(b)),
    followUps: waiting
      .filter(
        (lead) =>
          lead.salesRepId === repId &&
          lead.status === 'contacted' &&
          now - contacted(lead) >= FOLLOW_UP_AFTER,
      )
      .toSorted((a, b) => contacted(a) - contacted(b)),
    // Same rule as "Needs an update" on the bookings page.
    needsOutcome: mine
      .filter(
        (b) =>
          start(b) < now &&
          (b.status === 'scheduled' || b.status === 'attended'),
      )
      .toSorted((a, b) => start(a) - start(b)),
  }
}
