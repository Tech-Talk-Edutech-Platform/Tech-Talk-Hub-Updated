import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ExternalLink, Loader2, Save } from 'lucide-react'
import { toast } from 'react-hot-toast'

import { getErrorMessage } from '../../../../lib/getErrorMessage'
import {
  examFileUrl,
  isQuestionType,
  markAttempt,
  QUESTION_TYPE_LABEL,
  type ExamQuestion,
  type Submission,
} from '../../../../features/exams/examsApi'
import { examInputClass, examLabelClass } from './examStyles'

type AttemptMarkingProps = {
  submission: Submission
  questions: ExamQuestion[]
  onSaved: () => void
  onClose: () => void
}

/** One student's answers beside each question, with marks and feedback. */
export function AttemptMarking({
  submission,
  questions,
  onSaved,
  onClose,
}: AttemptMarkingProps) {
  const answerFor = (questionId: string) =>
    submission.answers.find((answer) => answer.question_id === questionId)

  const [marks, setMarks] = useState<Record<string, string>>(() => {
    const start: Record<string, string> = {}
    for (const question of questions) {
      const awarded = answerFor(question.id)?.marks_awarded
      start[question.id] =
        awarded === null || awarded === undefined ? '' : String(awarded)
    }
    return start
  })
  const [feedback, setFeedback] = useState(submission.feedback ?? '')

  const save = useMutation({
    mutationFn: () => {
      const numbers: Record<string, number> = {}
      for (const [questionId, value] of Object.entries(marks)) {
        if (value.trim() !== '') numbers[questionId] = Number(value)
      }
      return markAttempt(submission.id, numbers, feedback)
    },
    onSuccess: (score) => {
      toast.success(`Marks saved: ${score} in total.`)
      onSaved()
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Couldn’t save the marks.')),
  })

  const openFile = useMutation({
    mutationFn: examFileUrl,
    onSuccess: (url) => window.open(url, '_blank', 'noopener,noreferrer'),
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Couldn’t open the file.')),
  })

  const invalid = questions.some((question) => {
    const value = marks[question.id] ?? ''
    if (value.trim() === '') return false
    const number = Number(value)
    return Number.isNaN(number) || number < 0 || number > (question.marks ?? 1)
  })
  const unmarked = questions.filter(
    (question) => (marks[question.id] ?? '').trim() === '',
  ).length
  const runningTotal = Object.values(marks).reduce(
    (sum, value) => sum + (Number(value) || 0),
    0,
  )
  const outOf = questions.reduce((sum, q) => sum + (q.marks ?? 1), 0)

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!invalid && !save.isPending) save.mutate()
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-3xl border border-indigo-200 bg-white p-5 dark:border-indigo-500/30 dark:bg-white/5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-black text-slate-900 dark:text-white">
            Marking: {submission.student?.full_name ?? 'Student'}
          </h3>
          <p className="text-xs text-slate-500">
            Multiple-choice answers are marked already; check them or change
            them.
          </p>
        </div>
        <p className="text-lg font-black text-slate-900 tabular-nums dark:text-white">
          {runningTotal}
          <span className="text-sm text-slate-400">/{outOf}</span>
        </p>
      </div>

      <ol className="space-y-3">
        {questions.map((question, index) => {
          const answer = answerFor(question.id)
          const max = question.marks ?? 1
          const value = marks[question.id] ?? ''
          const number = Number(value)
          const bad =
            value.trim() !== '' &&
            (Number.isNaN(number) || number < 0 || number > max)
          return (
            <li
              key={question.id}
              className="rounded-2xl border border-slate-100 p-4 dark:border-white/10"
            >
              <p className="text-[10px] font-black tracking-wider text-indigo-600 uppercase dark:text-indigo-400">
                Q{index + 1} ·{' '}
                {isQuestionType(question.type)
                  ? QUESTION_TYPE_LABEL[question.type]
                  : 'Question'}
              </p>
              <p className="mt-1 text-sm font-semibold whitespace-pre-wrap text-slate-800 dark:text-slate-100">
                {question.question_text}
              </p>

              <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-white/5">
                <p className="mb-1 text-[10px] font-black tracking-wider text-slate-400 uppercase">
                  Their answer
                </p>
                {!answer || (answer.answer === '' && !answer.file_path) ? (
                  <p className="text-slate-400 italic">No answer</p>
                ) : question.type === 'file' && answer.file_path ? (
                  <button
                    type="button"
                    onClick={() => openFile.mutate(answer.file_path ?? '')}
                    disabled={openFile.isPending}
                    className="inline-flex items-center gap-1.5 font-bold text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    <ExternalLink size={14} aria-hidden="true" />
                    {answer.answer || 'Open the uploaded file'}
                  </button>
                ) : (
                  <p
                    className={`whitespace-pre-wrap text-slate-800 dark:text-slate-100 ${question.type === 'debug' ? 'font-mono text-xs' : ''}`}
                  >
                    {answer.answer}
                  </p>
                )}
                {question.type === 'mcq' && (
                  <p className="mt-2 text-xs text-slate-500">
                    Right answer:{' '}
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">
                      {question.correct_answer ?? 'not set'}
                    </span>
                  </p>
                )}
              </div>

              <div className="mt-3 flex items-center gap-2">
                <label
                  htmlFor={`mark-${submission.id}-${question.id}`}
                  className={examLabelClass}
                >
                  Marks
                </label>
                <input
                  id={`mark-${submission.id}-${question.id}`}
                  type="number"
                  min={0}
                  max={max}
                  step="0.5"
                  value={value}
                  onChange={(event) =>
                    setMarks((current) => ({
                      ...current,
                      [question.id]: event.target.value,
                    }))
                  }
                  aria-invalid={bad}
                  className={`${examInputClass} mt-0 w-24`}
                />
                <span className="text-sm text-slate-500">/ {max}</span>
              </div>
            </li>
          )
        })}
      </ol>

      <div>
        <label htmlFor={`feedback-${submission.id}`} className={examLabelClass}>
          Feedback for the student (shown with the result)
        </label>
        <textarea
          id={`feedback-${submission.id}`}
          rows={3}
          value={feedback}
          onChange={(event) => setFeedback(event.target.value)}
          className={examInputClass}
        />
      </div>

      {invalid && (
        <p role="alert" className="text-sm font-semibold text-red-600">
          Marks must be between 0 and each question’s maximum.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3">
        {unmarked > 0 && (
          <p className="mr-auto text-xs text-slate-500">
            {unmarked} {unmarked === 1 ? 'question has' : 'questions have'} no
            marks yet (they count as 0).
          </p>
        )}
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
        >
          Close
        </button>
        <button
          type="submit"
          disabled={invalid || save.isPending}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {save.isPending ? (
            <Loader2 size={14} className="animate-spin" aria-hidden="true" />
          ) : (
            <Save size={14} aria-hidden="true" />
          )}
          Save marks
        </button>
      </div>
    </form>
  )
}
