import { useCallback, useEffect, useMemo, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventClickArg } from '@fullcalendar/core'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../supabase'
import { queryKeys } from '../../lib/queryClient'
import { useNow } from '../../hooks/useNow'
import type { Tables, TablesUpdate } from '../../types/database'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Video,
  CheckCircle2,
  XCircle,
  Play,
  Square,
  FileText,
  Link2,
  RefreshCw,
  UserRoundCheck,
  UserPlus,
  AlertTriangle,
  ExternalLink,
  X,
} from 'lucide-react'
import { toast, Toaster } from 'react-hot-toast'
import '../../../src/fullcalendar.css'
import type { ReactNode, MouseEvent } from 'react'
import type { LucideIcon } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { isAdminRole } from '../../types/roles'

type AppUser = Tables<'users'>
type Lead = Tables<'leads'>
type CalendarEvent = Tables<'calendar_events'>
type Attendance = Tables<'event_attendance'>
type BookingRequest = Tables<'class_booking_requests'>
type ClassResource = Tables<'class_resources'>
type SessionStatus = 'ongoing' | 'completed'
type ResourceType = 'material' | 'recording'

interface ScheduleSnapshot {
  authUser: User
  profile: AppUser
  users: AppUser[]
  leads: Lead[]
  calendarEvents: CalendarEvent[]
  attendance: Attendance[]
  bookingRequests: BookingRequest[]
  resources: ClassResource[]
}

const STORAGE_BUCKET = 'class-resources'
const BREAK_MINUTES = 15

const NO_USERS: AppUser[] = []
const NO_LEADS: Lead[] = []
const NO_EVENTS: CalendarEvent[] = []
const NO_ATTENDANCE: Attendance[] = []
const NO_REQUESTS: BookingRequest[] = []
const NO_RESOURCES: ClassResource[] = []

const displayName = (u: AppUser | null | undefined): string => {
  if (!u) return 'Unknown user'
  return u.full_name || u.email || 'Unnamed user'
}
const prettyDate = (value: string | null | undefined): string =>
  value
    ? new Date(value).toLocaleString([], {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Not set'
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  )
    return error.message
  if (
    typeof error === 'object' &&
    error !== null &&
    'details' in error &&
    typeof error.details === 'string'
  )
    return error.details
  return 'Something went wrong. Please try again.'
}
const isFreeSlot = (event: CalendarEvent | null | undefined): boolean =>
  event?.title === 'Free Slot' &&
  !event?.class_id &&
  event?.booking_status !== 'cancelled'
const isAdmin = isAdminRole
const startTimeOf = (e: CalendarEvent) => new Date(e.start_time).getTime()

/** Loads everything the schedule shows; `null` when nobody is signed in. */
async function loadSchedule(): Promise<ScheduleSnapshot | null> {
  try {
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    if (!authData?.user) {
      toast.error('Please sign in to view the schedule.')
      return null
    }
    const { data: myProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle()
    if (profileError) throw profileError
    if (!myProfile)
      throw new Error('Your user profile was not found in the users table.')

    const [eventsRes, attendanceRes, requestsRes, usersRes] = await Promise.all(
      [
        supabase
          .from('calendar_events')
          .select('*')
          .order('start_time', { ascending: true }),
        supabase.from('event_attendance').select('*'),
        supabase
          .from('class_booking_requests')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase.from('users').select('*'),
      ],
    )
    if (eventsRes.error) throw eventsRes.error
    if (attendanceRes.error) throw attendanceRes.error
    if (
      requestsRes.error &&
      !/class_booking_requests|does not exist/i.test(
        requestsRes.error.message || '',
      )
    )
      throw requestsRes.error
    if (usersRes.error) throw usersRes.error

    let leads: Lead[] = []
    if (isAdminRole(myProfile.role)) {
      const { data: leadRows, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
      if (leadsError) throw leadsError
      leads = leadRows
    }

    const { data: resourceRows, error: resourceError } = await supabase
      .from('class_resources')
      .select('*')
      .order('created_at', { ascending: false })
    if (
      resourceError &&
      !/class_resources|does not exist/i.test(resourceError.message || '')
    )
      throw resourceError

    return {
      authUser: authData.user,
      profile: myProfile,
      users: usersRes.data,
      leads,
      calendarEvents: eventsRes.data,
      attendance: attendanceRes.data,
      bookingRequests: requestsRes.data ?? [],
      resources: resourceRows ?? [],
    }
  } catch (error) {
    console.error('GlobalScheduleView load error:', error)
    toast.error(`Could not load schedule: ${getErrorMessage(error)}`)
    throw error
  }
}

interface PanelProps {
  title: string
  icon: LucideIcon
  children: ReactNode
  action?: ReactNode
}

function Panel({ title, icon: Icon, children, action }: PanelProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white">
          {Icon ? <Icon size={16} className="text-indigo-500" /> : null}
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  )
}

interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
}

