// Reads and writes the classroom's Supabase tables
// (supabase/migrations/20261110120000_classroom.sql).
//
// Until that migration is applied, or when Supabase isn't configured, every
// load returns the built-in sample (src/data/classroomSample.ts) and nothing
// is saved, so the room keeps working.
import { agendaMinutes, sampleClassroomData } from '../../data/classroomSample'
import { isSupabaseConfigured, supabase } from '../../supabase'
import { NO_SCHEDULE, scheduledEnd } from './schedule'
import { isEndedStatus, toSessionStatus } from './sessionStatus'
import type { ClassroomRow } from '../../types/classroomTables'
import type {
  Activity,
  AgendaStep,
  Badge,
  BadgeIcon,
  BadgeOrnament,
  ClassEndReport,
  ClassMaterial,
  Classroom,
  ClassroomData,
  ClassroomViewer,
  GivenBadge,
  MaterialLinkItem,
  MaterialLinkRow,
  Student,
  SubmittedProject,
} from '../../types/classroom'
import { plannedDb } from '../plannedDb'

/** Private bucket for recordings made in the classroom. */
export const RECORDINGS_BUCKET = 'class-recordings'

const STAFF_ROLES = new Set([
  'owner',
  'operations_admin',
  'tech_admin',
  'tutor',
])
const ADMIN_ROLES = new Set(['owner', 'operations_admin', 'tech_admin'])

const BADGE_ICONS: readonly BadgeIcon[] = [
  'code',
  'crown',
  'bulb',
  'pen',
  'medal',
  'rocket',
  'stars',
  'star',
]
const BADGE_ORNAMENTS: readonly BadgeOrnament[] = ['wreath', 'wings', 'none']

type DbError = { code?: string; message?: string } | null

/** The classroom tables or functions don't exist: the migration isn't applied. */
export function isMissingSchema(error: DbError) {
  if (!error) return false
  return (
    error.code === '42P01' ||
    error.code === '42883' ||
    error.code === 'PGRST202' ||
    error.code === 'PGRST205' ||
    /does not exist|schema cache/i.test(error.message ?? '')
  )
}

let warnedMissingSchema = false
function warnMissingSchema() {
  if (warnedMissingSchema) return
  warnedMissingSchema = true
  console.warn(
    'Classroom tables not found: showing sample data. Apply supabase/migrations/20261110120000_classroom.sql to use real classes.',
  )
}

function fail(error: DbError, fallback: string): never {
  throw new Error(error?.message || fallback)
}

// ---------------------------------------------------------------------------
// Row -> classroom shapes
// ---------------------------------------------------------------------------

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const text = (value: unknown) => (typeof value === 'string' ? value : '')

export function asBadgeIcon(value: string): BadgeIcon {
  return BADGE_ICONS.find((icon) => icon === value) ?? 'medal'
}

export function asBadgeOrnament(value: string): BadgeOrnament {
  return BADGE_ORNAMENTS.find((ornament) => ornament === value) ?? 'none'
}

/** classroom_materials.agenda, defensively: rows without a step are dropped. */
export function parseAgenda(value: unknown): AgendaStep[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!isRecord(item) || !text(item.step).trim()) return []
    const minutes = Number(item.minutes)
    return [
      {
        minutes: Number.isFinite(minutes) ? minutes : 0,
        step: text(item.step),
      },
    ]
  })
}

/** classroom_materials.links: rows need a label, items need text and a URL. */
export function parseLinks(value: unknown): MaterialLinkRow[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((row) => {
    if (!isRecord(row) || !text(row.label).trim()) return []
    const items: MaterialLinkItem[] = Array.isArray(row.items)
      ? row.items.flatMap((item) =>
          isRecord(item) && text(item.text) && text(item.href)
            ? [
                {
                  text: text(item.text),
                  href: text(item.href),
                  underline: item.underline === true || undefined,
                },
              ]
            : [],
        )
      : []
    return [
      {
        label: text(row.label),
        isNew: row.isNew === true || undefined,
        note: text(row.note) || undefined,
        items,
      },
    ]
  })
}

