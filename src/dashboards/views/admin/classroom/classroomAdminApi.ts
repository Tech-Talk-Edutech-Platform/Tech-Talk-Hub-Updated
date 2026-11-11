import type { PostgrestError } from '@supabase/supabase-js'
import { isMissingSchema } from '../../../../lib/classroom/repository'
import { plannedDb } from '../../../../lib/plannedDb'
import { supabase } from '../../../../supabase'
import type {
  ClassroomRow,
  ClassroomTables,
} from '../../../../types/classroomTables'

/*
 * Reads and writes for Dashboard › Classroom. Row-level security decides who
 * can do what: admins manage everything, tutors read their own sessions.
 */

export type SessionRow = ClassroomRow<'classroom_sessions'>
export type RosterRow = ClassroomRow<'classroom_session_students'>
export type MaterialRow = ClassroomRow<'classroom_materials'>
export type ActivityRow = ClassroomRow<'classroom_activities'>
export type BadgeRow = ClassroomRow<'classroom_badges'>
export type AwardRow = ClassroomRow<'classroom_badge_awards'>
export type ProjectRow = ClassroomRow<'classroom_project_submissions'>
export type AlertRow = ClassroomRow<'classroom_alerts'>

type Insert<Name extends keyof ClassroomTables> =
  ClassroomTables[Name]['Insert']

/** The classroom migration hasn't been applied to this database yet. */
export class ClassroomSchemaMissing extends Error {
  constructor() {
    super('The classroom tables aren’t in Supabase yet.')
    this.name = 'ClassroomSchemaMissing'
  }
}

const FRIENDLY: Record<string, string> = {
  '23505': 'That already exists.',
  '23503': 'Something else still uses this.',
  '23514': 'One of the values isn’t allowed.',
  '42501': 'You don’t have permission to do that.',
}

function raise(
  error: PostgrestError,
  fallback: string,
  messages: Record<string, string> = {},
): never {
  if (isMissingSchema(error)) throw new ClassroomSchemaMissing()
  const friendly = messages[error.code] ?? FRIENDLY[error.code]
  throw new Error(friendly ?? (error.message || fallback))
}

export const classroomKeys = {
  all: ['classroom-admin'] as const,
  probe: ['classroom-admin', 'probe'] as const,
  sessions: ['classroom-admin', 'sessions'] as const,
  tutorSessions: (tutorId: string) =>
    ['classroom-admin', 'sessions', 'tutor', tutorId] as const,
  roster: (sessionId: string) =>
    ['classroom-admin', 'roster', sessionId] as const,
  activity: (sessionId: string) =>
    ['classroom-admin', 'activity', sessionId] as const,
  materials: ['classroom-admin', 'materials'] as const,
  activities: (materialId: string) =>
    ['classroom-admin', 'activities', materialId] as const,
  badges: ['classroom-admin', 'badges'] as const,
  people: ['classroom-admin', 'people'] as const,
  leads: ['classroom-admin', 'leads'] as const,
  courses: ['classroom-admin', 'courses'] as const,
}

