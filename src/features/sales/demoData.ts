import { GRADE_CATEGORIES } from './gradeCategories'
import { whatsappMessage } from './whatsapp'
import type {
  BookingSource,
  GradeCategoryId,
  Lead,
  LeadStatus,
  Mentor,
  Sale,
  SalesRep,
  TrialBooking,
  TrialSlot,
  TrialStatus,
  WhatsAppMessage,
} from './types'

/**
 * Made-up people, slots and sales for previewing the sales dashboard before
 * the marketer role and booking tables exist. Generated around today's date so
 * the preview always looks current; the same day always gives the same data.
 */

export const DEMO_MENTORS: readonly Mentor[] = [
  {
    id: 'mentor-1',
    name: 'Brian Otieno',
    categories: ['junior-coders', 'future-developers'],
    meetLink: 'https://meet.google.com/demo-brn-001',
  },
  {
    id: 'mentor-2',
    name: 'Faith Wanjiru',
    categories: ['junior-coders'],
    meetLink: 'https://meet.google.com/demo-fth-002',
  },
  {
    id: 'mentor-3',
    name: 'Kevin Mutua',
    categories: ['future-developers', 'tech-professionals'],
    meetLink: 'https://meet.google.com/demo-kvn-003',
  },
  {
    id: 'mentor-4',
    name: 'Aisha Hassan',
    categories: ['tech-professionals'],
    meetLink: 'https://meet.google.com/demo-ash-004',
  },
  {
    id: 'mentor-5',
    name: 'Daniel Kiprop',
    categories: ['junior-coders', 'future-developers', 'tech-professionals'],
    meetLink: 'https://meet.google.com/demo-dnl-005',
  },
]

export const DEMO_SALES_REPS: readonly SalesRep[] = [
  { id: 'rep-1', name: 'Mercy Achieng', monthlyTarget: 12 },
  { id: 'rep-2', name: 'John Kamau', monthlyTarget: 10 },
  { id: 'rep-3', name: 'Grace Njeri', monthlyTarget: 10 },
]

export const DEMO_PLANS = [
  { name: 'Monthly plan · 8 classes', amount: 12_000 },
  { name: 'Term plan · 24 classes', amount: 32_000 },
  { name: 'Annual plan · 96 classes', amount: 115_000 },
] as const

const PARENTS = [
  'Wanjiku Mwangi',
  'Peter Ochieng',
  'Amina Abdi',
  'James Kariuki',
  'Lucy Akinyi',
  'Samuel Kiptoo',
  'Esther Nyambura',
  'David Omondi',
  'Ruth Chebet',
  'Joseph Mutiso',
  'Mary Wairimu',
  'Ali Hussein',
  'Catherine Atieno',
  'Paul Njoroge',
  'Janet Moraa',
  'Stephen Wekesa',
]

const STUDENTS = [
  'Ethan',
  'Zawadi',
  'Liam',
  'Imani',
  'Ryan',
  'Neema',
  'Jayden',
  'Amani',
  'Tamara',
  'Brian Jr.',
  'Shani',
  'Ian',
  'Makena',
  'Tevin',
  'Nia',
  'Kofi',
  'Wambui',
  'Daniel',
  'Pendo',
  'Tumaini',
  'Grace',
  'Jabari',
  'Sifa',
  'Joel',
  'Halima',
  'Zuri',
  'Ivy',
  'Mark',
  'Achieng',
  'Victor',
  'Lulu',
  'Felix',
]

/** Parents the team hasn't booked a trial for yet. */
const OPEN_LEAD_PARENTS = [
  'Beatrice Kamau',
  'Collins Odhiambo',
  'Diana Mumbi',
  'Edwin Rotich',
  'Florence Nduta',
  'George Maina',
  'Hellen Jeptoo',
  'Isaac Ouma',
  'Joyce Wambui',
  'Kennedy Barasa',
  'Linet Adhiambo',
  'Moses Kibet',
  'Naomi Gathoni',
  'Oscar Musyoka',
  'Purity Chepkoech',
  'Rose Nekesa',
]

const LEAD_NOTES = [
  '',
  '',
  'Asked about weekend classes.',
  'Two children, asked about a sibling discount.',
  'Prefers WhatsApp to calls.',
  'Call after 6 PM.',
]

const INBOUND_REPLIES = [
  'Thank you! We will be there 🙏',
  'Received, thanks. Is a tablet okay or should we use a laptop?',
  'Can we move it 30 minutes later?',
  'Great, my son is very excited!',
]

/** Small seeded PRNG (mulberry32), so a given day always builds the same data. */
function seededRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296
  }
}

