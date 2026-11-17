import { createContext, useContext } from 'react'

import type {
  BookingRemoval,
  GradeCategoryId,
  InviteResult,
  Lead,
  LeadStatus,
  NewLead,
  NewTrialBooking,
  SalesPlan,
  SalesSnapshot,
  TrialBooking,
  TrialOutcome,
} from './types'

/**
 * Everything the sales screens read and change. `SupabaseSalesDataProvider`
 * reads and writes the database; `DemoSalesDataProvider` keeps made-up data in
 * memory for /preview/sales. The screens work the same on either.
 *
 * Every change is async and rejects with a message to show the person
 * (e.g. "That session was just taken. Pick another time.").
 */
export type SalesData = SalesSnapshot & {
  isDemo: boolean
  /** Plans offered when recording a sale. */
  plans: readonly SalesPlan[]
  /**
   * Removed (soft-deleted) bookings. `bookings` leaves them out, so calendars,
   * lists and the numbers ignore them.
   */
  removedBookings: TrialBooking[]
  /** Soft-deletes a booking made in error. */
  removeBooking: (
    bookingId: string,
    removal: Omit<BookingRemoval, 'at'>,
  ) => Promise<void>
  /** Puts a removed booking back while its time is still free. */
  restoreBooking: (bookingId: string) => Promise<void>
  /** Saves a parent to reach out to. */
  addLead: (input: NewLead) => Promise<Lead>
  /** Records a call or message, or that the parent isn't interested. */
  setLeadStatus: (
    leadId: string,
    status: Exclude<LeadStatus, 'trial_booked'>,
    salesRepId: string | null,
  ) => Promise<void>
  /** Books a parent's child into a slot; the lead becomes "Trial booked". */
  bookTrial: (input: NewTrialBooking) => Promise<TrialBooking>
  /**
   * Emails the parent the classroom link. Without `resend`, an invite that
   * already went out isn't sent again.
   */
  sendInvite: (
    bookingId: string,
    options?: { resend?: boolean },
  ) => Promise<InviteResult>
  setTrialStatus: (bookingId: string, status: TrialOutcome) => Promise<void>
  /**
   * Marks the trial enrolled. `creditRepId` is who gets the sale: ignored for
   * a rep (it's theirs, or the parent's rep's); an admin may pick a rep or
   * nobody (null) when the booking has no rep yet.
   */
  recordSale: (
    bookingId: string,
    plan: string,
    amount: number,
    creditRepId: string | null,
  ) => Promise<void>
  /** A scheduled message was sent by hand from the rep's own WhatsApp. */
  markMessageSent: (messageId: string) => Promise<void>
  /** Admins: the programs a tutor takes trials for (at least one). */
  setMentorPrograms: (
    mentorId: string,
    programs: readonly GradeCategoryId[],
  ) => Promise<void>
  /** Admins: a rep's sales target for this month. */
  setMonthlyTarget: (repId: string, target: number) => Promise<void>
}

export const SalesDataContext = createContext<SalesData | null>(null)

export function useSalesData(): SalesData {
  const value = useContext(SalesDataContext)
  if (!value) {
    throw new Error('useSalesData must be used inside a sales data provider.')
  }
  return value
}

/** The message to show for a failed change. */
export const problemText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback
