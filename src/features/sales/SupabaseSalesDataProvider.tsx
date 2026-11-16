import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { AlertTriangle, Loader2, RotateCcw } from 'lucide-react'
import { REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js'

import { supabase } from '../../supabase'
import type { Tables } from '../../types/database'
import { GRADE_CATEGORIES } from './gradeCategories'
import { SalesDataContext, type SalesData } from './salesDataContext'
import { secondaryButton } from './styles'
import {
  isBookingSource,
  REMOVAL_REASONS,
  type BookingSource,
  type GradeCategoryId,
  type Lead,
  type LeadStatus,
  type Mentor,
  type Sale,
  type SalesPlan,
  type SalesRep,
  type SalesSnapshot,
  type TrialBooking,
  type TrialSlot,
  type TrialStatus,
  type WhatsAppMessage,
  type WhatsAppStatus,
  type WhatsAppTemplate,
} from './types'
import { whatsappMessage } from './whatsapp'

/**
 * The sales dashboard on real data (supabase/migrations/
 * 20261116130000_sales_trials.sql). Row-level security decides what each
 * person sees: a rep gets their own parents plus unassigned ones, and the
 * whole team's bookings and sales; admins get everything. Every change goes
 * through a database function that re-checks who may do it, so the rules hold
 * however the request is made.
 */

/** Monthly sales target for a rep an admin hasn't set one for. */
export const DEFAULT_MONTHLY_TARGET = 10

const SLOT_DAYS_AHEAD = 60
const ROW_LIMIT = 2000
const MESSAGE_LIMIT = 500

type EventTimes = Pick<
  Tables<'calendar_events'>,
  'start_time' | 'end_time' | 'meet_link'
>
type BookingRow = Tables<'trial_bookings'> & {
  calendar_events: EventTimes | null
}

const GRADE_CATEGORY_IDS: readonly GradeCategoryId[] = GRADE_CATEGORIES.map(
  (category) => category.id,
)
const TRIAL_STATUSES: readonly TrialStatus[] = [
  'scheduled',
  'attended',
  'no_show',
  'converted',
  'lost',
  'cancelled',
]
const TEMPLATES: readonly WhatsAppTemplate[] = [
  'trial_confirmation',
  'trial_reminder',
  'trial_follow_up',
]
const MESSAGE_STATUSES: readonly WhatsAppStatus[] = [
  'queued',
  'sent',
  'delivered',
  'read',
  'failed',
  'cancelled',
]

/** The value if it's one of `options`, else `fallback`. */
function oneOf<T extends string>(
  value: string | null | undefined,
  options: readonly T[],
  fallback: T,
): T {
  return options.find((option) => option === value) ?? fallback
}

const toSource = (value: string | null | undefined): BookingSource =>
  value && isBookingSource(value) ? value : 'website'

/** Database errors are plain objects; the screens show `Error.message`. */
function failure(error: { message?: string } | null, fallback: string) {
  const message = error?.message?.trim()
  if (!message) return new Error(fallback)
  if (/permission denied|row-level security/i.test(message)) {
    return new Error('You don’t have access to do that.')
  }
  if (/failed to fetch|network/i.test(message)) {
    return new Error('No connection. Check your internet and try again.')
  }
  return new Error(message)
}

function monthStart(now = new Date()) {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${now.getFullYear()}-${month}-01`
}

/** Builds the screens' model from database rows. */
function buildSnapshot(rows: {
  tutors: Pick<
    Tables<'users'>,
    'id' | 'full_name' | 'personal_meet_link' | 'is_active'
  >[]
  programs: Tables<'mentor_grade_categories'>[]
  marketers: Pick<Tables<'users'>, 'id' | 'full_name'>[]
  targets: Pick<Tables<'sales_targets'>, 'marketer_id' | 'target_sales'>[]
  /** Upcoming open slots ("Free Slot" events). */
  freeSlots: Pick<
    Tables<'calendar_events'>,
    'id' | 'tutor_id' | 'start_time' | 'end_time'
  >[]
  leads: Tables<'leads'>[]
  bookings: BookingRow[]
  sales: Tables<'sales'>[]
  messages: Tables<'whatsapp_messages'>[]
}): SalesSnapshot {
  const programsByMentor = new Map<string, GradeCategoryId[]>()
  for (const row of rows.programs) {
    const id = oneOf(row.category_id, GRADE_CATEGORY_IDS, 'junior-coders')
    programsByMentor.set(row.mentor_id, [
      ...(programsByMentor.get(row.mentor_id) ?? []),
      id,
    ])
  }

  // Inactive tutors only matter for naming their past trials.
  const bookedMentors = new Set(rows.bookings.map((b) => b.mentor_id))
  const mentors: Mentor[] = rows.tutors
    .filter((tutor) => tutor.is_active || bookedMentors.has(tutor.id))
    .map((tutor) => {
      const chosen = programsByMentor.get(tutor.id)
      return {
        id: tutor.id,
        name: tutor.full_name?.trim() || 'Tutor',
        // A tutor whose programs nobody has picked takes every program.
        categories: chosen ?? GRADE_CATEGORY_IDS,
        programsChosen: Boolean(chosen),
        meetLink: tutor.personal_meet_link?.trim() ?? '',
      }
    })
    .toSorted((a, b) => a.name.localeCompare(b.name))
  const mentorById = new Map(mentors.map((mentor) => [mentor.id, mentor]))
  const activeMentors = new Set(
    rows.tutors.filter((tutor) => tutor.is_active).map((tutor) => tutor.id),
  )

  const targets = new Map(
    rows.targets.map((target) => [target.marketer_id, target.target_sales]),
  )
  const reps: SalesRep[] = rows.marketers
    .map((marketer) => ({
      id: marketer.id,
      name: marketer.full_name?.trim() || 'Sales rep',
      monthlyTarget: targets.get(marketer.id) ?? DEFAULT_MONTHLY_TARGET,
    }))
    .toSorted((a, b) => a.name.localeCompare(b.name))
  const repIds = new Set(reps.map((rep) => rep.id))

  const allBookings: TrialBooking[] = rows.bookings.map((row) => {
    const event = row.calendar_events
    const mentor = mentorById.get(row.mentor_id)
    return {
      id: row.id,
      slotId: row.calendar_event_id,
      leadId: row.lead_id,
      mentorId: row.mentor_id,
      salesRepId: row.marketer_id,
      category: oneOf(row.category_id, GRADE_CATEGORY_IDS, 'junior-coders'),
      parentName: row.parent_name,
      parentPhone: row.parent_phone,
      parentEmail: row.parent_email ?? '',
      studentName: row.student_name,
      studentGrade: row.student_grade,
      start: event?.start_time ?? row.created_at,
      end: event?.end_time ?? row.created_at,
      meetLink: event?.meet_link?.trim() || mentor?.meetLink || '',
      status: oneOf(row.status, TRIAL_STATUSES, 'scheduled'),
      source: toSource(row.source),
      notes: row.notes ?? '',
      createdAt: row.created_at,
      removal: row.removed_at
        ? {
            at: row.removed_at,
            // Shown as "by an admin" unless a rep removed it.
            byRepId:
              row.removed_by && repIds.has(row.removed_by)
                ? row.removed_by
                : null,
            reason: oneOf(row.removal_reason, REMOVAL_REASONS, 'other'),
            note: row.removal_note ?? '',
          }
        : null,
    }
  })

  // Upcoming sessions: the open ones, and the ones a live trial holds.
  const now = Date.now()
  const bookedSlots: TrialSlot[] = allBookings
    .filter(
      (booking) =>
        !booking.removal &&
        booking.status !== 'cancelled' &&
        new Date(booking.start).getTime() > now,
    )
    .map((booking) => ({
      id: booking.slotId,
      mentorId: booking.mentorId,
      start: booking.start,
      end: booking.end,
      bookingId: booking.id,
    }))
  const taken = new Set(bookedSlots.map((slot) => slot.id))
  const openSlots: TrialSlot[] = rows.freeSlots.flatMap((event) =>
    event.tutor_id && activeMentors.has(event.tutor_id) && !taken.has(event.id)
      ? [
          {
            id: event.id,
            mentorId: event.tutor_id,
            start: event.start_time,
            end: event.end_time,
            bookingId: null,
          },
        ]
      : [],
  )
  const slots = [...openSlots, ...bookedSlots].toSorted((a, b) =>
    a.start.localeCompare(b.start),
  )

  // A parent's current booking: the newest one not removed.
  const latestByLead = new Map<string, TrialBooking>()
  for (const booking of allBookings) {
    if (!booking.leadId || booking.removal) continue
    const current = latestByLead.get(booking.leadId)
    if (!current || booking.createdAt > current.createdAt) {
      latestByLead.set(booking.leadId, booking)
    }
  }

  const leads: Lead[] = rows.leads.map((row) => {
    const latest = latestByLead.get(row.id)
    const saved = row.status?.trim().toLowerCase() ?? ''
    // The database keeps the parent's journey in words ("Trial Scheduled",
    // "Lost"…); the screens need where they are now.
    let status: LeadStatus
    if (latest?.status === 'scheduled') status = 'trial_booked'
    else if (saved === 'lost' && latest?.status !== 'lost') {
      status = 'not_interested'
    } else if (latest) status = 'trial_booked'
    else if (saved === '' || saved === 'new') status = 'new'
    else status = 'contacted'
    return {
      id: row.id,
      parentName: row.parent_name?.trim() || 'Parent',
      phone: row.phone?.trim() ?? '',
      email: row.email?.trim() ?? '',
      source: toSource(row.lead_source),
      salesRepId: row.marketer_id,
      status,
      createdAt: row.created_at ?? new Date(0).toISOString(),
      lastContactedAt: row.last_contacted_at,
      notes: row.notes?.trim() ?? '',
      bookingId: latest?.id ?? null,
    }
  })
  const leadById = new Map(leads.map((lead) => [lead.id, lead]))

  const sales: Sale[] = rows.sales.map((row) => ({
    id: row.id,
    bookingId: row.trial_booking_id ?? '',
    salesRepId: row.marketer_id,
    studentName: row.student_name,
    plan: row.plan,
    amount: row.amount_kes,
    closedAt: row.closed_at,
  }))

  const bookingById = new Map(allBookings.map((b) => [b.id, b]))
  const messages: WhatsAppMessage[] = rows.messages.map((row) => {
    const booking = row.trial_booking_id
      ? bookingById.get(row.trial_booking_id)
      : undefined
    const template = TEMPLATES.find((option) => option === row.template) ?? null
    // Automatic messages are stored without text; it's written from the
    // booking, so a changed time or link shows correctly.
    const body =
      row.body.trim() ||
      (template && booking
        ? whatsappMessage(template, booking, mentorById.get(booking.mentorId))
        : '')
    return {
      id: row.id,
      bookingId: row.trial_booking_id,
      contactName:
        booking?.parentName ??
        (row.lead_id ? leadById.get(row.lead_id)?.parentName : undefined) ??
        row.phone,
      phone: row.phone,
      direction: row.direction === 'inbound' ? 'inbound' : 'outbound',
      template,
      body,
      at: row.sent_at ?? row.scheduled_for,
      status: oneOf(row.status, MESSAGE_STATUSES, 'queued'),
    }
  })

  return {
    mentors,
    reps,
    slots,
    leads,
    bookings: allBookings,
    sales,
    messages: messages.toSorted((a, b) => b.at.localeCompare(a.at)),
  }
}

/** Pricing plans × billing period, e.g. "Pro · Quarterly (3 months)". */
async function loadPlans(): Promise<SalesPlan[]> {
  const { data, error } = await supabase
    .from('pricing_plans')
    .select('name, monthly_kes, quarterly_kes, yearly_kes, display_order')
    .eq('is_active', true)
    .order('display_order')
  if (error) throw failure(error, 'Couldn’t load the plans.')
  return (data ?? []).flatMap((plan) => [
    { name: `${plan.name} · Monthly`, amount: plan.monthly_kes },
    { name: `${plan.name} · Quarterly (3 months)`, amount: plan.quarterly_kes },
    { name: `${plan.name} · Yearly`, amount: plan.yearly_kes },
  ])
}

async function loadSnapshot(): Promise<SalesSnapshot> {
  const now = new Date()
  const slotsUntil = new Date(now.getTime() + SLOT_DAYS_AHEAD * 86_400_000)
  const [
    tutors,
    programs,
    marketers,
    targets,
    freeSlots,
    leads,
    bookings,
    sales,
    messages,
  ] = await Promise.all([
    supabase
      .from('users')
      .select('id, full_name, personal_meet_link, is_active')
      .eq('role', 'tutor'),
    supabase.from('mentor_grade_categories').select('mentor_id, category_id'),
    supabase
      .from('users')
      .select('id, full_name')
      .eq('role', 'marketer')
      .eq('is_active', true),
    supabase
      .from('sales_targets')
      .select('marketer_id, target_sales')
      .eq('month', monthStart(now)),
    // The hours tutors opened (src/features/schedule/Calendar.tsx).
    supabase
      .from('calendar_events')
      .select('id, tutor_id, start_time, end_time')
      .eq('title', 'Free Slot')
      .is('class_id', null)
      .neq('booking_status', 'cancelled')
      .not('tutor_id', 'is', null)
      .gt('start_time', now.toISOString())
      .lt('start_time', slotsUntil.toISOString())
      .order('start_time')
      .limit(ROW_LIMIT),
    supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(ROW_LIMIT),
    supabase
      .from('trial_bookings')
      .select('*, calendar_events(start_time, end_time, meet_link)')
      .order('created_at', { ascending: false })
      .limit(ROW_LIMIT),
    supabase
      .from('sales')
      .select('*')
      .order('closed_at', { ascending: false })
      .limit(ROW_LIMIT),
    supabase
      .from('whatsapp_messages')
      .select('*')
      .order('scheduled_for', { ascending: false })
      .limit(MESSAGE_LIMIT),
  ])

  const results = [
    tutors,
    programs,
    marketers,
    targets,
    freeSlots,
    leads,
    bookings,
    sales,
    messages,
  ]
  const failed = results.find((result) => result.error)
  if (failed?.error) {
    throw failure(failed.error, 'Couldn’t load the sales dashboard.')
  }

  return buildSnapshot({
    tutors: tutors.data ?? [],
    programs: programs.data ?? [],
    marketers: marketers.data ?? [],
    targets: targets.data ?? [],
    freeSlots: freeSlots.data ?? [],
    leads: leads.data ?? [],
    bookings: bookings.data ?? [],
    sales: sales.data ?? [],
    messages: messages.data ?? [],
  })
}

type LoadOutcome =
  | { stale: boolean; ok: true; snapshot: SalesSnapshot }
  | { stale: boolean; ok: false; error: unknown }

/**
 * Loads the dashboard. When loads overlap (a change, a live update, a retry),
 * `stale` marks every one but the newest, so older data never wins.
 */
function newestLoadWins() {
  let started = 0
  return async (): Promise<LoadOutcome> => {
    started += 1
    const mine = started
    try {
      const snapshot = await loadSnapshot()
      return { stale: mine !== started, ok: true, snapshot }
    } catch (error) {
      return { stale: mine !== started, ok: false, error }
    }
  }
}

/** Tables whose changes refresh the dashboard. */
const WATCHED_TABLES = [
  'leads',
  'trial_bookings',
  'sales',
  'sales_targets',
  'whatsapp_messages',
  'calendar_events',
  'mentor_grade_categories',
] as const

export function SupabaseSalesDataProvider({
  children,
}: {
  children: ReactNode
}) {
  const [snapshot, setSnapshot] = useState<SalesSnapshot | null>(null)
  const [plans, setPlans] = useState<readonly SalesPlan[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  const [load] = useState(newestLoadWins)

  /** Reloads; resolves to the new data, or null if it failed or was overtaken. */
  const refresh = useCallback(async (): Promise<SalesSnapshot | null> => {
    const outcome = await load()
    if (outcome.stale) return null
    if (!outcome.ok) {
      setLoadError(
        outcome.error instanceof Error
          ? outcome.error.message
          : 'Couldn’t load the sales dashboard.',
      )
      return null
    }
    setSnapshot(outcome.snapshot)
    setLoadError(null)
    return outcome.snapshot
  }, [load])

  useEffect(() => {
    let active = true
    loadPlans()
      .then((loaded) => {
        if (active) setPlans(loaded)
      })
      .catch(() => {
        if (active) setPlans([])
      })
    return () => {
      active = false
    }
  }, [])

  // Loads now, again whenever someone else changes something (a booking from
  // the website, another rep, a tutor opening slots), and every few minutes
  // as slots and "upcoming" move on with the clock.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const soon = (delay = 600) => {
      clearTimeout(timer)
      timer = setTimeout(() => void refresh(), delay)
    }
    soon(0)
    const channel = supabase.channel(`sales-dashboard-${crypto.randomUUID()}`)
    for (const table of WATCHED_TABLES) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => soon(),
      )
    }
    channel.subscribe((status) => {
      // Catches anything that changed while the connection was opening.
      if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) soon()
    })
    const interval = setInterval(() => void refresh(), 5 * 60_000)
    return () => {
      clearTimeout(timer)
      clearInterval(interval)
      void supabase.removeChannel(channel)
    }
  }, [refresh])

  const value = useMemo<SalesData | null>(() => {
    if (!snapshot) return null

    /**
     * Runs a change, then reloads so every screen shows the result. Resolves
     * to the saved row and the reloaded data (null if the reload failed: the
     * change is saved, and the next reload shows it).
     */
    const change = async <T,>(
      run: () => PromiseLike<{
        data: T | null
        error: { message?: string } | null
      }>,
      fallback: string,
    ): Promise<{ row: T; fresh: SalesSnapshot | null }> => {
      let result: { data: T | null; error: { message?: string } | null }
      try {
        result = await run()
      } catch (error) {
        throw failure(
          error instanceof Error ? error : null,
          'No connection. Check your internet and try again.',
        )
      }
      if (result.error || result.data === null) {
        throw failure(result.error, fallback)
      }
      return { row: result.data, fresh: await refresh() }
    }

    return {
      ...snapshot,
      bookings: snapshot.bookings.filter((booking) => !booking.removal),
      removedBookings: snapshot.bookings.filter((booking) => booking.removal),
      isDemo: false,
      plans,

      addLead: async (input) => {
        const { row } = await change(
          () =>
            supabase.rpc('sales_add_lead', {
              p_parent_name: input.parentName,
              p_phone: input.phone,
              p_email: input.email,
              p_source: input.source,
              p_notes: input.notes,
            }),
          'Couldn’t save the parent.',
        )
        return {
          id: row.id,
          parentName: row.parent_name ?? input.parentName,
          phone: row.phone ?? input.phone,
          email: row.email ?? '',
          source: toSource(row.lead_source),
          salesRepId: row.marketer_id,
          status: 'new',
          createdAt: row.created_at ?? new Date().toISOString(),
          lastContactedAt: null,
          notes: row.notes ?? '',
          bookingId: null,
        }
      },

      setLeadStatus: async (leadId, status) => {
        await change(
          () =>
            supabase.rpc('sales_set_lead_status', {
              p_lead_id: leadId,
              p_status: status,
            }),
          'Couldn’t update the parent.',
        )
      },

      bookTrial: async (input) => {
        const slot = snapshot.slots.find((s) => s.id === input.slotId)
        const { row, fresh } = await change(
          () =>
            supabase.rpc('book_trial', {
              p_lead_id: input.leadId,
              p_slot_id: input.slotId,
              p_category: input.category,
              p_student_name: input.studentName,
              p_student_grade: input.studentGrade,
              p_notes: input.notes,
            }),
          'Couldn’t book that session.',
        )
        const booked = fresh?.bookings.find((booking) => booking.id === row.id)
        if (booked) return booked
        const mentor = snapshot.mentors.find(
          (candidate) => candidate.id === row.mentor_id,
        )
        return {
          ...input,
          id: row.id,
          mentorId: row.mentor_id,
          salesRepId: row.marketer_id,
          start: slot?.start ?? row.created_at,
          end: slot?.end ?? row.created_at,
          meetLink: mentor?.meetLink ?? '',
          status: 'scheduled',
          source: toSource(row.source),
          createdAt: row.created_at,
          removal: null,
        }
      },

      removeBooking: async (bookingId, removal) => {
        await change(
          () =>
            supabase.rpc('remove_trial_booking', {
              p_booking_id: bookingId,
              p_reason: removal.reason,
              p_note: removal.note,
            }),
          'Couldn’t remove the booking.',
        )
      },

      restoreBooking: async (bookingId) => {
        await change(
          () =>
            supabase.rpc('restore_trial_booking', { p_booking_id: bookingId }),
          'Couldn’t restore the booking.',
        )
      },

      setTrialStatus: async (bookingId, status) => {
        await change(
          () =>
            supabase.rpc('set_trial_status', {
              p_booking_id: bookingId,
              p_status: status,
            }),
          'Couldn’t save the outcome.',
        )
      },

      recordSale: async (bookingId, plan, amount, creditRepId) => {
        await change(
          () =>
            supabase.rpc('record_sale', {
              p_booking_id: bookingId,
              p_plan: plan,
              p_amount_kes: Math.round(amount),
              ...(creditRepId ? { p_marketer_id: creditRepId } : {}),
            }),
          'Couldn’t record the sale.',
        )
      },

      markMessageSent: async (messageId) => {
        await change(
          () => supabase.rpc('mark_whatsapp_sent', { p_message_id: messageId }),
          'Couldn’t mark the message sent.',
        )
      },

      setMentorPrograms: async (mentorId, programs) => {
        if (programs.length === 0) {
          throw new Error('Pick at least one program.')
        }
        const { error: removeError } = await supabase
          .from('mentor_grade_categories')
          .delete()
          .eq('mentor_id', mentorId)
          .not('category_id', 'in', `(${programs.join(',')})`)
        if (removeError) {
          throw failure(removeError, 'Couldn’t save the programs.')
        }
        const { error: addError } = await supabase
          .from('mentor_grade_categories')
          .upsert(
            programs.map((category_id) => ({
              mentor_id: mentorId,
              category_id,
            })),
            { onConflict: 'mentor_id,category_id', ignoreDuplicates: true },
          )
        if (addError) throw failure(addError, 'Couldn’t save the programs.')
        await refresh()
      },

      setMonthlyTarget: async (repId, target) => {
        if (!Number.isInteger(target) || target < 1) {
          throw new Error('A target is a whole number of sales, 1 or more.')
        }
        const { error } = await supabase
          .from('sales_targets')
          .upsert(
            { marketer_id: repId, month: monthStart(), target_sales: target },
            { onConflict: 'marketer_id,month' },
          )
        if (error) throw failure(error, 'Couldn’t save the target.')
        await refresh()
      },
    }
  }, [snapshot, plans, refresh])

  if (!value) {
    return (
      <div className="mx-auto max-w-7xl p-4 md:p-8">
        {loadError ? (
          <div
            role="alert"
            className="flex flex-col items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
          >
            <p className="flex items-center gap-2 font-extrabold">
              <AlertTriangle size={16} aria-hidden /> The sales dashboard didn’t
              load
            </p>
            <p>{loadError}</p>
            <button
              type="button"
              onClick={() => void refresh()}
              className={secondaryButton}
            >
              <RotateCcw size={16} aria-hidden /> Try again
            </button>
          </div>
        ) : (
          <output className="flex items-center gap-2 py-16 text-sm font-semibold text-slate-500 dark:text-slate-400">
            <Loader2 size={16} className="animate-spin" aria-hidden /> Loading
            parents, trials and sales…
          </output>
        )}
      </div>
    )
  }

  return (
    <SalesDataContext.Provider value={value}>
      {children}
    </SalesDataContext.Provider>
  )
}