export function toMaterial(row: ClassroomRow<'classroom_materials'>) {
  const material: ClassMaterial = {
    outcome: row.outcomes,
    outline: row.outline,
    agendaWarning: {
      title: row.agenda_warning_title,
      body: row.agenda_warning_body,
    },
    agenda: parseAgenda(row.agenda),
    links: parseLinks(row.links),
  }
  return material
}

export const toActivity = (
  row: ClassroomRow<'classroom_activities'>,
): Activity => ({
  id: row.id,
  title: row.title,
  outline: row.outline,
  project: row.project_url ?? '',
})

export const toBadge = (row: ClassroomRow<'classroom_badges'>): Badge => ({
  id: row.id,
  name: row.name,
  icon: asBadgeIcon(row.icon),
  ornament: asBadgeOrnament(row.ornament),
})

export const toStudent = (
  row: ClassroomRow<'classroom_session_students'>,
): Student => ({
  id: row.id,
  userId: row.student_id,
  name: row.display_name,
  grade: row.grade ?? '',
  studentId: row.student_code ?? '',
  phone: row.phone ?? '',
  email: row.email ?? '',
  country: row.country ?? '',
  city: row.city ?? '',
  timeZone: row.time_zone || 'UTC',
  language: row.language ?? '',
  source: row.source ?? '',
  interests: row.interests,
  specialRequirement: row.special_requirement ?? '',
})

const UNKNOWN_BADGE = {
  name: 'Badge',
  icon: 'medal',
  ornament: 'none',
} as const

function toAward(
  row: ClassroomRow<'classroom_badge_awards'>,
  badges: Badge[],
  students: Student[],
): GivenBadge {
  const badge = badges.find((candidate) => candidate.id === row.badge_id)
  return {
    ...UNKNOWN_BADGE,
    ...badge,
    id: row.badge_id,
    key: row.id,
    at: Date.parse(row.created_at),
    studentId: row.session_student_id,
    studentName:
      students.find((student) => student.id === row.session_student_id)?.name ??
      'Student',
    saved: true,
  }
}

function toProject(
  row: ClassroomRow<'classroom_project_submissions'>,
  students: Student[],
): SubmittedProject {
  return {
    id: row.id,
    at: Date.parse(row.created_at),
    activity: row.activity_title,
    link: row.project_url,
    note: row.note ?? '',
    studentId: row.session_student_id,
    studentName:
      students.find((student) => student.id === row.session_student_id)?.name ??
      'Student',
  }
}

const initialOf = (name: string) => name.trim().charAt(0).toUpperCase() || '?'

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

const ANONYMOUS: ClassroomViewer = {
  userId: null,
  name: null,
  isStaff: false,
  isAdmin: false,
  canHost: false,
}

export async function loadViewer(): Promise<ClassroomViewer> {
  if (!isSupabaseConfigured) return ANONYMOUS
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return ANONYMOUS
  const { data } = await supabase
    .from('users')
    .select('full_name, role')
    .eq('id', session.user.id)
    .maybeSingle()
  const role = data?.role ?? ''
  return {
    userId: session.user.id,
    name: data?.full_name?.trim() || null,
    isStaff: STAFF_ROLES.has(role),
    isAdmin: ADMIN_ROLES.has(role),
    // Narrowed per room in loadClassroom.
    canHost: STAFF_ROLES.has(role),
  }
}

function emptyRoom(
  roomCode: string,
  viewer: ClassroomViewer,
  source: ClassroomData['source'],
  overrides: Partial<Classroom> = {},
  badges: Badge[] = [],
): ClassroomData {
  const teacherName = viewer.name ?? 'Teacher'
  return {
    source,
    classroom: {
      id: roomCode,
      title: 'Live class',
      pageTitle: 'Live class',
      teacher: { name: teacherName, initial: initialOf(teacherName) },
      sessionId: null,
      status: null,
      recommendedMinutes: 60,
      schedule: NO_SCHEDULE,
      ...overrides,
    },
    students: [],
    material: null,
    activities: [],
    badges,
    awards: [],
    projects: [],
    viewer,
  }
}

