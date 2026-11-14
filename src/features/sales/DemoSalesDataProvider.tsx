import { useLayoutEffect, useMemo, useReducer, useRef } from 'react'
import type { ReactNode } from 'react'

import { removeProblem, restoreProblem } from './bookings'
import { buildDemoData, type SalesDemoData } from './demoData'
import { SalesDataContext, type SalesData } from './salesDataContext'
import { whatsappMessage } from './whatsapp'
import type {
  BookingRemoval,
  Lead,
  LeadStatus,
  Sale,
  TrialBooking,
  TrialStatus,
  WhatsAppMessage,
} from './types'

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
            }
          : lead,
      ),
      bookings: [...state.bookings, booking],
      slots: state.slots.map((slot) =>
        slot.id === booking.slotId ? { ...slot, bookingId: booking.id } : slot,
      ),
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

/** Demo data in memory: changes last until the page reloads. */
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
    const addLead: SalesData['addLead'] = (input) => {
      const lead: Lead = {
        ...input,
        id: newId('lead'),
        status: 'new',
        createdAt: new Date().toISOString(),
        lastContactedAt: null,
        bookingId: null,
      }
      dispatch({ type: 'add-lead', lead })
      return lead
    }

    const bookTrial: SalesData['bookTrial'] = (input) => {
      const lead = state.leads.find(
        (candidate) => candidate.id === input.leadId,
      )
      if (!lead) throw new Error('That parent was not found.')
      // A parent can rebook after a no-show or a cancellation.
      const current = state.bookings.find((b) => b.id === lead.bookingId)
      if (current?.status === 'scheduled') {
        throw new Error('This parent already has a trial booked.')
      }
      const slot = state.slots.find(
        (candidate) => candidate.id === input.slotId,
      )
      if (!slot) throw new Error('That slot no longer exists.')
      if (slot.bookingId) throw new Error('That slot was just taken.')
      if (new Date(slot.start).getTime() <= Date.now()) {
        throw new Error('That slot has already started.')
      }
      const mentor = state.mentors.find((m) => m.id === slot.mentorId)
      if (!mentor) throw new Error('The mentor for this slot was not found.')

      const booking: TrialBooking = {
        ...input,
        id: newId('booking'),
        mentorId: mentor.id,
        start: slot.start,
        end: slot.end,
        meetLink: mentor.meetLink,
        status: 'scheduled',
        createdAt: new Date().toISOString(),
        removal: null,
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

    const removeBooking: SalesData['removeBooking'] = (bookingId, removal) => {
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

    const restoreBooking: SalesData['restoreBooking'] = (bookingId) => {
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
      removeBooking,
      restoreBooking,
      addLead,
      setLeadStatus: (leadId, status, salesRepId) =>
        dispatch({
          type: 'lead-status',
          leadId,
          status,
          salesRepId,
          at: new Date().toISOString(),
        }),
      bookTrial,
      setTrialStatus: (bookingId, status) =>
        dispatch({ type: 'status', bookingId, status }),
      recordSale: (bookingId, salesRepId, plan, amount) => {
        const booking = state.bookings.find((b) => b.id === bookingId)
        if (!booking) return
        dispatch({
          type: 'sale',
          sale: {
            id: newId('sale'),
            bookingId,
            salesRepId,
            studentName: booking.studentName,
            plan,
            amount,
            closedAt: new Date().toISOString(),
          },
        })
      },
    }
  }, [state])

  return (
    <SalesDataContext.Provider value={value}>
      {children}
    </SalesDataContext.Provider>
  )
}
