import { supabase } from '../../supabase'
import { DataError } from '../../lib/loadErrors'
import type { Json, Tables } from '../../types/database'

/*
 * Exams (migration 20261127150000_exams.sql). Admins work on the tables
 * directly (row-level security lets only them in). Students only call the
 * database functions, which hide the answer key and unpublished scores.
 */

export const EXAM_UPLOADS_BUCKET = 'exam-uploads'
export const MAX_EXAM_FILE_BYTES = 20 * 1024 * 1024
export const EXAM_FILE_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

export type ExamStatus = 'draft' | 'published' | 'closed'
export type QuestionType = 'mcq' | 'short' | 'debug' | 'file'

export const QUESTION_TYPES: readonly QuestionType[] = [
  'mcq',
  'short',
  'debug',
  'file',
]

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  mcq: 'Multiple choice',
  short: 'Written answer',
  debug: 'Code',
  file: 'File upload',
}

export const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const

export const examKeys = {
  all: ['exams'] as const,
  adminList: () => ['exams', 'admin', 'list'] as const,
  questions: (examId: string) =>
    ['exams', 'admin', 'questions', examId] as const,
  students: (examId: string) => ['exams', 'admin', 'students', examId] as const,
  submissions: (examId: string) =>
    ['exams', 'admin', 'submissions', examId] as const,
  people: () => ['exams', 'admin', 'people'] as const,
  mine: (userId: string) => ['exams', 'mine', userId] as const,
}

export type Exam = Tables<'exams'>
export type ExamQuestion = Tables<'questions'>

/**
 * "How a database error should read", with a hint when exams aren't set up.
 * Keeps the status and code, so error cards can say "404 Not Found" rather
 * than a generic "couldn't load".
 */
function examError(error: { message: string; code?: string }) {
  const code = error.code || null
  if (code === '42P01' || code === 'PGRST202' || code === 'PGRST205') {
    return new DataError(
      'Exams aren’t set up on the database yet. Ask an admin to run the exams migration.',
      { status: 404, code },
    )
  }
  return new DataError(error.message, { code })
}

export function isQuestionType(value: unknown): value is QuestionType {
  return QUESTION_TYPES.some((type) => type === value)
}

/** A question's choices by letter ({ A, B, C, D }), from either stored shape. */
export function letteredOptions(options: Json | null): Record<string, string> {
  const result: Record<string, string> = {}
  if (options === null || typeof options !== 'object') return result
  const entries = Array.isArray(options)
    ? options.map((value, index) => [String.fromCodePoint(65 + index), value])
    : Object.entries(options)
  for (const [key, value] of entries) {
    if (typeof key === 'string' && typeof value === 'string')
      result[key] = value
  }
  return result
}

/** A question's non-empty choices in letter order. */
export function examOptions(options: Json | null): string[] {
  return Object.entries(letteredOptions(options))
    .toSorted(([a], [b]) => a.localeCompare(b))
    .map(([, value]) => value)
    .filter((value) => value.trim() !== '')
}

// ── Admin ──────────────────────────────────────────────────────────────────

const ADMIN_EXAM_SELECT =
  '*, course:courses!exams_course_id_fkey(id, title), questions(count), exam_students(count), attempts(id, end_time, marked_at)'

export async function listAdminExams() {
  const { data, error } = await supabase
    .from('exams')
    .select(ADMIN_EXAM_SELECT)
    .order('created_at', { ascending: false })
  if (error) throw examError(error)
  return data
}

export type AdminExam = Awaited<ReturnType<typeof listAdminExams>>[number]

export type ExamDetails = {
  title: string
  description: string | null
  durationMinutes: number
  courseId: string | null
  opensAt: string | null
  closesAt: string | null
}

export async function createExam(details: ExamDetails, userId: string) {
  const { data, error } = await supabase
    .from('exams')
    .insert({
      title: details.title,
      description: details.description,
      duration_minutes: details.durationMinutes,
      course_id: details.courseId,
      opens_at: details.opensAt,
      closes_at: details.closesAt,
      created_by: userId,
    })
    .select('id')
    .single()
  if (error) throw examError(error)
  return data.id
}