/**
 * Guests and students: the join screen only needs the class title, and the
 * status decides whether they may join at all.
 */
async function loadAttendeeRoom(roomCode: string, viewer: ClassroomViewer) {
  const { data, error } = await plannedDb.rpc('classroom_public_info', {
    p_room_code: roomCode,
  })
  if (isMissingSchema(error)) {
    warnMissingSchema()
    return sampleClassroomData(roomCode, viewer)
  }
  if (error) fail(error, 'Couldn’t load this class.')
  const [info] = data ?? []
  if (!info) return emptyRoom(roomCode, viewer, 'unlinked')
  return emptyRoom(roomCode, viewer, 'live', {
    title: info.title,
    pageTitle: info.title,
    status: toSessionStatus(info.status),
    schedule: {
      scheduledAt: info.scheduled_at ?? null,
      durationMinutes: info.duration_minutes ?? null,
      startedAt: info.started_at ?? null,
    },
  })
}

async function loadBadges(): Promise<Badge[]> {
  const { data, error } = await plannedDb
    .from('classroom_badges')
    .select('*')
    .eq('is_active', true)
    .order('position')
  if (error) fail(error, 'Couldn’t load the badges.')
  return data.map(toBadge)
}

/** Everything the room at /classroom/:roomCode shows. */
export async function loadClassroom(roomCode: string): Promise<ClassroomData> {
  const viewer = await loadViewer()
  if (!isSupabaseConfigured) return sampleClassroomData(roomCode, viewer)
  if (!viewer.isStaff) return loadAttendeeRoom(roomCode, viewer)

  const { data: session, error } = await plannedDb
    .from('classroom_sessions')
    .select('*')
    .eq('room_code', roomCode)
    .maybeSingle()
  if (isMissingSchema(error)) {
    warnMissingSchema()
    return sampleClassroomData(roomCode, viewer)
  }
  if (error) fail(error, 'Couldn’t load this class.')
  if (!session) {
    // Tutors only see their own sessions. If the room belongs to another
    // tutor, this one joins as a participant (the server enforces the same).
    const { data: info } = await plannedDb.rpc('classroom_public_info', {
      p_room_code: roomCode,
    })
    if (info?.length) {
      return loadAttendeeRoom(roomCode, { ...viewer, canHost: false })
    }
    // No class has this code. Staff can't open ad-hoc rooms any more: they
    // create a class (or Start a call) to get a room code.
    return emptyRoom(roomCode, viewer, 'unlinked')
  }

  const materialId = session.material_id
  const [roster, material, activities, badges, awards, projects, tutor] =
    await Promise.all([
      plannedDb
        .from('classroom_session_students')
        .select('*')
        .eq('session_id', session.id)
        .order('position'),
      materialId
        ? plannedDb
            .from('classroom_materials')
            .select('*')
            .eq('id', materialId)
            .maybeSingle()
        : null,
      materialId
        ? plannedDb
            .from('classroom_activities')
            .select('*')
            .eq('material_id', materialId)
            .order('position')
        : null,
      loadBadges(),
      plannedDb
        .from('classroom_badge_awards')
        .select('*')
        .eq('session_id', session.id)
        .order('created_at', { ascending: false }),
      plannedDb
        .from('classroom_project_submissions')
        .select('*')
        .eq('session_id', session.id)
        .order('created_at', { ascending: false }),
      session.tutor_id
        ? supabase
            .from('users')
            .select('full_name')
            .eq('id', session.tutor_id)
            .maybeSingle()
        : null,
    ])

  if (roster.error) fail(roster.error, 'Couldn’t load the students.')
  if (material?.error) fail(material.error, 'Couldn’t load the material.')
  if (activities?.error) {
    fail(activities.error, 'Couldn’t load the activities.')
  }
  if (awards.error) fail(awards.error, 'Couldn’t load the badges given.')
  if (projects.error) fail(projects.error, 'Couldn’t load the projects.')

  const students = roster.data.map(toStudent)
  const classMaterial = material?.data ? toMaterial(material.data) : null
  const teacherName = tutor?.data?.full_name?.trim() || viewer.name || 'Teacher'

  return {
    source: 'live',
    classroom: {
      id: session.room_code,
      title: session.title,
      pageTitle: session.page_title,
      teacher: { name: teacherName, initial: initialOf(teacherName) },
      sessionId: session.id,
      status: session.status,
      recommendedMinutes:
        agendaMinutes(classMaterial) || session.duration_minutes || 60,
      schedule: {
        scheduledAt: session.scheduled_at,
        durationMinutes: session.duration_minutes,
        startedAt: session.started_at,
      },
    },
    students,
    material: classMaterial,
    activities: (activities?.data ?? []).map(toActivity),
    badges,
    awards: awards.data.map((row) => toAward(row, badges, students)),
    projects: projects.data.map((row) => toProject(row, students)),
    viewer,
  }
}

