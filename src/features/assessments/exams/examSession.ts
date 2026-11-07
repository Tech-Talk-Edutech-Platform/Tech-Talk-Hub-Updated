import { plannedDb } from '../../../lib/plannedDb'
import type { Json } from '../../../types/database'
import type { PlannedRow } from '../../../types/plannedTables'

export type Exam = PlannedRow<'exams'>
export type ExamQuestion = PlannedRow<'questions'>
export type ExamAttempt = PlannedRow<'attempts'>

export interface ExamSession {
  exam: Exam
  questions: ExamQuestion[]
  /** The student's open attempt; null when the exam has no questions to attempt. */
  attempt: ExamAttempt | null
  /** Answers already saved on the open attempt, by question id. */
  answers: Record<string, string | undefined>
}

/**
 * Loads an exam for a student and resumes their unfinished attempt, or starts
 * a new one.
 */
export async function loadExamSession(
  examId: string,
  studentId: string,
): Promise<ExamSession> {
  const { data: exam, error: examErr } = await plannedDb
    .from('exams')
    .select('*')
    .eq('id', examId)
    .single()

  if (examErr) throw new Error('Exam context could not be located.')

  const { data: questions, error: qErr } = await plannedDb
    .from('questions')
    .select('*')
    .eq('exam_id', exam.id)

  if (qErr) throw qErr
  if (questions.length === 0) {
    return { exam, questions, attempt: null, answers: {} }
  }

  const { data: openAttempts, error: attemptErr } = await plannedDb
    .from('attempts')
    .select('*')
    .eq('exam_id', exam.id)
    .eq('student_id', studentId)
    .is('end_time', null)
    .order('start_time', { ascending: false })
    .limit(1)

  if (attemptErr) throw attemptErr

  const openAttempt = openAttempts.at(0)
  if (!openAttempt) {
    const { data: newAttempt, error: createErr } = await plannedDb
      .from('attempts')
      .insert({
        exam_id: exam.id,
        student_id: studentId,
        start_time: new Date().toISOString(),
      })
      .select()
      .single()

    if (createErr) throw createErr
    return { exam, questions, attempt: newAttempt, answers: {} }
  }

  const answers: Record<string, string | undefined> = {}
  const { data: savedAnswers, error: answersErr } = await plannedDb
    .from('answers')
    .select('question_id, answer')
    .eq('attempt_id', openAttempt.id)

  if (!answersErr) {
    for (const row of savedAnswers) answers[row.question_id] = row.answer
  }

  return { exam, questions, attempt: openAttempt, answers }
}

/** Saves (or replaces) a student's answer to one question. */
export async function saveExamAnswer(
  attemptId: string,
  questionId: string,
  answer: string,
): Promise<void> {
  const { error } = await plannedDb
    .from('answers')
    .upsert(
      { attempt_id: attemptId, question_id: questionId, answer },
      { onConflict: 'attempt_id,question_id' },
    )

  if (error) throw error
}

/**
 * Marks the saved multiple-choice answers, records the score and closes the
 * attempt. Returns the score.
 */
export async function submitExamAttempt(
  attemptId: string,
  questions: ExamQuestion[],
): Promise<number> {
  const { data: savedAnswers } = await plannedDb
    .from('answers')
    .select('*')
    .eq('attempt_id', attemptId)

  let score = 0
  for (const savedAns of savedAnswers ?? []) {
    const matchingQuestion = questions.find(
      (q) => q.id === savedAns.question_id,
    )
    if (
      matchingQuestion?.type === 'mcq' &&
      savedAns.answer === matchingQuestion.correct_answer
    ) {
      score += matchingQuestion.marks || 1
    }
  }

  const { error } = await plannedDb
    .from('attempts')
    .update({ score, end_time: new Date().toISOString() })
    .eq('id', attemptId)

  if (error) throw error
  return score
}

/** The builder's options, keyed by letter ({ A, B, C, D }). */
export function letteredOptions(options: Json | null): Record<string, string> {
  const result: Record<string, string> = {}
  if (options === null || typeof options !== 'object') return result

  const entries = Array.isArray(options)
    ? options.map((value, index) => [String.fromCodePoint(65 + index), value])
    : Object.entries(options)

  for (const [key, value] of entries) {
    if (typeof key === 'string' && typeof value === 'string') {
      result[key] = value
    }
  }
  return result
}

/** A question's answer choices in order, skipping blank ones. */
export function examOptions(options: Json | null): string[] {
  return Object.entries(letteredOptions(options))
    .toSorted(([a], [b]) => a.localeCompare(b))
    .map(([, value]) => value)
    .filter((value) => value !== '')
}