export async function updateExam(
  examId: string,
  changes: Partial<ExamDetails> & {
    status?: ExamStatus
    resultsPublished?: boolean
  },
) {
  const { error } = await supabase
    .from('exams')
    .update({
      ...(changes.title === undefined ? {} : { title: changes.title }),
      ...(changes.description === undefined
        ? {}
        : { description: changes.description }),
      ...(changes.durationMinutes === undefined
        ? {}
        : { duration_minutes: changes.durationMinutes }),
      ...(changes.courseId === undefined
        ? {}
        : { course_id: changes.courseId }),
      ...(changes.opensAt === undefined ? {} : { opens_at: changes.opensAt }),
      ...(changes.closesAt === undefined
        ? {}
        : { closes_at: changes.closesAt }),
      ...(changes.status === undefined ? {} : { status: changes.status }),
      ...(changes.resultsPublished === undefined
        ? {}
        : { results_published: changes.resultsPublished }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', examId)
  if (error) throw examError(error)
}

export async function deleteExam(examId: string) {
  const { error } = await supabase.from('exams').delete().eq('id', examId)
  if (error) throw examError(error)
}

export async function listQuestions(examId: string) {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('exam_id', examId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw examError(error)
  return data
}

export type QuestionDraft = {
  id?: string
  examId: string
  text: string
  type: QuestionType
  options: Record<string, string>
  correctAnswer: string | null
  marks: number
  position: number
}

export async function saveQuestion(draft: QuestionDraft) {
  const row = {
    exam_id: draft.examId,
    question_text: draft.text,
    type: draft.type,
    options: draft.type === 'mcq' ? draft.options : null,
    correct_answer: draft.type === 'mcq' ? draft.correctAnswer : null,
    marks: draft.marks,
    position: draft.position,
  }
  const { error } = draft.id
    ? await supabase.from('questions').update(row).eq('id', draft.id)
    : await supabase.from('questions').insert(row)
  if (error) throw examError(error)
}

export async function deleteQuestion(questionId: string) {
  const { error } = await supabase
    .from('questions')
    .delete()
    .eq('id', questionId)
  if (error) throw examError(error)
}

export type ExamPerson = {
  id: string
  full_name: string
  email: string
  assigned_course_id: string | null
}

export type CourseOption = { id: string; title: string }

/** Every student and course, for picking who an exam is for. */
export async function loadExamPeople() {
  const [students, courses] = await Promise.all([
    supabase
      .from('users')
      .select('id, full_name, email, assigned_course_id')
      .eq('role', 'student')
      .order('full_name'),
    supabase.from('courses').select('id, title').order('title'),
  ])
  if (students.error) throw examError(students.error)
  if (courses.error) throw examError(courses.error)
  return {
    students: students.data satisfies ExamPerson[],
    courses: courses.data satisfies CourseOption[],
  }
}

export async function listExamStudentIds(examId: string) {
  const { data, error } = await supabase
    .from('exam_students')
    .select('student_id')
    .eq('exam_id', examId)
  if (error) throw examError(error)
  return data.map((row) => row.student_id)
}

/** Makes the exam's named students exactly `studentIds`. */
export async function setExamStudents(
  examId: string,
  before: string[],
  studentIds: string[],
) {
  const added = studentIds.filter((id) => !before.includes(id))
  const removed = before.filter((id) => !studentIds.includes(id))
  if (added.length > 0) {
    const { error } = await supabase
      .from('exam_students')
      .insert(added.map((student_id) => ({ exam_id: examId, student_id })))
    if (error) throw examError(error)
  }
  if (removed.length > 0) {
    const { error } = await supabase
      .from('exam_students')
      .delete()
      .eq('exam_id', examId)
      .in('student_id', removed)
    if (error) throw examError(error)
  }
}

export async function listSubmissions(examId: string) {
  const { data, error } = await supabase
    .from('attempts')
    .select(
      '*, student:users!attempts_student_id_fkey(full_name, email), answers(*)',
    )
    .eq('exam_id', examId)
    .order('start_time', { ascending: false })
  if (error) throw examError(error)
  return data
}

export type Submission = Awaited<ReturnType<typeof listSubmissions>>[number]

export async function markAttempt(
  attemptId: string,
  marks: Record<string, number>,
  feedback: string,
) {
  const { data, error } = await supabase.rpc('mark_exam_attempt', {
    p_attempt_id: attemptId,
    p_marks: marks,
    p_feedback: feedback,
  })
  if (error) throw examError(error)
  return data
}

/** A short-lived link to an uploaded answer. */
export async function examFileUrl(path: string) {
  const { data, error } = await supabase.storage
    .from(EXAM_UPLOADS_BUCKET)
    .createSignedUrl(path, 10 * 60)
  if (error) throw new Error(error.message)
  return data.signedUrl
}

// ── Student ────────────────────────────────────────────────────────────────

export async function loadMyExams() {
  const { data, error } = await supabase.rpc('my_exams')
  if (error) throw examError(error)
  return data
}

export type MyExam = Awaited<ReturnType<typeof loadMyExams>>[number]

export type SittingQuestion = {
  id: string
  question_text: string
  type: QuestionType
  options: Json | null
  marks: number
}

export type ExamSitting = {
  exam: {
    id: string
    title: string
    description: string | null
    duration_minutes: number
  }
  attempt: {
    id: string
    start_time: string
    end_time: string | null
    deadline: string
  }
  /** Server clock minus this device's clock, in ms, for the countdown. */
  clockOffsetMs: number
  questions: SittingQuestion[]
  answers: Record<
    string,
    { answer: string; file_path: string | null } | undefined
  >
}

type JsonObject = { [key: string]: Json | undefined }

const isRecord = (value: Json | undefined): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const text = (value: Json | undefined) =>
  typeof value === 'string' ? value : null

function parseSitting(raw: Json, receivedAt: number): ExamSitting {
  if (!isRecord(raw) || !isRecord(raw.exam) || !isRecord(raw.attempt)) {
    throw new Error('The exam couldn’t be read. Try again.')
  }
  const { exam, attempt } = raw
  const serverTime = Date.parse(text(raw.server_time) ?? '')
  const questions = Array.isArray(raw.questions) ? raw.questions : []
  const answers: ExamSitting['answers'] = {}
  if (isRecord(raw.answers)) {
    for (const [questionId, saved] of Object.entries(raw.answers)) {
      if (isRecord(saved)) {
        answers[questionId] = {
          answer: text(saved.answer) ?? '',
          file_path: text(saved.file_path),
        }
      }
    }
  }
  return {
    exam: {
      id: text(exam.id) ?? '',
      title: text(exam.title) ?? 'Exam',
      description: text(exam.description),
      duration_minutes:
        typeof exam.duration_minutes === 'number' ? exam.duration_minutes : 0,
    },
    attempt: {
      id: text(attempt.id) ?? '',
      start_time: text(attempt.start_time) ?? '',
      end_time: text(attempt.end_time),
      deadline: text(attempt.deadline) ?? '',
    },
    clockOffsetMs: Number.isNaN(serverTime) ? 0 : serverTime - receivedAt,
    questions: questions.flatMap((question) =>
      isRecord(question)
        ? [
            {
              id: text(question.id) ?? '',
              question_text: text(question.question_text) ?? '',
              type: isQuestionType(question.type) ? question.type : 'short',
              options: question.options ?? null,
              marks: typeof question.marks === 'number' ? question.marks : 1,
            },
          ]
        : [],
    ),
    answers,
  }
}

/** Starts or resumes the exam. */
export async function startExam(examId: string) {
  const { data, error } = await supabase.rpc('start_exam', {
    p_exam_id: examId,
  })
  if (error) throw examError(error)
  return parseSitting(data, Date.now())
}

export async function saveAnswer(
  attemptId: string,
  questionId: string,
  answer: string,
  filePath?: string,
) {
  const { error } = await supabase.rpc('save_exam_answer', {
    p_attempt_id: attemptId,
    p_question_id: questionId,
    p_answer: answer,
    ...(filePath ? { p_file_path: filePath } : {}),
  })
  if (error) throw examError(error)
}

export async function submitExam(attemptId: string) {
  const { error } = await supabase.rpc('submit_exam', {
    p_attempt_id: attemptId,
  })
  if (error) throw examError(error)
}

export function examFileProblem(file: File): string | null {
  if (file.size > MAX_EXAM_FILE_BYTES) return 'Choose a file under 20 MB.'
  if (file.type && !EXAM_FILE_TYPES.includes(file.type)) {
    return 'Upload a PDF, image, Word document, text file or ZIP.'
  }
  return null
}

/** Uploads a file answer and saves it on the question. Returns its path. */
export async function uploadExamFile(
  userId: string,
  attemptId: string,
  questionId: string,
  file: File,
) {
  const problem = examFileProblem(file)
  if (problem) throw new Error(problem)
  const safeName = file.name.replace(/[^\w.-]+/g, '_').slice(-80)
  const path = `${userId}/${attemptId}/${questionId}-${Date.now()}-${safeName}`
  const { error } = await supabase.storage
    .from(EXAM_UPLOADS_BUCKET)
    .upload(path, file, { contentType: file.type || undefined, upsert: false })
  if (error) {
    throw new Error(
      /bucket not found/i.test(error.message)
        ? 'File answers aren’t set up yet. Ask an admin to run the exams migration.'
        : error.message,
    )
  }
  await saveAnswer(attemptId, questionId, file.name, path)
  return path
}

/** "45 min", "1 h 30 min" */
export function durationText(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest} min`
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}

export const examDateTime = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
})