/** True once the migration is applied; throws ClassroomSchemaMissing if not. */
export async function probeClassroomSchema() {
  const { error } = await plannedDb
    .from('classroom_badges')
    .select('id')
    .limit(1)
  if (error) raise(error, 'Couldn’t reach the classroom tables.')
  return true
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export type SessionSummary = SessionRow & {
  students: Pick<RosterRow, 'id' | 'display_name'>[]
}

async function withRosterNames(
  sessions: SessionRow[],
): Promise<SessionSummary[]> {
  if (!sessions.length) return []
  const { data, error } = await plannedDb
    .from('classroom_session_students')
    .select('id, session_id, display_name, position')
    .in(
      'session_id',
      sessions.map((session) => session.id),
    )
    .order('position')
  if (error) raise(error, 'Couldn’t load the class students.')
  return sessions.map((session) => ({
    ...session,
    students: data.filter((row) => row.session_id === session.id),
  }))
}

export async function listSessions() {
  const { data, error } = await plannedDb
    .from('classroom_sessions')
    .select('*')
    .order('scheduled_at', { ascending: false, nullsFirst: true })
    .order('created_at', { ascending: false })
    .limit(300)
  if (error) raise(error, 'Couldn’t load the classes.')
  return withRosterNames(data)
}

/** A tutor's own classes, soonest first. */
export async function listTutorSessions(tutorId: string) {
  const { data, error } = await plannedDb
    .from('classroom_sessions')
    .select('*')
    .eq('tutor_id', tutorId)
    .order('scheduled_at', { ascending: true, nullsFirst: false })
    .limit(200)
  if (error) raise(error, 'Couldn’t load your classes.')
  return withRosterNames(data)
}

export type SessionDraft = Pick<
  SessionRow,
  | 'room_code'
  | 'title'
  | 'page_title'
  | 'class_type'
  | 'tutor_id'
  | 'material_id'
  | 'scheduled_at'
  | 'duration_minutes'
  | 'status'
>

const SESSION_MESSAGES = {
  '23505': 'Another class already uses that room code.',
  '23514':
    'Check the room code (4–64 letters, numbers, - or _) and the duration (5–600 minutes).',
}

export async function createSession(draft: SessionDraft) {
  const row: Insert<'classroom_sessions'> = draft
  const { data, error } = await plannedDb
    .from('classroom_sessions')
    .insert(row)
    .select()
    .single()
  if (error) raise(error, 'Couldn’t create the class.', SESSION_MESSAGES)
  return data
}

export async function updateSession(id: string, draft: SessionDraft) {
  const { data, error } = await plannedDb
    .from('classroom_sessions')
    .update(draft)
    .eq('id', id)
    .select()
    .single()
  if (error) raise(error, 'Couldn’t save the class.', SESSION_MESSAGES)
  return data
}

export async function deleteSession(id: string) {
  const { error } = await plannedDb
    .from('classroom_sessions')
    .delete()
    .eq('id', id)
  if (error) raise(error, 'Couldn’t delete the class.')
}

/** An 8-digit room code, like the ones class links already use. */
export function newRoomCode() {
  const [value = 0] = crypto.getRandomValues(new Uint32Array(1))
  return String(10_000_000 + (value % 90_000_000))
}

// ---------------------------------------------------------------------------
// Roster
// ---------------------------------------------------------------------------

export async function listRoster(sessionId: string) {
  const { data, error } = await plannedDb
    .from('classroom_session_students')
    .select('*')
    .eq('session_id', sessionId)
    .order('position')
    .order('created_at')
  if (error) raise(error, 'Couldn’t load the students.')
  return data
}

export type RosterDraft = Pick<
  RosterRow,
  | 'student_id'
  | 'lead_id'
  | 'display_name'
  | 'grade'
  | 'student_code'
  | 'phone'
  | 'email'
  | 'country'
  | 'city'
  | 'time_zone'
  | 'language'
  | 'source'
  | 'interests'
  | 'special_requirement'
>

const ROSTER_MESSAGES = {
  '23505': 'That student is already in this class.',
}

export async function addRosterRow(
  sessionId: string,
  draft: RosterDraft,
  position: number,
) {
  const row: Insert<'classroom_session_students'> = {
    ...draft,
    session_id: sessionId,
    position,
  }
  const { error } = await plannedDb
    .from('classroom_session_students')
    .insert(row)
  if (error) raise(error, 'Couldn’t add the student.', ROSTER_MESSAGES)
}

export async function updateRosterRow(id: string, draft: RosterDraft) {
  const { error } = await plannedDb
    .from('classroom_session_students')
    .update(draft)
    .eq('id', id)
  if (error) raise(error, 'Couldn’t save the student.', ROSTER_MESSAGES)
}

export async function removeRosterRow(id: string) {
  const { error } = await plannedDb
    .from('classroom_session_students')
    .delete()
    .eq('id', id)
  if (error) raise(error, 'Couldn’t remove the student.')
}

// ---------------------------------------------------------------------------
// What happened in class
// ---------------------------------------------------------------------------

export type RecordingSummary = {
  id: string
  title: string
  recording_url: string
  created_at: string | null
}

export type SessionActivity = {
  awards: AwardRow[]
  projects: ProjectRow[]
  alerts: AlertRow[]
  recordings: RecordingSummary[]
}

export async function loadSessionActivity(
  sessionId: string,
): Promise<SessionActivity> {
  const [awards, projects, alerts, recordings] = await Promise.all([
    plannedDb
      .from('classroom_badge_awards')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false }),
    plannedDb
      .from('classroom_project_submissions')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false }),
    plannedDb
      .from('classroom_alerts')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false }),
    plannedDb
      .from('class_recordings')
      .select('id, title, recording_url, created_at')
      .eq('classroom_session_id', sessionId)
      .order('created_at', { ascending: false }),
  ])
  if (awards.error) raise(awards.error, 'Couldn’t load the badges given.')
  if (projects.error) raise(projects.error, 'Couldn’t load the projects.')
  if (alerts.error) raise(alerts.error, 'Couldn’t load the alerts.')
  if (recordings.error) raise(recordings.error, 'Couldn’t load recordings.')
  return {
    awards: awards.data,
    projects: projects.data,
    alerts: alerts.data,
    recordings: recordings.data,
  }
}

