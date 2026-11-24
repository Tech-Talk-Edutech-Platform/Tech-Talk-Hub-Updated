import { useLayoutEffect, useMemo, useReducer, useRef } from 'react'
import type { ReactNode } from 'react'

import { removeProblem, restoreProblem } from './bookings'
import { buildDemoData, DEMO_PLANS, type SalesDemoData } from './demoData'
import { SalesDataContext, type SalesData } from './salesDataContext'
import { demoRoomCode, familyJoinUrl } from './trialInvites'
import { whatsappMessage } from './whatsapp'
import type {
  BookingRemoval,
  GradeCategoryId,
  Lead,
  LeadStatus,
  Sale,
  TrialBooking,
  TrialStatus,
  TutorAvailability,
  WhatsAppMessage,
} from './types'

const HOUR_MS = 3_600_000
const GAP_MS = 15 * 60_000

/** Who can take a trial at `startMs`, from the preview's own calendar. */
function demoAvailability(
  state: SalesDemoData,
  startMs: number,
): TutorAvailability[] {
  const live = new Set(
    state.bookings
      .filter((b) => !b.removal && b.status !== 'cancelled')
      .map((b) => b.id),
  )
  return state.mentors.map((mentor) => {
    const theirs = state.slots.filter((slot) => slot.mentorId === mentor.id)
    const open = theirs.find(
      (slot) =>
        !(slot.bookingId && live.has(slot.bookingId)) &&
        new Date(slot.start).getTime() === startMs,
    )
    const busy = theirs.some(
      (slot) =>
        slot.bookingId !== null &&
        live.has(slot.bookingId) &&
        new Date(slot.start).getTime() < startMs + HOUR_MS + GAP_MS &&
        new Date(slot.end).getTime() > startMs - GAP_MS,
    )
    return {
      mentorId: mentor.id,
      slotId: open?.id ?? null,
      busy,
      timeZone: mentor.timeZone,
    }
  })
}

type Action =
  | { type: 'add-lead'; lead: Lead }
  | {
      type: 'lead-status'
      leadId: string
      status: LeadStatus
      salesRepId: string | null
      at: string
    }
  | { type: 'book'; booking: TrialBooking; message: WhatsAppMessage }
  | { type: 'status'; bookingId: string; status: TrialStatus }
  | { type: 'sale'; sale: Sale }
  | { type: 'remove'; bookingId: string; removal: BookingRemoval }
  | { type: 'restore'; bookingId: string }
  | { type: 'invite-sent'; bookingId: string; at: string }
  | { type: 'message-sent'; messageId: string; at: string }
  | { type: 'programs'; mentorId: string; programs: GradeCategoryId[] }
  | { type: 'target'; repId: string; target: number }

/**
 * After a booking is removed, the parent goes back to how they were: still
 * linked to an earlier trial if they had one, otherwise "Contacted".
 */
function unlinkLead(
  lead: Lead,
  removedId: string,
  bookings: readonly TrialBooking[],
): Lead {
  if (lead.bookingId !== removedId) return lead
  const earlier = bookings
    .filter(
      (booking) =>
        booking.leadId === lead.id &&
        booking.id !== removedId &&
        !booking.removal,
    )
    .toSorted(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0]
  return earlier
    ? { ...lead, status: 'trial_booked', bookingId: earlier.id }
    : { ...lead, status: 'contacted', bookingId: null }
}

