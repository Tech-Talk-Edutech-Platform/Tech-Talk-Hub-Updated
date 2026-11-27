import type { AdminExam } from '../../../../features/exams/examsApi'

/** Numbers about an exam from its embedded counts and attempts. */
export function examCounts(exam: AdminExam) {
  const attempts = exam.attempts
  return {
    questions: exam.questions.at(0)?.count ?? 0,
    named: exam.exam_students.at(0)?.count ?? 0,
    attempts: attempts.length,
    handedIn: attempts.filter((attempt) => attempt.end_time).length,
    toMark: attempts.filter((attempt) => attempt.end_time && !attempt.marked_at)
      .length,
  }
}