export async function resolveAlert(id: string) {
  const { data: auth } = await supabase.auth.getUser()
  const { error } = await plannedDb
    .from('classroom_alerts')
    .update({
      resolved_at: new Date().toISOString(),
      resolved_by: auth.user?.id ?? null,
    })
    .eq('id', id)
  if (error) raise(error, 'Couldn’t resolve the alert.')
}

// ---------------------------------------------------------------------------
// Lesson materials and their activities
// ---------------------------------------------------------------------------

export async function listMaterials() {
  const { data, error } = await plannedDb
    .from('classroom_materials')
    .select('*')
    .order('title')
  if (error) raise(error, 'Couldn’t load the lesson materials.')
  return data
}

export async function listActivities(materialId: string) {
  const { data, error } = await plannedDb
    .from('classroom_activities')
    .select('*')
    .eq('material_id', materialId)
    .order('position')
  if (error) raise(error, 'Couldn’t load the activities.')
  return data
}

export type MaterialDraft = Pick<
  MaterialRow,
  | 'title'
  | 'course_id'
  | 'outline'
  | 'outcomes'
  | 'agenda'
  | 'agenda_warning_title'
  | 'agenda_warning_body'
  | 'links'
  | 'is_active'
>

export type ActivityDraft = {
  /** null for an activity added in this edit. */
  id: string | null
  title: string
  outline: string
  project_url: string | null
}

const ACTIVITY_MESSAGES = {
  '23514': 'Project links must start with http:// or https://.',
}

/**
 * Saves the material, then makes its activities match the list given (in
 * that order): removed ones are deleted, the rest updated or added.
 */
export async function saveMaterial(
  id: string | null,
  draft: MaterialDraft,
  activities: ActivityDraft[],
): Promise<string> {
  let materialId = id
  if (materialId) {
    const { error } = await plannedDb
      .from('classroom_materials')
      .update(draft)
      .eq('id', materialId)
    if (error) raise(error, 'Couldn’t save the material.')
  } else {
    const row: Insert<'classroom_materials'> = draft
    const { data, error } = await plannedDb
      .from('classroom_materials')
      .insert(row)
      .select('id')
      .single()
    if (error) raise(error, 'Couldn’t create the material.')
    materialId = data.id
  }

  const keep = activities
    .map((activity) => activity.id)
    .filter((value): value is string => !!value)
  let removal = plannedDb
    .from('classroom_activities')
    .delete()
    .eq('material_id', materialId)
  if (keep.length) removal = removal.not('id', 'in', `(${keep.join(',')})`)
  const removed = await removal
  if (removed.error) raise(removed.error, 'Couldn’t update the activities.')

  const target = materialId
  const results = await Promise.all(
    activities.map((activity, position) => {
      const fields = {
        title: activity.title,
        outline: activity.outline,
        project_url: activity.project_url,
        position,
      }
      return activity.id
        ? plannedDb
            .from('classroom_activities')
            .update(fields)
            .eq('id', activity.id)
        : plannedDb
            .from('classroom_activities')
            .insert({ ...fields, material_id: target })
    }),
  )
  const failed = results.find((result) => result.error)
  if (failed?.error) {
    raise(failed.error, 'Couldn’t save the activities.', ACTIVITY_MESSAGES)
  }
  return target
}