function Modal({ title, onClose, children }: ModalProps) {
  return (
    // `presentation`: the backdrop only catches clicks outside the dialog.
    <div
      role="presentation"
      className="fixed inset-0 z-1000 flex items-center justify-center bg-slate-950/60 p-4"
      onMouseDown={(e: MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-black text-slate-900 dark:text-white">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function GlobalScheduleView() {
  const navigate = useNavigate()
  const now = useNow(60_000)
  const [saving, setSaving] = useState(false)
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showAvailability, setShowAvailability] = useState(false)
  const [showMeetingLink, setShowMeetingLink] = useState(false)
  const [showMerge, setShowMerge] = useState(false)
  const [availabilityStart, setAvailabilityStart] = useState('')
  const [meetingLinkDraft, setMeetingLinkDraft] = useState('')
  const [selectedStudentToMerge, setSelectedStudentToMerge] = useState('')
  const [reassignTutorId, setReassignTutorId] = useState('')
  const [responseNote, setResponseNote] = useState('')

  const scheduleQuery = useQuery({
    queryKey: queryKeys.schedule.global,
    queryFn: loadSchedule,
    // Per-user data under a fixed key: always reload on mount, never reuse it
    // after the view closes (e.g. for the next person who signs in).
    staleTime: 0,
    gcTime: 0,
    retry: false,
  })
  const loading = scheduleQuery.isPending
  const refreshing = scheduleQuery.isFetching && !scheduleQuery.isPending
  const snapshot = scheduleQuery.data ?? null
  const authUser = snapshot?.authUser ?? null
  const profile = snapshot?.profile ?? null
  const users = snapshot?.users ?? NO_USERS
  const leads = snapshot?.leads ?? NO_LEADS
  const calendarEvents = snapshot?.calendarEvents ?? NO_EVENTS
  const attendance = snapshot?.attendance ?? NO_ATTENDANCE
  const bookingRequests = snapshot?.bookingRequests ?? NO_REQUESTS
  const resources = snapshot?.resources ?? NO_RESOURCES
  const reload = async () => {
    await scheduleQuery.refetch()
  }

  const role = profile?.role ?? null
  const admin = isAdmin(role)
  const tutor = role === 'tutor'
  const student = role === 'student'
  const tutors = useMemo(
    () => users.filter((u) => u.role === 'tutor' && u.is_active !== false),
    [users],
  )
  const students = useMemo(
    () => users.filter((u) => u.role === 'student' && u.is_active !== false),
    [users],
  )
  const attendanceByEvent = useMemo(() => {
    const map: Record<string, Attendance[] | undefined> = {}
    attendance.forEach((row) => {
      if (row.event_id) (map[row.event_id] ||= []).push(row)
    })
    return map
  }, [attendance])
  const usersById = useMemo(() => {
    const map = new Map<string, AppUser>()
    for (const u of users) map.set(u.id, u)
    return map
  }, [users])
  const findUser = useCallback(
    (id: string | null | undefined) => (id ? usersById.get(id) : undefined),
    [usersById],
  )

  // Class recordings/materials are stored in a PRIVATE bucket. Generate short-lived
  // signed URLs only for resources the current user is allowed to read.
  useEffect(() => {
    let cancelled = false
    const paths = new Set<string>()
    resources.forEach((r) => {
      if (r.file_url && !/^https?:\/\//i.test(r.file_url)) paths.add(r.file_url)
    })
    calendarEvents.forEach((e) => {
      if (e.class_material_url && !/^https?:\/\//i.test(e.class_material_url))
        paths.add(e.class_material_url)
      if (e.recording_url && !/^https?:\/\//i.test(e.recording_url))
        paths.add(e.recording_url)
    })
    if (!paths.size)
      return () => {
        cancelled = true
      }
    const signUrls = async () => {
      const next: Record<string, string> = {}
      await Promise.all(
        [...paths].map(async (path) => {
          const { data, error } = await supabase.storage
            .from(STORAGE_BUCKET)
            .createSignedUrl(path, 3600)
          if (!error && data?.signedUrl) next[path] = data.signedUrl
        }),
      )
      if (!cancelled) setSignedUrls((old) => ({ ...old, ...next }))
    }
    void signUrls()
    return () => {
      cancelled = true
    }
  }, [resources, calendarEvents])

  const resourceHref = (path: string | null) => {
    if (!path) return ''
    if (/^https?:\/\//i.test(path)) return path
    return signedUrls[path] || '#'
  }

  const canSeeEvent = useCallback(
    (event: CalendarEvent) => {
      if (admin) return true
      if (event.tutor_id === authUser?.id) return true
      if (
        attendanceByEvent[event.id]?.some((a) => a.student_id === authUser?.id)
      )
        return true
      if (
        student &&
        isFreeSlot(event) &&
        new Date(event.start_time).getTime() > now
      )
        return true
      if (
        bookingRequests.some(
          (r) =>
            r.calendar_event_id === event.id &&
            (r.student_id === authUser?.id || r.tutor_id === authUser?.id),
        )
      )
        return true
      return false
    },
    [admin, authUser?.id, attendanceByEvent, bookingRequests, student, now],
  )

  const visibleEvents = useMemo(
    () => calendarEvents.filter(canSeeEvent),
    [calendarEvents, canSeeEvent],
  )
  const fullCalendarEvents = useMemo(
    () =>
      visibleEvents.map((event) => {
        const tutorName = displayName(findUser(event.tutor_id))
        const attendees = attendanceByEvent[event.id] || []
        const isFree = isFreeSlot(event)
        const title = isFree
          ? `Available · ${tutorName}`
          : event.title || event.class_type || 'Class'
        let color = '#4f46e5'
        if (isFree) color = '#0d9488'
        else if (event.booking_status === 'pending') color = '#d97706'
        else if (event.session_status === 'completed') color = '#64748b'
        else if (event.class_type === 'trial') color = '#db2777'
        return {
          id: event.id,
          title,
          start: event.start_time,
          end: event.end_time,
          backgroundColor: color,
          borderColor: color,
          extendedProps: {
            tutorName,
            attendeeCount: attendees.length,
          },
        }
      }),
    [visibleEvents, findUser, attendanceByEvent],
  )

  const unassignedLeads = useMemo(
    () => leads.filter((lead) => !lead.assigned_tutor_id),
    [leads],
  )
  const pendingRequests = useMemo(
    () =>
      bookingRequests.filter(
        (r) => r.status === 'pending' && (admin || r.tutor_id === authUser?.id),
      ),
    [bookingRequests, admin, authUser?.id],
  )
  const myUpcoming = useMemo(
    () =>
      calendarEvents.filter(
        (e) =>
          e.tutor_id === authUser?.id &&
          new Date(e.start_time).getTime() >= now &&
          e.booking_status !== 'cancelled',
      ),
    [calendarEvents, authUser?.id, now],
  )
  const myBookedCount = useMemo(
    () => myUpcoming.filter((e) => !isFreeSlot(e)).length,
    [myUpcoming],
  )
  const myFreeCount = useMemo(
    () => myUpcoming.filter(isFreeSlot).length,
    [myUpcoming],
  )

  const runAction = async (fn: () => Promise<void>, successMessage: string) => {
    setSaving(true)
    try {
      await fn()
      toast.success(successMessage)
      await reload()
    } catch (error) {
      console.error(error)
      toast.error(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const createAvailability = () =>
    runAction(async () => {
      if (!availabilityStart) throw new Error('Choose a start date and time.')
      const start = new Date(availabilityStart)
      if (Number.isNaN(start.getTime()) || start <= new Date())
        throw new Error('Availability must be in the future.')
      const { error } = await supabase.rpc('create_tutor_availability', {
        p_start: start.toISOString(),
      })
      if (error) throw error
      setShowAvailability(false)
      setAvailabilityStart('')
    }, 'One-hour availability slot created. A 15-minute break is enforced.')

  const requestBooking = (event: CalendarEvent) =>
    runAction(async () => {
      if (!student || !authUser)
        throw new Error(
          'Only subscribed students can request a class from this calendar.',
        )
      if (!event.tutor_id)
        throw new Error('This slot does not have an assigned tutor.')
      if (
        bookingRequests.some(
          (r) =>
            r.student_id === authUser.id &&
            r.calendar_event_id === event.id &&
            ['pending', 'accepted'].includes(r.status),
        )
      ) {
        throw new Error(
          'You already have a pending or accepted request for this slot.',
        )
      }
      const { error } = await supabase.from('class_booking_requests').insert({
        student_id: authUser.id,
        tutor_id: event.tutor_id,
        requested_start: event.start_time,
        requested_end: event.end_time,
        calendar_event_id: event.id,
        status: 'pending',
      })
      if (error) throw error
      setSelectedEvent(null)
    }, 'Booking request sent to the tutor.')

  const respondToRequest = (
    request: BookingRequest,
    decision: 'accept' | 'reject',
  ) =>
    runAction(
      async () => {
        const { error } = await supabase.rpc(
          'respond_to_class_booking_request',
          {
            p_request_id: request.id,
            p_decision: decision,
            p_response: responseNote.trim() || undefined,
          },
        )
        if (error) throw error
        setResponseNote('')
        setSelectedEvent(null)
      },
      decision === 'accept'
        ? 'Booking accepted and calendar updated.'
        : 'Booking rejected. Admins have been notified.',
    )

  const assignTrial = (lead: Lead) =>
    runAction(async () => {
      // Pick the earliest future free slot. The slot is converted into a trial event,
      // so it cannot be offered to a second learner at the same time.
      const currentTime = Date.now()
      let candidates = calendarEvents
        .filter((e) => isFreeSlot(e) && startTimeOf(e) > currentTime)
        .toSorted((a, b) => startTimeOf(a) - startTimeOf(b))
      // If the parent selected a specific time, only use a slot at that time.
      // Do not silently move the trial to a different time when the requested slot is unavailable.
      if (lead.class_date && lead.class_time) {
        const wantedDate = lead.class_date.slice(0, 10)
        const wantedTime = lead.class_time.slice(0, 5)
        candidates = candidates.filter((e) => {
          const local = new Date(e.start_time)
          const date = `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`
          const time = `${String(local.getHours()).padStart(2, '0')}:${String(local.getMinutes()).padStart(2, '0')}`
          return date === wantedDate && time === wantedTime
        })
      }
      const chosen = candidates[0]
      if (!chosen)
        throw new Error(
          'No tutor slot is available at the requested trial time. The trial remains unassigned at the top of the queue.',
        )
      const studentName = lead.student_name || 'Trial student'
      const { error: eventError } = await supabase
        .from('calendar_events')
        .update({
          title: `Trial: ${studentName}`,
          class_type: 'trial',
          booking_status: 'confirmed',
          session_status: 'scheduled',
          meet_link: lead.personal_meet_link || null,
        })
        .eq('id', chosen.id)
        .eq('title', 'Free Slot')
      if (eventError) throw eventError
      const start = new Date(chosen.start_time)
      const { error: leadError } = await supabase
        .from('leads')
        .update({
          assigned_tutor_id: chosen.tutor_id,
          class_date: start.toISOString().slice(0, 10),
          class_time: start.toISOString().slice(11, 16),
        })
        .eq('id', lead.id)
        .is('assigned_tutor_id', null)
      if (leadError) throw leadError
      if (lead.student_user_id) {
        const { error: attendanceError } = await supabase
          .from('event_attendance')
          .upsert(
            { event_id: chosen.id, student_id: lead.student_user_id },
            { onConflict: 'event_id,student_id' },
          )
        if (attendanceError) throw attendanceError
      }
    }, 'Trial assigned to the earliest available tutor slot.')

  const reassignTutor = () =>
    runAction(async () => {
      if (!selectedEvent || !reassignTutorId)
        throw new Error('Select a tutor first.')
      if (
        selectedEvent.session_status === 'ongoing' ||
        selectedEvent.session_status === 'completed'
      )
        throw new Error('A started or completed class cannot be reassigned.')
      const start = new Date(selectedEvent.start_time)
      const end = new Date(selectedEvent.end_time)
      const { data: conflicts, error: conflictError } = await supabase
        .from('calendar_events')
        .select('id,start_time,end_time,title,booking_status')
        .eq('tutor_id', reassignTutorId)
        .neq('id', selectedEvent.id)
        .neq('booking_status', 'cancelled')
        .lt(
          'start_time',
          new Date(end.getTime() + BREAK_MINUTES * 60000).toISOString(),
        )
        .gt(
          'end_time',
          new Date(start.getTime() - BREAK_MINUTES * 60000).toISOString(),
        )
      if (conflictError) throw conflictError
      if (conflicts?.length)
        throw new Error(
          'That tutor has a class or availability slot within the required 15-minute break window.',
        )
      const { error } = await supabase
        .from('calendar_events')
        .update({ tutor_id: reassignTutorId })
        .eq('id', selectedEvent.id)
      if (error) throw error
      if (selectedEvent.class_id) {
        const { error: classError } = await supabase
          .from('classes')
          .update({ tutor_id: reassignTutorId })
          .eq('id', selectedEvent.class_id)
        if (classError) throw classError
      }
      setSelectedEvent(null)
    }, 'Tutor reassigned.')

  const mergeStudent = () =>
    runAction(async () => {
      if (!selectedEvent || !selectedStudentToMerge)
        throw new Error('Select a student to merge into this class.')
      if (!admin) throw new Error('Only admins can merge students.')
      if (selectedEvent.merged_class)
        throw new Error('This class has already been merged.')
      const existing = attendanceByEvent[selectedEvent.id] || []
      if (existing.length >= 2)
        throw new Error('A class can have no more than two students.')
      if (existing.some((a) => a.student_id === selectedStudentToMerge))
        throw new Error('That student is already in this class.')
      const { error: attendanceError } = await supabase
        .from('event_attendance')
        .insert({
          event_id: selectedEvent.id,
          student_id: selectedStudentToMerge,
        })
      if (attendanceError) throw attendanceError
      const { error: eventError } = await supabase
        .from('calendar_events')
        .update({
          merged_class: true,
          title: `${selectedEvent.title || 'Class'} (2 students)`,
        })
        .eq('id', selectedEvent.id)
        .eq('merged_class', false)
      if (eventError) throw eventError
      setShowMerge(false)
      setSelectedStudentToMerge('')
      setSelectedEvent(null)
    }, 'Student added to the class.')

  const setSessionStatus = (event: CalendarEvent, status: SessionStatus) =>
    runAction(
      async () => {
        if (status === 'ongoing' && event.session_status === 'completed')
          throw new Error('Completed classes cannot be restarted.')
        const timestamp = new Date().toISOString()
        const update: TablesUpdate<'calendar_events'> & {
          session_status: SessionStatus
        } = { session_status: status }
        if (status === 'ongoing') update.started_at = timestamp
        if (status === 'completed') update.ended_at = timestamp
        const { error } = await supabase
          .from('calendar_events')
          .update(update)
          .eq('id', event.id)
        if (error) throw error
        if (event.class_id) {
          const classUpdate: TablesUpdate<'classes'> = { status }
          if (status === 'ongoing') classUpdate.started_at = update.started_at
          if (status === 'completed') classUpdate.ended_at = update.ended_at
          const { error: classError } = await supabase
            .from('classes')
            .update(classUpdate)
            .eq('id', event.class_id)
          if (classError) throw classError
        }
        setSelectedEvent({ ...event, ...update })
      },
      status === 'ongoing' ? 'Class started.' : 'Class marked completed.',
    )

  const savePermanentMeetLink = () =>
    runAction(async () => {
      if (!admin)
        throw new Error(
          'Only admins can update permanent student meeting links.',
        )
      const url = meetingLinkDraft.trim()
      if (url && !/^https:\/\//i.test(url))
        throw new Error('Enter a complete HTTPS meeting URL.')
      if (!selectedEvent) throw new Error('Select a class first.')
      const studentId = attendanceByEvent[selectedEvent.id]?.[0]?.student_id
      if (!studentId)
        throw new Error(
          'This event is not linked to a student account. Add the student account to attendance first.',
        )
      const { error } = await supabase
        .from('users')
        .update({
          personal_meet_link: url || null,
          meeting_provider: 'google_meet',
        })
        .eq('id', studentId)
      if (error) throw error
      if (url) {
        const { error: eventError } = await supabase
          .from('calendar_events')
          .update({ meet_link: url })
          .eq('id', selectedEvent.id)
        if (eventError) throw eventError
      }
      setShowMeetingLink(false)
      setSelectedEvent(null)
    }, 'Permanent meeting link saved.')

  const uploadResource = async (
    event: CalendarEvent,
    file: File | undefined,
    resourceType: ResourceType,
  ) => {
    if (!file || !authUser) return
    setSaving(true)
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `${event.id}/${Date.now()}-${safeName}`
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, { upsert: false, cacheControl: '3600' })
      if (uploadError)
        throw new Error(
          `Upload failed. Confirm the '${STORAGE_BUCKET}' storage bucket exists and its policies allow this upload. ${uploadError.message}`,
        )
      // Store the object path, not a public URL. The bucket stays private.
      const fileUrl = path
      const { error: resourceError } = await supabase
        .from('class_resources')
        .insert({
          event_id: event.id,
          uploaded_by: authUser.id,
          resource_type: resourceType,
          title: file.name,
          file_url: fileUrl,
        })
      if (resourceError) throw resourceError
      const eventPatch =
        resourceType === 'recording'
          ? { recording_url: fileUrl }
          : { class_material_url: fileUrl }
      const { error: eventError } = await supabase
        .from('calendar_events')
        .update(eventPatch)
        .eq('id', event.id)
      if (eventError) throw eventError
      if (event.class_id) {
        const { error: classError } = await supabase
          .from('classes')
          .update(eventPatch)
          .eq('id', event.class_id)
        if (classError) throw classError
      }
      toast.success(
        resourceType === 'recording'
          ? 'Recording uploaded.'
          : 'Class material uploaded.',
      )
      await reload()
      setSelectedEvent((old) => (old ? { ...old, ...eventPatch } : old))
    } catch (error) {
      console.error(error)
      toast.error(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const handleEventClick = (info: EventClickArg) => {
    const event = calendarEvents.find((e) => e.id === info.event.id)
    if (!event) return
    setSelectedEvent(event)
    setReassignTutorId(event.tutor_id || '')
    setMeetingLinkDraft(event.meet_link || '')
  }

  const myRequestForEvent =
    selectedEvent &&
    bookingRequests.find(
      (r) =>
        r.calendar_event_id === selectedEvent.id &&
        r.student_id === authUser?.id &&
        ['pending', 'accepted'].includes(r.status),
    )
  const eventAttendees = selectedEvent
    ? attendanceByEvent[selectedEvent.id] || []
    : []
  const selectedRequests = selectedEvent
    ? bookingRequests.filter((r) => r.calendar_event_id === selectedEvent.id)
    : []
  const selectedResources = selectedEvent
    ? resources.filter((r) => r.event_id === selectedEvent.id)
    : []
  const selectedTutor = selectedEvent ? findUser(selectedEvent.tutor_id) : null
  const studentMeetLink = student ? profile?.personal_meet_link : null

  if (loading)
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm font-semibold text-slate-500">
        <RefreshCw className="mr-2 animate-spin" size={18} /> Loading global
        schedule…
      </div>
    )

  return (
    <div className="space-y-5 p-3 md:p-6">
      <Toaster position="top-right" />
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-start gap-3">
          <button
            onClick={() => void navigate(-1)}
            className="mt-1 rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
              Global Schedule
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Tutor availability, bookings, trials and live class management.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => void reload()}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />{' '}
            Refresh
          </button>
          {tutor && (
            <button
              onClick={() => setShowAvailability(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-extrabold text-white hover:bg-indigo-700"
            >
              <CalendarDays size={16} /> Add availability
            </button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900">
          <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">
            Upcoming classes
          </p>
          <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
            {admin
              ? calendarEvents.filter(
                  (e) =>
                    !isFreeSlot(e) &&
                    new Date(e.start_time).getTime() > now &&
                    e.booking_status !== 'cancelled',
                ).length
              : tutor
                ? myBookedCount
                : calendarEvents.filter(
                    (e) =>
                      (attendanceByEvent[e.id] || []).some(
                        (a) => a.student_id === authUser?.id,
                      ) && new Date(e.start_time).getTime() > now,
                  ).length}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900">
          <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">
            Tutor availability
          </p>
          <p className="mt-2 text-3xl font-black text-teal-600">
            {admin
              ? calendarEvents.filter(isFreeSlot).length
              : tutor
                ? myFreeCount
                : calendarEvents.filter(isFreeSlot).length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            60-minute slots · 15-minute breaks
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900">
          <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">
            Pending bookings
          </p>
          <p className="mt-2 text-3xl font-black text-amber-600">
            {pendingRequests.length}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900">
          <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">
            Unassigned trials
          </p>
          <p className="mt-2 text-3xl font-black text-pink-600">
            {admin ? unassignedLeads.length : '—'}
          </p>
          {admin && unassignedLeads.length > 0 && (
            <p className="mt-1 text-xs font-semibold text-pink-600">
              Prioritised in the queue below
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs md:p-5 dark:border-white/10 dark:bg-slate-900">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-base font-black text-slate-900 dark:text-white">
              <CalendarDays size={18} className="text-indigo-500" /> Calendar
            </h2>
            <div className="flex flex-wrap gap-3 text-xs font-semibold text-slate-500">
              <span className="flex items-center gap-1">
                <i className="h-2.5 w-2.5 rounded-full bg-teal-600" /> Available
              </span>
              <span className="flex items-center gap-1">
                <i className="h-2.5 w-2.5 rounded-full bg-pink-600" /> Trial
              </span>
              <span className="flex items-center gap-1">
                <i className="h-2.5 w-2.5 rounded-full bg-indigo-600" /> Class
              </span>
              <span className="flex items-center gap-1">
                <i className="h-2.5 w-2.5 rounded-full bg-amber-600" /> Pending
              </span>
            </div>
          </div>
          <div className="global-schedule-calendar min-h-[620px] text-sm">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay',
              }}
              height="auto"
              nowIndicator
              selectable={false}
              events={fullCalendarEvents}
              eventClick={handleEventClick}
              slotMinTime="07:00:00"
              slotMaxTime="21:00:00"
              allDaySlot={false}
              slotDuration="00:15:00"
              eventTimeFormat={{
                hour: '2-digit',
                minute: '2-digit',
                meridiem: 'short',
              }}
            />
          </div>
        </section>

        <aside className="space-y-4">
          {student && (
            <Panel title="Your permanent meeting link" icon={Video}>
              {studentMeetLink ? (
                <a
                  href={studentMeetLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-bold break-all text-indigo-600 hover:underline"
                >
                  Join Google Meet <ExternalLink size={14} />
                </a>
              ) : (
                <p className="text-sm text-slate-500">
                  Your permanent Meet link has not been set yet. Contact Tech
                  Talk Hub admin.
                </p>
              )}
              <p className="mt-2 text-xs text-slate-500">
                Your link is reused for your trial and future classes when
                configured by an admin.
              </p>
            </Panel>
          )}

          {pendingRequests.length > 0 && (
            <Panel title="Booking requests" icon={Clock3}>
              <div className="space-y-3">
                {pendingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/20 dark:bg-amber-500/10"
                  >
                    <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                      {displayName(findUser(request.student_id))}
                    </p>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                      {prettyDate(request.requested_start)}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        disabled={saving || (!tutor && !admin)}
                        onClick={() => void respondToRequest(request, 'accept')}
                        className="flex-1 rounded-lg bg-teal-600 px-2 py-2 text-xs font-extrabold text-white disabled:opacity-50"
                      >
                        <CheckCircle2 size={13} className="mr-1 inline" />{' '}
                        Accept
                      </button>
                      <button
                        disabled={saving || (!tutor && !admin)}
                        onClick={() => void respondToRequest(request, 'reject')}
                        className="flex-1 rounded-lg bg-rose-600 px-2 py-2 text-xs font-extrabold text-white disabled:opacity-50"
                      >
                        <XCircle size={13} className="mr-1 inline" /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {admin && (
            <Panel
              title={`Unassigned trial queue (${unassignedLeads.length})`}
              icon={AlertTriangle}
            >
              <p className="mb-3 text-xs text-slate-500">
                No available slot? These trials stay unassigned until a tutor
                slot is available.
              </p>
              {unassignedLeads.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No unassigned trial leads.
                </p>
              ) : (
                <div className="max-h-[360px] space-y-2 overflow-y-auto">
                  {unassignedLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="rounded-xl border border-slate-200 p-3 dark:border-white/10"
                    >
                      <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                        {lead.student_name || 'Trial student'}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {lead.parent_name ||
                          lead.email ||
                          lead.phone ||
                          'No parent contact'}
                      </p>
                      <button
                        disabled={
                          saving ||
                          !calendarEvents.some(
                            (e) =>
                              isFreeSlot(e) &&
                              new Date(e.start_time).getTime() > now,
                          )
                        }
                        onClick={() => void assignTrial(lead)}
                        className="mt-3 w-full rounded-lg bg-indigo-600 px-3 py-2 text-xs font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <UserRoundCheck size={13} className="mr-1 inline" />{' '}
                        Auto-assign next available slot
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          )}

          {tutor && (
            <Panel title="Tutor availability" icon={Clock3}>
              <div className="space-y-2 text-sm">
                <p className="flex justify-between">
                  <span className="text-slate-500">Available slots</span>
                  <strong className="text-teal-600">{myFreeCount}</strong>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-500">Booked classes</span>
                  <strong>{myBookedCount}</strong>
                </p>
                <p className="text-xs leading-5 text-slate-500">
                  Each availability slot is exactly 60 minutes. A 15-minute
                  buffer is checked before and after each slot.
                </p>
                <button
                  onClick={() => setShowAvailability(true)}
                  className="mt-2 w-full rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-extrabold text-white"
                >
                  <CalendarDays size={14} className="mr-1 inline" /> Create
                  availability
                </button>
              </div>
            </Panel>
          )}

          <Panel title="Quick guide" icon={FileText}>
            <ul className="space-y-2 text-xs leading-5 text-slate-500">
              <li>
                • Select a calendar event to see class details and actions.
              </li>
              <li>
                • Students request an available slot; tutors accept or reject.
              </li>
              <li>
                • Admins can reassign tutors and merge a maximum of two
                students.
              </li>
              <li>
                • Google Meet rooms must be created through Google or supplied
                as a real meeting URL; this screen does not fabricate Meet
                links.
              </li>
            </ul>
          </Panel>
        </aside>
      </div>

      {selectedEvent && (
        <Modal
          title={selectedEvent.title || 'Class details'}
          onClose={() => setSelectedEvent(null)}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
                <p className="text-xs font-bold text-slate-500 uppercase">
                  Date and time
                </p>
                <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                  {prettyDate(selectedEvent.start_time)}
                </p>
                <p className="text-xs text-slate-500">
                  Ends {prettyDate(selectedEvent.end_time)}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
                <p className="text-xs font-bold text-slate-500 uppercase">
                  Tutor
                </p>
                <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                  {displayName(selectedTutor)}
                </p>
                <p className="text-xs text-slate-500">
                  {selectedEvent.class_type || 'Class'} ·{' '}
                  {selectedEvent.session_status || 'scheduled'}
                </p>
              </div>
            </div>
            {eventAttendees.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-extrabold text-slate-900 dark:text-white">
                  Students
                </h4>
                <div className="space-y-2">
                  {eventAttendees.map((row) => {
                    const attendee = findUser(row.student_id)
                    return (
                      <div
                        key={row.id}
                        className="flex items-center justify-between rounded-xl border border-slate-200 p-3 dark:border-white/10"
                      >
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">
                            {displayName(attendee)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {attendee?.email || ''}
                          </p>
                        </div>
                        {attendee?.personal_meet_link && (
                          <a
                            className="text-xs font-bold text-indigo-600 hover:underline"
                            href={attendee.personal_meet_link}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Meet link
                          </a>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {selectedEvent.meet_link && (
              <a
                href={selectedEvent.meet_link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-teal-700"
              >
                <Video size={16} /> Join Google Meet <ExternalLink size={14} />
              </a>
            )}
            {student && isFreeSlot(selectedEvent) && !myRequestForEvent && (
              <button
                disabled={saving}
                onClick={() => void requestBooking(selectedEvent)}
                className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50"
              >
                Request this class slot
              </button>
            )}
            {student && myRequestForEvent && (
              <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                Your request is {myRequestForEvent.status}.
              </p>
            )}
            {(tutor || admin) && !isFreeSlot(selectedEvent) && (
              <div className="flex flex-wrap gap-2">
                {selectedEvent.session_status !== 'ongoing' &&
                  selectedEvent.session_status !== 'completed' && (
                    <button
                      disabled={saving}
                      onClick={() =>
                        void setSessionStatus(selectedEvent, 'ongoing')
                      }
                      className="rounded-xl bg-teal-600 px-3 py-2 text-sm font-extrabold text-white"
                    >
                      <Play size={14} className="mr-1 inline" /> Start class
                    </button>
                  )}
                {selectedEvent.session_status === 'ongoing' && (
                  <button
                    disabled={saving}
                    onClick={() =>
                      void setSessionStatus(selectedEvent, 'completed')
                    }
                    className="rounded-xl bg-slate-800 px-3 py-2 text-sm font-extrabold text-white"
                  >
                    <Square size={13} className="mr-1 inline" /> End class
                  </button>
                )}
              </div>
            )}
            {(tutor || admin) && !isFreeSlot(selectedEvent) && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                  Upload class material
                  <input
                    type="file"
                    onChange={(e) =>
                      void uploadResource(
                        selectedEvent,
                        e.target.files?.[0],
                        'material',
                      )
                    }
                    className="mt-2 block w-full text-xs"
                    disabled={saving}
                  />
                </label>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                  Upload class recording
                  <input
                    type="file"
                    accept="video/*,audio/*,.mp4,.webm,.mov,.mp3,.m4a"
                    onChange={(e) =>
                      void uploadResource(
                        selectedEvent,
                        e.target.files?.[0],
                        'recording',
                      )
                    }
                    className="mt-2 block w-full text-xs"
                    disabled={saving}
                  />
                </label>
              </div>
            )}
            {(selectedEvent.class_material_url ||
              selectedEvent.recording_url ||
              selectedResources.length > 0) && (
              <div>
                <h4 className="mb-2 text-sm font-extrabold text-slate-900 dark:text-white">
                  Materials and recordings
                </h4>
                <div className="space-y-2">
                  {selectedEvent.class_material_url && (
                    <a
                      href={resourceHref(selectedEvent.class_material_url)}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-sm font-bold break-all text-indigo-600 hover:underline"
                    >
                      <FileText size={14} className="mr-1 inline" /> Open class
                      material
                    </a>
                  )}
                  {selectedEvent.recording_url && (
                    <a
                      href={resourceHref(selectedEvent.recording_url)}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-sm font-bold break-all text-indigo-600 hover:underline"
                    >
                      <Video size={14} className="mr-1 inline" /> Watch class
                      recording
                    </a>
                  )}
                  {selectedResources.map((r) => (
                    <a
                      key={r.id}
                      href={resourceHref(r.file_url)}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-sm font-bold break-all text-indigo-600 hover:underline"
                    >
                      {r.resource_type === 'recording'
                        ? 'Recording'
                        : 'Material'}
                      : {r.title}
                    </a>
                  ))}
                </div>
              </div>
            )}
            {selectedRequests.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-extrabold text-slate-900 dark:text-white">
                  Booking history
                </h4>
                {selectedRequests.map((r) => (
                  <div
                    key={r.id}
                    className="mb-2 rounded-xl border border-slate-200 p-3 text-xs dark:border-white/10"
                  >
                    <p className="font-bold">
                      {displayName(findUser(r.student_id))} · {r.status}
                    </p>
                    {r.tutor_response && (
                      <p className="mt-1 text-slate-500">{r.tutor_response}</p>
                    )}
                    {r.status === 'pending' && (tutor || admin) && (
                      <>
                        <textarea
                          value={responseNote}
                          onChange={(e) => setResponseNote(e.target.value)}
                          placeholder="Optional response / rejection reason"
                          className="mt-2 w-full rounded-lg border border-slate-200 p-2 text-sm dark:border-white/10 dark:bg-slate-800"
                        />
                        <div className="mt-2 flex gap-2">
                          <button
                            disabled={saving}
                            onClick={() => void respondToRequest(r, 'accept')}
                            className="rounded-lg bg-teal-600 px-3 py-2 font-bold text-white"
                          >
                            Accept
                          </button>
                          <button
                            disabled={saving}
                            onClick={() => void respondToRequest(r, 'reject')}
                            className="rounded-lg bg-rose-600 px-3 py-2 font-bold text-white"
                          >
                            Reject
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
            {admin && (
              <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-white/10">
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Admin actions
                </h4>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <select
                    value={reassignTutorId}
                    onChange={(e) => setReassignTutorId(e.target.value)}
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-800"
                  >
                    <option value="">Select tutor to reassign</option>
                    {tutors.map((t) => (
                      <option key={t.id} value={t.id}>
                        {displayName(t)}
                      </option>
                    ))}
                  </select>
                  <button
                    disabled={saving || !reassignTutorId}
                    onClick={() => void reassignTutor()}
                    className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-extrabold text-white disabled:opacity-50"
                  >
                    <RefreshCw size={13} className="mr-1 inline" /> Reassign
                  </button>
                </div>
                {!selectedEvent.merged_class &&
                  eventAttendees.length < 2 &&
                  !isFreeSlot(selectedEvent) && (
                    <button
                      onClick={() => setShowMerge(true)}
                      className="w-full rounded-xl border border-indigo-200 px-3 py-2 text-sm font-extrabold text-indigo-700 hover:bg-indigo-50 dark:border-indigo-500/30 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
                    >
                      <UserPlus size={14} className="mr-1 inline" /> Merge one
                      more student into this class
                    </button>
                  )}
                {selectedEvent.merged_class && (
                  <p className="text-xs font-semibold text-amber-600">
                    This class has already been merged; no further student can
                    be added.
                  </p>
                )}
                <button
                  onClick={() => {
                    setMeetingLinkDraft(selectedEvent.meet_link || '')
                    setShowMeetingLink(true)
                  }}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-extrabold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
                >
                  <Link2 size={14} className="mr-1 inline" /> Set permanent
                  student Meet link
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {showAvailability && (
        <Modal
          title="Create tutor availability"
          onClose={() => setShowAvailability(false)}
        >
          <p className="mb-4 text-sm leading-6 text-slate-500">
            This creates a fixed <strong>60-minute</strong> slot. The database
            checks for conflicts and enforces a <strong>15-minute break</strong>{' '}
            before and after it.
          </p>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
            Start date and time
            <input
              type="datetime-local"
              value={availabilityStart}
              min={new Date(now + 60000).toISOString().slice(0, 16)}
              onChange={(e) => setAvailabilityStart(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm dark:border-white/10 dark:bg-slate-800"
            />
          </label>
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setShowAvailability(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold dark:border-white/10"
            >
              Cancel
            </button>
            <button
              disabled={saving || !availabilityStart}
              onClick={() => void createAvailability()}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-extrabold text-white disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Create 1-hour slot'}
            </button>
          </div>
        </Modal>
      )}

      {showMeetingLink && (
        <Modal
          title="Set permanent student Meet link"
          onClose={() => setShowMeetingLink(false)}
        >
          <p className="mb-4 text-sm leading-6 text-slate-500">
            Paste a real Google Meet URL created by the school or Google
            account. This saves it to the student's profile for reuse across
            trial and course classes.
          </p>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
            Google Meet URL
            <input
              type="url"
              value={meetingLinkDraft}
              onChange={(e) => setMeetingLinkDraft(e.target.value)}
              placeholder="https://meet.google.com/..."
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm dark:border-white/10 dark:bg-slate-800"
            />
          </label>
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setShowMeetingLink(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold dark:border-white/10"
            >
              Cancel
            </button>
            <button
              disabled={saving}
              onClick={() => void savePermanentMeetLink()}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-extrabold text-white"
            >
              Save link
            </button>
          </div>
        </Modal>
      )}

      {showMerge && (
        <Modal
          title="Merge student into class"
          onClose={() => setShowMerge(false)}
        >
          <p className="mb-4 text-sm leading-6 text-slate-500">
            Only one additional student may be added. This action is available
            only before the class has been merged.
          </p>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
            Choose student
            <select
              value={selectedStudentToMerge}
              onChange={(e) => setSelectedStudentToMerge(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm dark:border-white/10 dark:bg-slate-800"
            >
              <option value="">Select student…</option>
              {students
                .filter(
                  (s) => !eventAttendees.some((a) => a.student_id === s.id),
                )
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {displayName(s)}
                    {s.email ? ` · ${s.email}` : ''}
                  </option>
                ))}
            </select>
          </label>
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setShowMerge(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold dark:border-white/10"
            >
              Cancel
            </button>
            <button
              disabled={saving || !selectedStudentToMerge}
              onClick={() => void mergeStudent()}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-extrabold text-white disabled:opacity-50"
            >
              Add student
            </button>
          </div>
        </Modal>
      )}

      {saving && (
        <div className="fixed right-4 bottom-4 z-1100 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-xl">
          <RefreshCw size={14} className="mr-2 inline animate-spin" /> Saving
          changes…
        </div>
      )}
    </div>
  )
}