export type SalesDemoData = {
  mentors: Mentor[]
  reps: SalesRep[]
  slots: TrialSlot[]
  leads: Lead[]
  bookings: TrialBooking[]
  sales: Sale[]
  messages: WhatsAppMessage[]
}

const emailFor = (name: string) =>
  `${name.split(' ')[0].toLowerCase()}@example.com`

const HOUR = 3_600_000
const DAY = 24 * HOUR

export function buildDemoData(now = new Date()): SalesDemoData {
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const random = seededRandom(today.getTime() / DAY)
  const pick = <T>(list: readonly T[]): T =>
    list[Math.floor(random() * list.length)]

  const slots: TrialSlot[] = []
  const leads: Lead[] = []
  const bookings: TrialBooking[] = []
  const sales: Sale[] = []
  const messages: WhatsAppMessage[] = []
  let counter = 0
  const nextId = (prefix: string) => `${prefix}-${(counter += 1)}`
  const phone = () =>
    `+2547${String(10_000_000 + Math.floor(random() * 89_999_999)).slice(0, 8)}`
  // Each booking is a different child, so a name never shows up twice.
  const usedStudents = new Set<string>()
  const studentName = (surname: string) => {
    let name = `${pick(STUDENTS)} ${surname}`
    for (let tries = 0; usedStudents.has(name) && tries < 20; tries += 1) {
      name = `${pick(STUDENTS)} ${surname}`
    }
    usedStudents.add(name)
    return name
  }

  // Six weeks back fills the weekly sales chart; two weeks ahead fills calendars.
  for (let dayOffset = -42; dayOffset <= 14; dayOffset += 1) {
    const day = new Date(today.getTime() + dayOffset * DAY)
    const weekend = day.getDay() === 0 || day.getDay() === 6
    // Weekday trials run after school; weekends through the day.
    const hours = weekend ? [9, 11, 14, 16] : [16, 18]

    for (const mentor of DEMO_MENTORS) {
      for (const hour of hours) {
        if (random() < 0.45) continue
        const start = new Date(day)
        start.setHours(hour, 0, 0, 0)
        const slot: TrialSlot = {
          id: nextId('slot'),
          mentorId: mentor.id,
          start: start.toISOString(),
          end: new Date(start.getTime() + HOUR).toISOString(),
          bookingId: null,
        }
        slots.push(slot)

        const past = start.getTime() < now.getTime()
        if (random() > (past ? 0.75 : 0.4)) continue

        const category: GradeCategoryId = pick(mentor.categories)
        const grades = GRADE_CATEGORIES.find((c) => c.id === category)!.grades
        const source: BookingSource =
          random() < 0.35
            ? 'website'
            : pick(['sales_call', 'whatsapp', 'privyr'])
        const rep =
          source === 'website' && random() < 0.5 ? null : pick(DEMO_SALES_REPS)

        let status: TrialStatus = 'scheduled'
        if (past) {
          const roll = random()
          status =
            roll < 0.38
              ? 'converted'
              : roll < 0.62
                ? 'attended'
                : roll < 0.8
                  ? 'lost'
                  : roll < 0.93
                    ? 'no_show'
                    : 'cancelled'
        }
        // A family decides up to two days after the trial; nothing is dated
        // in the future, so a trial that just ended is still "attended".
        const closedAt =
          start.getTime() + (2 + Math.floor(random() * 48)) * HOUR
        if (status === 'converted' && closedAt > now.getTime()) {
          status = 'attended'
        }

        const parentName = pick(PARENTS)
        const leadId = nextId('lead')
        const booking: TrialBooking = {
          id: nextId('booking'),
          slotId: slot.id,
          leadId,
          mentorId: mentor.id,
          salesRepId: rep?.id ?? null,
          category,
          parentName,
          parentPhone: phone(),
          parentEmail: emailFor(parentName),
          studentName: studentName(parentName.split(' ')[1]),
          studentGrade: pick(grades),
          start: slot.start,
          end: slot.end,
          meetLink: mentor.meetLink,
          status,
          source,
          notes: '',
          removal: null,
          // Booked one to five days ahead, and never later than now.
          createdAt: new Date(
            Math.min(
              start.getTime() - (1 + Math.floor(random() * 5)) * DAY,
              now.getTime() - (1 + Math.floor(random() * 72)) * HOUR,
            ),
          ).toISOString(),
        }
        bookings.push(booking)
        slot.bookingId = booking.id

        // A rep is credited for website bookings they close, too.
        const closer = rep ?? pick(DEMO_SALES_REPS)
        if (status === 'converted') {
          const plan = pick(DEMO_PLANS)
          sales.push({
            id: nextId('sale'),
            bookingId: booking.id,
            salesRepId: closer.id,
            studentName: booking.studentName,
            plan: plan.name,
            amount: plan.amount,
            closedAt: new Date(closedAt).toISOString(),
          })
          if (!booking.salesRepId) booking.salesRepId = closer.id
        }

        // The parent came in first; the child's details came from the call.
        leads.push({
          id: leadId,
          parentName,
          phone: booking.parentPhone,
          email: booking.parentEmail,
          source,
          salesRepId: booking.salesRepId,
          // A missed trial is worth rebooking for a week; after that the
          // family has usually moved on.
          status:
            (status === 'no_show' || status === 'cancelled') &&
            start.getTime() < now.getTime() - 7 * DAY
              ? 'not_interested'
              : 'trial_booked',
          createdAt: new Date(
            new Date(booking.createdAt).getTime() -
              (4 + Math.floor(random() * 60)) * HOUR,
          ).toISOString(),
          lastContactedAt: booking.createdAt,
          notes: '',
          bookingId: booking.id,
        })

        const confirmationAt = booking.createdAt
        messages.push({
          id: nextId('wa'),
          bookingId: booking.id,
          contactName: booking.parentName,
          phone: booking.parentPhone,
          direction: 'outbound',
          template: 'trial_confirmation',
          body: whatsappMessage('trial_confirmation', booking, mentor),
          at: confirmationAt,
          status:
            random() < 0.06 ? 'failed' : random() < 0.8 ? 'read' : 'delivered',
        })
        const replyAt = new Date(confirmationAt).getTime() + 2 * HOUR
        if (random() < 0.4 && replyAt <= now.getTime()) {
          messages.push({
            id: nextId('wa'),
            bookingId: booking.id,
            contactName: booking.parentName,
            phone: booking.parentPhone,
            direction: 'inbound',
            template: null,
            body: pick(INBOUND_REPLIES),
            at: new Date(replyAt).toISOString(),
            status: 'read',
          })
        }
        const reminderAt = start.getTime() - 2 * HOUR
        if (status !== 'cancelled') {
          messages.push({
            id: nextId('wa'),
            bookingId: booking.id,
            contactName: booking.parentName,
            phone: booking.parentPhone,
            direction: 'outbound',
            template: 'trial_reminder',
            body: whatsappMessage('trial_reminder', booking, mentor),
            at: new Date(reminderAt).toISOString(),
            status: reminderAt > now.getTime() ? 'queued' : 'read',
          })
        }
        if (
          status === 'attended' ||
          status === 'converted' ||
          status === 'lost'
        ) {
          const followUpAt = start.getTime() + 3 * HOUR
          messages.push({
            id: nextId('wa'),
            bookingId: booking.id,
            contactName: booking.parentName,
            phone: booking.parentPhone,
            direction: 'outbound',
            template: 'trial_follow_up',
            body: whatsappMessage('trial_follow_up', booking, mentor),
            at: new Date(followUpAt).toISOString(),
            status: followUpAt > now.getTime() ? 'queued' : 'read',
          })
        }
      }
    }
  }

  // Parents still waiting for a call, or who decided not to go ahead.
  for (const parentName of OPEN_LEAD_PARENTS) {
    const source: BookingSource =
      random() < 0.45 ? 'website' : pick(['privyr', 'whatsapp', 'sales_call'])
    const roll = random()
    const status: LeadStatus =
      roll < 0.5 ? 'new' : roll < 0.85 ? 'contacted' : 'not_interested'
    // New website leads wait for whoever picks them up first.
    const rep =
      status === 'new' && source === 'website' && random() < 0.6
        ? null
        : pick(DEMO_SALES_REPS)
    const createdAt = now.getTime() - (1 + Math.floor(random() * 120)) * HOUR
    leads.push({
      id: nextId('lead'),
      parentName,
      phone: phone(),
      email: emailFor(parentName),
      source,
      salesRepId: rep?.id ?? null,
      status,
      createdAt: new Date(createdAt).toISOString(),
      lastContactedAt:
        status === 'new'
          ? null
          : new Date(
              Math.min(
                createdAt + (1 + Math.floor(random() * 24)) * HOUR,
                now.getTime() - HOUR,
              ),
            ).toISOString(),
      notes: pick(LEAD_NOTES),
      bookingId: null,
    })
  }

  return {
    mentors: [...DEMO_MENTORS],
    reps: [...DEMO_SALES_REPS],
    slots,
    leads: leads.toSorted(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
    bookings,
    sales,
    messages: messages.toSorted(
      (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
    ),
  }
}