/**
 * The class's students, re-read while the room is open, so a student the
 * tutor invites mid-class can be given badges and projects straight away.
 */
export async function loadRoster(sessionId: string): Promise<Student[]> {
  const { data, error } = await plannedDb
    .from('classroom_session_students')
    .select('*')
    .eq('session_id', sessionId)
    .order('position')
  if (error) fail(error, 'Couldn’t load the students.')
  return data.map(toStudent)
}

// ---------------------------------------------------------------------------
// Saving what happens in class
// ---------------------------------------------------------------------------

export async function saveBadgeAward(
  sessionId: string,
  studentId: string,
  badgeId: string,
) {
  const { data, error } = await plannedDb
    .from('classroom_badge_awards')
    .insert({
      session_id: sessionId,
      session_student_id: studentId,
      badge_id: badgeId,
    })
    .select('id, created_at')
    .single()
  if (error) fail(error, 'Couldn’t save the badge.')
  return { id: data.id, at: Date.parse(data.created_at) }
}

export async function deleteBadgeAward(awardId: string) {
  const { error } = await plannedDb
    .from('classroom_badge_awards')
    .delete()
    .eq('id', awardId)
  if (error) fail(error, 'Couldn’t remove the badge.')
}

type NewProject = {
  studentId: string
  activityId: string | null
  activity: string
  link: string
  note: string
}

export async function saveProject(sessionId: string, project: NewProject) {
  const { data, error } = await plannedDb
    .from('classroom_project_submissions')
    .insert({
      session_id: sessionId,
      session_student_id: project.studentId,
      activity_id: project.activityId,
      activity_title: project.activity,
      project_url: project.link,
      note: project.note || null,
    })
    .select('id, created_at')
    .single()
  if (error) fail(error, 'Couldn’t save the project.')
  return { id: data.id, at: Date.parse(data.created_at) }
}

export async function saveAlert(
  sessionId: string,
  alertType: 'ac' | 'support',
) {
  const { error } = await plannedDb
    .from('classroom_alerts')
    .insert({ session_id: sessionId, alert_type: alertType })
  if (error) fail(error, 'Couldn’t send the alert.')
}

/** The teacher opened the room: the session is live. */
export async function markSessionLive(sessionId: string) {
  const { data, error } = await plannedDb
    .from('classroom_sessions')
    .select('started_at, status')
    .eq('id', sessionId)
    .maybeSingle()
  if (error || !data) return
  if (isEndedStatus(data.status)) return
  await plannedDb
    .from('classroom_sessions')
    .update({
      status: 'live',
      started_at: data.started_at ?? new Date().toISOString(),
    })
    .eq('id', sessionId)
}