function reducer(state: SalesDemoData, action: Action): SalesDemoData {
  if (action.type === 'programs') {
    return {
      ...state,
      mentors: state.mentors.map((mentor) =>
        mentor.id === action.mentorId
          ? { ...mentor, categories: action.programs, programsChosen: true }
          : mentor,
      ),
    }
  }
  if (action.type === 'target') {
    return {
      ...state,
      reps: state.reps.map((rep) =>
        rep.id === action.repId
          ? { ...rep, monthlyTarget: action.target }
          : rep,
      ),
    }
  }
  if (action.type === 'invite-sent') {
    return {
      ...state,
      bookings: state.bookings.map((booking) =>
        booking.id === action.bookingId
          ? {
              ...booking,
              inviteEmail: { status: 'sent', sentAt: action.at, error: null },
            }
          : booking,
      ),
    }
  }
  if (action.type === 'message-sent') {
    return {
      ...state,
      messages: state.messages.map((message) =>
        message.id === action.messageId
          ? { ...message, status: 'sent', at: action.at }
          : message,
      ),
    }
  }
  if (action.type === 'remove') {
    const { bookingId, removal } = action
    return {
      ...state,
      bookings: state.bookings.map((booking) =>
        booking.id === bookingId ? { ...booking, removal } : booking,
      ),
      // The time opens up for someone else.
      slots: state.slots.map((slot) =>
        slot.bookingId === bookingId ? { ...slot, bookingId: null } : slot,
      ),
      leads: state.leads.map((lead) =>
        unlinkLead(lead, bookingId, state.bookings),
      ),
      // Messages still waiting to go out are stopped.
      messages: state.messages.map((message) =>
        message.bookingId === bookingId && message.status === 'queued'
          ? { ...message, status: 'cancelled' }
          : message,
      ),
    }
  }
  if (action.type === 'restore') {
    const booking = state.bookings.find((b) => b.id === action.bookingId)
    if (!booking) return state
    return {
      ...state,
      bookings: state.bookings.map((candidate) =>
        candidate.id === booking.id
          ? { ...candidate, removal: null }
          : candidate,
      ),
      slots: state.slots.map((slot) =>
        slot.id === booking.slotId ? { ...slot, bookingId: booking.id } : slot,
      ),
      leads: state.leads.map((lead) =>
        lead.id === booking.leadId
          ? { ...lead, status: 'trial_booked', bookingId: booking.id }
          : lead,
      ),
      messages: state.messages.map((message) =>
        message.bookingId === booking.id && message.status === 'cancelled'
          ? { ...message, status: 'queued' }
          : message,
      ),
    }
  }
  if (action.type === 'add-lead') {
    return { ...state, leads: [action.lead, ...state.leads] }
  }
  if (action.type === 'lead-status') {
    return {
      ...state,
      leads: state.leads.map((lead) =>
        lead.id === action.leadId
          ? {
              ...lead,
              status: action.status,
              // Whoever reaches out to an unassigned parent takes them on.
              salesRepId: lead.salesRepId ?? action.salesRepId,
              lastContactedAt: action.at,
            }
          : lead,
      ),
    }
  }
  if (action.type === 'book') {
    const { booking } = action
    return {
      ...state,
      leads: state.leads.map((lead) =>
        lead.id === booking.leadId
          ? {
              ...lead,
              status: 'trial_booked',
              bookingId: booking.id,
              salesRepId: lead.salesRepId ?? booking.salesRepId,
              lastContactedAt: booking.createdAt,
              timeZone: booking.familyTimeZone ?? lead.timeZone,
              requestedStart: null,
            }
          : lead,
      ),
      bookings: [...state.bookings, booking],
      // A time the tutor hadn't opened goes on their calendar as it's booked.
      slots: state.slots.some((slot) => slot.id === booking.slotId)
        ? state.slots.map((slot) =>
            slot.id === booking.slotId
              ? { ...slot, bookingId: booking.id }
              : slot,
          )
        : [
            ...state.slots,
            {
              id: booking.slotId,
              mentorId: booking.mentorId,
              start: booking.start,
              end: booking.end,
              bookingId: booking.id,
            },
          ].toSorted((a, b) => a.start.localeCompare(b.start)),
      messages: [action.message, ...state.messages],
    }
  }
  if (action.type === 'status') {
    return {
      ...state,
      bookings: state.bookings.map((booking) =>
        booking.id === action.bookingId
          ? { ...booking, status: action.status }
          : booking,
      ),
      // A cancelled trial frees its slot for someone else.
      slots:
        action.status === 'cancelled'
          ? state.slots.map((slot) =>
              slot.bookingId === action.bookingId
                ? { ...slot, bookingId: null }
                : slot,
            )
          : state.slots,
    }
  }
  return {
    ...state,
    sales: [action.sale, ...state.sales],
    bookings: state.bookings.map((booking) =>
      booking.id === action.sale.bookingId
        ? {
            ...booking,
            status: 'converted',
            salesRepId: booking.salesRepId ?? action.sale.salesRepId,
          }
        : booking,
    ),
  }
}

let localId = 0
const newId = (prefix: string) => {
  localId += 1
  return `${prefix}-new-${Date.now()}-${localId}`
}

/**
 * Demo data in memory: changes last until the page reloads. Changes are async
 * like the real provider's, and reject with the same kind of message.
 */
