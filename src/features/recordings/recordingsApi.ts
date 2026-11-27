import { supabase } from '../../supabase'
import type { Tables } from '../../types/database'
import { isAdminRole, type AppRole } from '../../types/roles'

/** Private bucket for classroom recordings and uploaded video files. */
export const RECORDINGS_BUCKET = 'class-recordings'
/** Recordings are deleted this many months after they're made. */
export const RECORDING_RETENTION_MONTHS = 3
/** Video types the bucket accepts (migration 20261127130000). */
export const RECORDING_FILE_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
]

export type RecordingKind = 'trial' | 'regular'

/** What the recordings library is narrowed to. */
export type RecordingFilterState = {
  search: string
  kind: RecordingKind | 'all'
  tutorId: string
  studentId: string
}

export const NO_FILTERS: RecordingFilterState = {
  search: '',
  kind: 'all',
  tutorId: '',
  studentId: '',
}

type UserName = Pick<Tables<'users'>, 'full_name'>

export type Recording = Tables<'class_recordings'> & {
  tutor: UserName | null
  student: Pick<Tables<'users'>, 'full_name' | 'assigned_course_id'> | null
  session: Pick<Tables<'classroom_sessions'>, 'trial_booking_id'> | null
}

export type PersonOption = Pick<Tables<'users'>, 'id' | 'full_name'>
export type CourseArt = Pick<
  Tables<'courses'>,
  'id' | 'title' | 'thumbnail_url'
>

export interface RecordingLibrary {
  recordings: Recording[]
  /** Students an upload can be shared with (a tutor's own, or everyone). */
  students: PersonOption[]
  tutors: PersonOption[]
  courses: CourseArt[]
  /** A student viewer's own course, for thumbnails of class recordings. */
  viewerCourseId: string | null
}

export const recordingKeys = {
  library: (userId: string, role: AppRole) =>
    ['recordings', 'library', userId, role] as const,
}

const RECORDING_SELECT = `
  *,
  tutor:users!tutor_id(full_name),
  student:users!student_id(full_name, assigned_course_id),
  session:classroom_sessions!classroom_session_id(trial_booking_id)
`

/** Trial or regular: set on uploads, otherwise taken from the class. */
export function recordingKind(recording: Recording): RecordingKind {
  if (recording.class_kind === 'trial' || recording.class_kind === 'regular') {
    return recording.class_kind
  }
  return recording.session?.trial_booking_id ? 'trial' : 'regular'
}

/** When the three-month clean-up removes this recording. */
export function recordingDeletesOn(recording: Recording): Date | null {
  if (!recording.created_at) return null
  const date = new Date(recording.created_at)
  date.setMonth(date.getMonth() + RECORDING_RETENTION_MONTHS)
  return date
}

/**
 * The recordings this person may see (row-level security decides: admins
 * get all, tutors the classes they taught, students only their own), plus
 * what the upload form and thumbnails need.
 */
export async function loadRecordingLibrary(
  userId: string,
  role: AppRole,
): Promise<RecordingLibrary> {
  const admin = isAdminRole(role)
  const student = role === 'student'

  let studentsQuery = supabase
    .from('users')
    .select('id, full_name')
    .eq('role', 'student')
    .order('full_name')
  if (!admin) studentsQuery = studentsQuery.eq('assigned_tutor_id', userId)

  const [recordings, courses, students, tutors, viewer] = await Promise.all([
    supabase
      .from('class_recordings')
      .select(RECORDING_SELECT)
      .order('created_at', { ascending: false }),
    supabase.from('courses').select('id, title, thumbnail_url'),
    student ? null : studentsQuery,
    admin
      ? supabase
          .from('users')
          .select('id, full_name')
          .in('role', ['tutor', 'owner', 'operations_admin', 'tech_admin'])
          .order('full_name')
      : null,
    student
      ? supabase
          .from('users')
          .select('assigned_course_id')
          .eq('id', userId)
          .maybeSingle()
      : null,
  ])

  if (recordings.error) throw new Error('Recordings could not be loaded.')
  return {
    recordings: recordings.data ?? [],
    courses: courses.data ?? [],
    students: students?.data ?? [],
    tutors: tutors?.data ?? [],
    viewerCourseId: viewer?.data?.assigned_course_id ?? null,
  }
}

/** Why a file can't be uploaded as a recording, or null when it's fine. */
export function recordingFileProblem(file: File): string | null {
  if (!RECORDING_FILE_TYPES.includes(file.type)) {
    return 'Choose an MP4, WebM or MOV video.'
  }
  return null
}

function uploadProblem(message: string) {
  return /maximum allowed size|too large|413/i.test(message)
    ? 'This file is bigger than the storage upload limit (50 MB on the free Supabase plan). Paste a link instead, or raise the limit in Supabase › Storage › Settings.'
    : message
}

/** Uploads a video to the private bucket; returns its storage path. */
export async function uploadRecordingFile(userId: string, file: File) {
  const problem = recordingFileProblem(file)
  if (problem) throw new Error(problem)
  const safeName = file.name.replace(/[^\w.-]+/g, '-').slice(-80)
  const path = `uploads/${userId}/${Date.now()}-${safeName}`
  const { error } = await supabase.storage
    .from(RECORDINGS_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw new Error(uploadProblem(error.message))
  return path
}

export type NewRecording = {
  title: string
  /** A web link, or the storage path from {@link uploadRecordingFile}. */
  recordingUrl: string
  thumbnailUrl: string | null
  studentId: string | null
  tutorId: string | null
  kind: RecordingKind
}

export async function addRecording(recording: NewRecording) {
  const { error } = await supabase.from('class_recordings').insert({
    title: recording.title,
    recording_url: recording.recordingUrl,
    thumbnail_url: recording.thumbnailUrl,
    student_id: recording.studentId,
    tutor_id: recording.tutorId,
    class_kind: recording.kind,
  })
  if (error) {
    // Don't leave an uploaded file behind with nothing pointing at it.
    if (!/^https?:\/\//i.test(recording.recordingUrl)) {
      await supabase.storage
        .from(RECORDINGS_BUCKET)
        .remove([recording.recordingUrl])
    }
    throw new Error(error.message)
  }
}

/** Deletes the recording and, where allowed, its stored video. */
export async function deleteRecording(recording: Recording) {
  const { error } = await supabase
    .from('class_recordings')
    .delete()
    .eq('id', recording.id)
  if (error) throw new Error(error.message)
  if (!/^https?:\/\//i.test(recording.recording_url)) {
    // Only admins may delete stored files; the clean-up job gets the rest.
    await supabase.storage
      .from(RECORDINGS_BUCKET)
      .remove([recording.recording_url])
  }
}