/**
 * Admins only: an ended or cancelled class can be joined again. The database
 * refuses this for anyone else (migration 20261111130000).
 *
 * The class gets a fresh time slot: if its time has passed it starts now,
 * for the same length, so the join-window rules don't turn people away
 * straight after the reopen. Its first join is cleared either way.
 */
export async function reopenSession(sessionId: string) {
  const { data: current } = await plannedDb
    .from('classroom_sessions')
    .select('scheduled_at, duration_minutes')
    .eq('id', sessionId)
    .maybeSingle()
  const end = current
    ? scheduledEnd({
        scheduledAt: current.scheduled_at,
        durationMinutes: current.duration_minutes,
        startedAt: null,
      })
    : null
  const timePassed = end !== null && end < Date.now()
  const { data, error } = await plannedDb
    .from('classroom_sessions')
    .update({
      status: 'scheduled',
      ended_at: null,
      started_at: null,
      ...(timePassed && { scheduled_at: new Date().toISOString() }),
    })
    .eq('id', sessionId)
    .select('id')
  if (error) fail(error, 'Couldn’t reopen the class.')
  if (!data.length) {
    throw new Error('Only an admin can reopen an ended class.')
  }
}

const markAttendance = (rosterIds: string[], attended: boolean) =>
  plannedDb
    .from('classroom_session_students')
    .update({ attended })
    .in('id', rosterIds)

/** End class: the report, the class length and who attended. */
export async function saveSessionEnd(
  sessionId: string,
  report: ClassEndReport,
  elapsedMs: number,
  students: Student[],
) {
  const { error } = await plannedDb
    .from('classroom_sessions')
    .update({
      status: report.outcome === 'completed' ? 'completed' : 'not_completed',
      ended_at: new Date().toISOString(),
      end_reason: report.reasonId,
      end_details: report.details.trim() || null,
      elapsed_seconds: Math.round(elapsedMs / 1000),
    })
    .eq('id', sessionId)
  if (error) fail(error, 'Couldn’t save the class report.')

  if (!students.length) return
  const attended = students
    .filter((student) => report.attended.includes(student.id))
    .map((student) => student.id)
  const absent = students
    .filter((student) => !report.attended.includes(student.id))
    .map((student) => student.id)
  // A class that didn't happen leaves attendance unreported.
  if (report.outcome !== 'completed') return
  const results = await Promise.all(
    [[attended, true] as const, [absent, false] as const]
      .filter(([ids]) => ids.length > 0)
      .map(([ids, value]) => markAttendance(ids, value)),
  )
  const failed = results.find((result) => result.error)
  if (failed?.error) fail(failed.error, 'Couldn’t save attendance.')
}

type RecordingUpload = {
  sessionId: string
  roomCode: string
  title: string
  blob: Blob
  extension: 'webm' | 'mp4'
  tutorId: string | null
  /** The registered student, when there is exactly one. */
  studentId: string | null
}

/**
 * Uploads a finished recording to the private bucket and files it under
 * Class Recordings. Returns the object path.
 */
export async function saveRecording({
  sessionId,
  roomCode,
  title,
  blob,
  extension,
  tutorId,
  studentId,
}: RecordingUpload) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const path = `${roomCode}/${stamp}.${extension}`
  const contentType = extension === 'mp4' ? 'video/mp4' : 'video/webm'

  const { error: uploadError } = await supabase.storage
    .from(RECORDINGS_BUCKET)
    .upload(path, blob, { contentType, upsert: false })
  if (uploadError) fail(uploadError, 'Upload failed.')

  const { error } = await plannedDb.from('class_recordings').insert({
    title,
    recording_url: path,
    tutor_id: tutorId,
    student_id: studentId,
    classroom_session_id: sessionId,
  })
  if (error) {
    await supabase.storage.from(RECORDINGS_BUCKET).remove([path])
    fail(error, 'Couldn’t file the recording.')
  }
  return path
}