export function DemoSalesDataProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    buildDemoData(),
  )
  // Checks read the newest data, so an "Undo" in a toast created a few renders
  // ago still sees the booking as it is now.
  const latest = useRef(state)
  useLayoutEffect(() => {
    latest.current = state
  }, [state])

  const value = useMemo<SalesData>(() => {
    const addLead: SalesData['addLead'] = async (input) => {
      const digits = input.phone.replace(/\D/g, '')
      const duplicate = latest.current.leads.find(
        (lead) => lead.phone.replace(/\D/g, '') === digits,
      )
      if (duplicate) {
        throw new Error(
          `${duplicate.parentName} already has this number. Find them in the parents list instead.`,
        )
      }
      const lead: Lead = {
        ...input,
        id: newId('lead'),
        status: 'new',
        createdAt: new Date().toISOString(),
        lastContactedAt: null,
        bookingId: null,
        timeZone: null,
        requestedStart: null,
      }
      dispatch({ type: 'add-lead', lead })
      return lead
    }

    const bookTrial: SalesData['bookTrial'] = async (input) => {
      const lead = state.leads.find(
        (candidate) => candidate.id === input.leadId,
      )
      if (!lead) throw new Error('That parent was not found.')
      // A parent can rebook after a no-show or a cancellation.
      const current = state.bookings.find((b) => b.id === lead.bookingId)
      if (current?.status === 'scheduled') {
        throw new Error('This parent already has a trial booked.')
      }
      const startMs = new Date(input.start).getTime()
      if (!(startMs > Date.now())) {
        throw new Error('That time has already passed. Pick a later time.')
      }
      const mentor = state.mentors.find((m) => m.id === input.mentorId)
      if (!mentor) throw new Error('That tutor isn’t taking trials.')
      const availability = demoAvailability(state, startMs).find(
        (row) => row.mentorId === mentor.id,
      )
      if (!availability?.slotId && availability?.busy) {
        throw new Error(
          `${mentor.name.split(' ')[0]} already has a class around then. Pick another time or tutor.`,
        )
      }
      const slotId = availability?.slotId ?? newId('slot')
      const roomCode = demoRoomCode(state.bookings.length + 1)

      const booking: TrialBooking = {
        ...input,
        id: newId('booking'),
        slotId,
        mentorId: mentor.id,
        start: new Date(startMs).toISOString(),
        end: new Date(startMs + HOUR_MS).toISOString(),
        meetLink: familyJoinUrl(roomCode),
        classroomCode: roomCode,
        inviteEmail: { status: 'pending', sentAt: null, error: null },
        status: 'scheduled',
        createdAt: new Date().toISOString(),
        removal: null,
        familyTimeZone: input.timeZone,
      }
      const message: WhatsAppMessage = {
        id: newId('wa'),
        bookingId: booking.id,
        contactName: booking.parentName,
        phone: booking.parentPhone,
        direction: 'outbound',
        template: 'trial_confirmation',
        body: whatsappMessage('trial_confirmation', booking, mentor),
        at: booking.createdAt,
        // Nothing is really sent in the preview.
        status: 'queued',
      }
      dispatch({ type: 'book', booking, message })
      return booking
    }

    const removeBooking: SalesData['removeBooking'] = async (
      bookingId,
      removal,
    ) => {
      const booking = latest.current.bookings.find((b) => b.id === bookingId)
      if (!booking) throw new Error('That booking was not found.')
      const problem = removeProblem(booking)
      if (problem) throw new Error(problem)
      dispatch({
        type: 'remove',
        bookingId,
        removal: { ...removal, at: new Date().toISOString() },
      })
    }

    const restoreBooking: SalesData['restoreBooking'] = async (bookingId) => {
      const booking = latest.current.bookings.find((b) => b.id === bookingId)
      if (!booking) throw new Error('That booking was not found.')
      const problem = restoreProblem(booking, latest.current, Date.now())
      if (problem) throw new Error(problem)
      dispatch({ type: 'restore', bookingId })
    }

    return {
      ...state,
      bookings: state.bookings.filter((booking) => !booking.removal),
      removedBookings: state.bookings.filter((booking) => booking.removal),
      isDemo: true,
      plans: DEMO_PLANS,
      removeBooking,
      restoreBooking,
      addLead,
      setLeadStatus: async (leadId, status, salesRepId) =>
        dispatch({
          type: 'lead-status',
          leadId,
          status,
          salesRepId,
          at: new Date().toISOString(),
        }),
      bookTrial,
      tutorAvailability: async (start) =>
        demoAvailability(latest.current, new Date(start).getTime()),
      // Nothing is really emailed in the preview.
      sendInvite: async (bookingId) => {
        const booking = latest.current.bookings.find((b) => b.id === bookingId)
        if (!booking || booking.removal) {
          throw new Error('That booking was not found.')
        }
        if (!booking.parentEmail.trim()) {
          return {
            status: 'skipped',
            to: null,
            error: 'No email address for this parent.',
          }
        }
        await new Promise((resolve) => window.setTimeout(resolve, 700))
        dispatch({
          type: 'invite-sent',
          bookingId,
          at: new Date().toISOString(),
        })
        return { status: 'sent', to: booking.parentEmail, error: null }
      },
      setTrialStatus: async (bookingId, status) =>
        dispatch({ type: 'status', bookingId, status }),
      recordSale: async (bookingId, plan, amount, creditRepId) => {
        const booking = latest.current.bookings.find((b) => b.id === bookingId)
        if (!booking || booking.removal) {
          throw new Error('That booking was not found.')
        }
        dispatch({
          type: 'sale',
          sale: {
            id: newId('sale'),
            bookingId,
            salesRepId: booking.salesRepId ?? creditRepId,
            studentName: booking.studentName,
            plan,
            amount,
            closedAt: new Date().toISOString(),
          },
        })
      },
      markMessageSent: async (messageId) =>
        dispatch({
          type: 'message-sent',
          messageId,
          at: new Date().toISOString(),
        }),
      setMentorPrograms: async (mentorId, programs) => {
        if (programs.length === 0) {
          throw new Error('Pick at least one program.')
        }
        dispatch({ type: 'programs', mentorId, programs: [...programs] })
      },
      setMonthlyTarget: async (repId, target) => {
        if (!Number.isInteger(target) || target < 1) {
          throw new Error('A target is a whole number of sales, 1 or more.')
        }
        dispatch({ type: 'target', repId, target })
      },
    }
  }, [state])

  return (
    <SalesDataContext.Provider value={value}>
      {children}
    </SalesDataContext.Provider>
  )
}
