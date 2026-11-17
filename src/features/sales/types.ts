/**
 * The sales and trial-booking model. `SupabaseSalesDataProvider` fills it from
 * the database (supabase/migrations/20261116130000_sales_trials.sql);
 * `DemoSalesDataProvider` fills it with made-up data for /preview/sales.
 */

export type GradeCategoryId =
  'junior-coders' | 'future-developers' | 'tech-professionals'

export type GradeCategory = {
  id: GradeCategoryId
  label: string
  grades: readonly string[]
  ages: string
  focus: string
}

/** A tutor who takes trial classes. */
export type Mentor = {
  id: string
  name: string
  categories: readonly GradeCategoryId[]
  /**
   * False while an admin hasn't picked this tutor's programs; until then they
   * take every program.
   */
  programsChosen?: boolean
  /** The mentor's standing meeting room, reused for every trial they take. */
  meetLink: string
}

export type SalesRep = {
  id: string
  name: string
  /** Sales to close this month. */
  monthlyTarget: number
}

/** One hour a mentor has opened for a trial. */
export type TrialSlot = {
  id: string
  mentorId: string
  start: string
  end: string
  bookingId: string | null
}

export const BOOKING_SOURCES = [
  'sales_call',
  'whatsapp',
  'privyr',
  'website',
] as const

export type BookingSource = (typeof BOOKING_SOURCES)[number]

export const isBookingSource = (value: string): value is BookingSource =>
  BOOKING_SOURCES.some((source) => source === value)

/**
 * Where a parent is before their child's trial. Maps to `leads.status`:
 * 'New', 'Contacted', 'Trial Scheduled', 'Lost'.
 */
export type LeadStatus = 'new' | 'contacted' | 'trial_booked' | 'not_interested'

/**
 * A parent the sales team reaches out to (a row in `leads`). It starts with
 * only the parent's contact details; the child's details come from the
 * conversation and are filled in when the trial is booked.
 */
export type Lead = {
  id: string
  parentName: string
  /** With the country code, e.g. +254712345678. */
  phone: string
  email: string
  source: BookingSource
  /** The sales rep working this parent; null until someone picks it up. */
  salesRepId: string | null
  status: LeadStatus
  createdAt: string
  lastContactedAt: string | null
  notes: string
  bookingId: string | null
}

export type NewLead = {
  parentName: string
  phone: string
  email: string
  source: BookingSource
  salesRepId: string | null
  notes: string
}

export type TrialStatus =
  'scheduled' | 'attended' | 'no_show' | 'converted' | 'lost' | 'cancelled'

/** What a rep records after a trial; 'converted' comes from recording a sale. */
export type TrialOutcome = Exclude<TrialStatus, 'scheduled' | 'converted'>

export const REMOVAL_REASONS = [
  'mistake',
  'duplicate',
  'wrong_details',
  'other',
] as const

/** Why a booking was removed. Removing is for errors, not cancellations. */
export type RemovalReason = (typeof REMOVAL_REASONS)[number]

export const REMOVAL_REASON_LABEL: Record<RemovalReason, string> = {
  mistake: 'Booked by mistake',
  duplicate: 'Duplicate booking',
  wrong_details: 'Wrong parent, child or time',
  other: 'Something else',
}

/**
 * A soft delete: the booking is kept (and can be restored) but left out of
 * calendars, lists and the numbers.
 */
export type BookingRemoval = {
  at: string
  /** The rep who removed it; null for an admin. */
  byRepId: string | null
  reason: RemovalReason
  note: string
}

export type InviteEmailStatus = 'pending' | 'sent' | 'failed' | 'skipped'

/** The email with the classroom link, sent to the parent by the server. */
export type TrialInviteEmail = {
  status: InviteEmailStatus
  sentAt: string | null
  /** Why it failed or wasn't sent. */
  error: string | null
}

/** What happened when an invite was sent (server/routes/trialInvites.ts). */
export type InviteResult = {
  status: Exclude<InviteEmailStatus, 'pending'>
  to: string | null
  error: string | null
}

export type TrialBooking = {
  id: string
  slotId: string
  /** The parent this trial was booked for. */
  leadId: string | null
  mentorId: string
  /** Null for parents who booked themselves on the website. */
  salesRepId: string | null
  category: GradeCategoryId
  parentName: string
  parentPhone: string
  parentEmail: string
  studentName: string
  studentGrade: string
  start: string
  end: string
  /**
   * The link the family opens: the classroom's guest link for classroom
   * trials, or the tutor's Meet link for trials booked before those.
   */
  meetLink: string
  /** The trial's own classroom (room code), or null for a Meet trial. */
  classroomCode: string | null
  inviteEmail: TrialInviteEmail
  status: TrialStatus
  source: BookingSource
  notes: string
  createdAt: string
  /** Set when the booking was removed (soft-deleted). */
  removal: BookingRemoval | null
}

export type Sale = {
  id: string
  bookingId: string
  /** Null when nobody on the team is credited (e.g. a website family). */
  salesRepId: string | null
  studentName: string
  plan: string
  /** Kenyan shillings. */
  amount: number
  closedAt: string
}

/** A plan a family can pay for, offered when recording a sale. */
export type SalesPlan = {
  name: string
  /** Kenyan shillings. */
  amount: number
}

/** Everything the sales screens show. */
export type SalesSnapshot = {
  mentors: Mentor[]
  reps: SalesRep[]
  /** Upcoming one-hour sessions, open (`bookingId` null) or booked. */
  slots: TrialSlot[]
  leads: Lead[]
  /** Every booking, removed ones included (`removal` set). */
  bookings: TrialBooking[]
  sales: Sale[]
  messages: WhatsAppMessage[]
}

export type WhatsAppTemplate =
  'trial_confirmation' | 'trial_reminder' | 'trial_follow_up'

/** 'cancelled': a queued message that won't go out because its booking was removed. */
export type WhatsAppStatus =
  'queued' | 'sent' | 'delivered' | 'read' | 'failed' | 'cancelled'

export type WhatsAppMessage = {
  id: string
  bookingId: string | null
  contactName: string
  phone: string
  direction: 'outbound' | 'inbound'
  template: WhatsAppTemplate | null
  body: string
  at: string
  /** Outbound delivery state; inbound messages are always 'read'. */
  status: WhatsAppStatus
}

export type NewTrialBooking = {
  slotId: string
  leadId: string
  salesRepId: string | null
  category: GradeCategoryId
  parentName: string
  parentPhone: string
  parentEmail: string
  studentName: string
  studentGrade: string
  source: BookingSource
  notes: string
}

export const TRIAL_STATUS_LABEL: Record<TrialStatus, string> = {
  scheduled: 'Scheduled',
  attended: 'Attended',
  no_show: 'No-show',
  converted: 'Enrolled',
  lost: 'Not enrolled',
  cancelled: 'Cancelled',
}

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  trial_booked: 'Trial booked',
  not_interested: 'Not interested',
}

export const SOURCE_LABEL: Record<BookingSource, string> = {
  website: 'Website form',
  sales_call: 'Sales call',
  whatsapp: 'WhatsApp',
  privyr: 'Privyr',
}