export async function deleteMaterial(id: string) {
  const { error } = await plannedDb
    .from('classroom_materials')
    .delete()
    .eq('id', id)
  if (error) raise(error, 'Couldn’t delete the material.')
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

export async function listBadges() {
  const { data, error } = await plannedDb
    .from('classroom_badges')
    .select('*')
    .order('position')
    .order('name')
  if (error) raise(error, 'Couldn’t load the badges.')
  return data
}

export type BadgeDraft = Pick<
  BadgeRow,
  'slug' | 'name' | 'icon' | 'ornament' | 'position' | 'is_active'
>

const BADGE_MESSAGES = {
  '23505': 'Another badge already uses that short name.',
  '23503':
    'Students have been given this badge, so it can’t be deleted. Turn off “Show in class” instead.',
}

export async function saveBadge(id: string | null, draft: BadgeDraft) {
  if (id) {
    const { error } = await plannedDb
      .from('classroom_badges')
      .update(draft)
      .eq('id', id)
    if (error) raise(error, 'Couldn’t save the badge.', BADGE_MESSAGES)
    return
  }
  const row: Insert<'classroom_badges'> = draft
  const { error } = await plannedDb.from('classroom_badges').insert(row)
  if (error) raise(error, 'Couldn’t add the badge.', BADGE_MESSAGES)
}

export async function deleteBadge(id: string) {
  const { error } = await plannedDb
    .from('classroom_badges')
    .delete()
    .eq('id', id)
  if (error) raise(error, 'Couldn’t delete the badge.', BADGE_MESSAGES)
}

// ---------------------------------------------------------------------------
// Lookups from the rest of the app
// ---------------------------------------------------------------------------

export type Person = {
  id: string
  name: string
  email: string
  role: string | null
}

const TEACHING_ROLES = new Set([
  'tutor',
  'owner',
  'operations_admin',
  'tech_admin',
])

export const canTeach = (person: Person) =>
  !!person.role && TEACHING_ROLES.has(person.role)

/** Students and staff, for the tutor and roster pickers. */
export async function listPeople(): Promise<Person[]> {
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, email, role')
    .in('role', ['student', 'tutor', 'owner', 'operations_admin', 'tech_admin'])
    .order('full_name')
  if (error) throw new Error(error.message || 'Couldn’t load users.')
  return data.map((user) => ({
    id: user.id,
    name: user.full_name || user.email,
    email: user.email,
    role: user.role,
  }))
}

export type LeadOption = {
  id: string
  student_name: string | null
  parent_name: string | null
  grade: string | null
  phone: string | null
  email: string | null
  country: string | null
  lead_source: string | null
  student_user_id: string | null
}

/** Recent trial leads, for booking a trial student into a class. */
export async function listLeads(): Promise<LeadOption[]> {
  const { data, error } = await supabase
    .from('leads')
    .select(
      'id, student_name, parent_name, grade, phone, email, country, lead_source, student_user_id',
    )
    .order('created_at', { ascending: false })
    .limit(300)
  if (error) throw new Error(error.message || 'Couldn’t load leads.')
  return data
}

export async function listCourses() {
  const { data, error } = await supabase
    .from('courses')
    .select('id, title')
    .order('title')
  if (error) throw new Error(error.message || 'Couldn’t load courses.')
  return data
}
