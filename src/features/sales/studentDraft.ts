import { categoryForGrade } from './gradeCategories'
import type { GradeCategoryId, Lead, TrialBooking } from './types'

/**
 * What the rep has filled in for a booking so far. It lives above the steps,
 * so going back, closing the details or undoing a booking keeps it.
 */
export type StudentDraft = {
  /** The parent (lead) the trial is for. */
  leadId: string | null
  studentName: string
  grade: string
  /** A program other than the grade's, for a student ahead of or behind it. */
  program: GradeCategoryId | null
  notes: string
}

export const EMPTY_DRAFT: StudentDraft = {
  leadId: null,
  studentName: '',
  grade: '',
  program: null,
  notes: '',
}

/**
 * A fresh draft for a parent. For a rebooking it starts from the student on
 * the trial that didn't happen.
 */
export function draftFor(
  leads: readonly Lead[],
  bookings: readonly TrialBooking[],
  leadId: string | null,
): StudentDraft {
  if (!leadId) return EMPTY_DRAFT
  const bookingId = leads.find((lead) => lead.id === leadId)?.bookingId
  const previous = bookings.find((booking) => booking.id === bookingId)
  if (!previous) return { ...EMPTY_DRAFT, leadId }
  return {
    leadId,
    studentName: previous.studentName,
    grade: previous.studentGrade,
    program:
      categoryForGrade(previous.studentGrade)?.id === previous.category
        ? null
        : previous.category,
    notes: previous.notes,
  }
}
