import { useState } from 'react'
import type { FormEvent } from 'react'
import { Loader2, Save } from 'lucide-react'

import {
  isQuestionType,
  letteredOptions,
  OPTION_LETTERS,
  QUESTION_TYPE_LABEL,
  QUESTION_TYPES,
  type ExamQuestion,
  type QuestionDraft,
  type QuestionType,
} from '../../../../features/exams/examsApi'
import { examInputClass, examLabelClass } from './examStyles'

type QuestionFormProps = {
  examId: string
  /** The question being edited; omit to add one. */
  question?: ExamQuestion
  position: number
  pending: boolean
  onSave: (draft: QuestionDraft) => void
  onCancel: () => void
}

/** Add or edit one question: its type, wording, choices, answer and marks. */
export function QuestionForm({
  examId,
  question,
  position,
  pending,
  onSave,
  onCancel,
}: QuestionFormProps) {
  const formId = question?.id ?? 'new'
  const [type, setType] = useState<QuestionType>(
    isQuestionType(question?.type) ? question.type : 'mcq',
  )
  const [text, setText] = useState(question?.question_text ?? '')
  const [options, setOptions] = useState<Record<string, string>>(() =>
    letteredOptions(question?.options ?? null),
  )
  const [correctLetter, setCorrectLetter] = useState(() => {
    const saved = letteredOptions(question?.options ?? null)
    return (
      Object.entries(saved).find(
        ([, value]) => value === question?.correct_answer,
      )?.[0] ?? ''
    )
  })
  const [marks, setMarks] = useState(String(question?.marks ?? 1))

  const filled = OPTION_LETTERS.filter(
    (letter) => (options[letter] ?? '').trim() !== '',
  )
  const marksNumber = Number(marks)
  const marksOk =
    Number.isInteger(marksNumber) && marksNumber >= 0 && marksNumber <= 100
  const mcqOk =
    type !== 'mcq' ||
    (filled.length >= 2 && filled.some((letter) => letter === correctLetter))
  const ready = text.trim() !== '' && marksOk && mcqOk

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!ready || pending) return
    const trimmed: Record<string, string> = {}
    for (const letter of OPTION_LETTERS) {
      trimmed[letter] = (options[letter] ?? '').trim()
    }
    onSave({
      id: question?.id,
      examId,
      text: text.trim(),
      type,
      options: trimmed,
      correctAnswer: type === 'mcq' ? (trimmed[correctLetter] ?? null) : null,
      marks: marksNumber,
      position,
    })
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4 dark:border-indigo-500/30 dark:bg-indigo-500/5"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_8rem]">
        <div>
          <label htmlFor={`q-type-${formId}`} className={examLabelClass}>
            Question type
          </label>
          <select
            id={`q-type-${formId}`}
            value={type}
            onChange={(event) => {
              if (isQuestionType(event.target.value))
                setType(event.target.value)
            }}
            className={examInputClass}
          >
            {QUESTION_TYPES.map((option) => (
              <option key={option} value={option}>
                {QUESTION_TYPE_LABEL[option]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`q-marks-${formId}`} className={examLabelClass}>
            Marks
          </label>
          <input
            id={`q-marks-${formId}`}
            type="number"
            min={0}
            max={100}
            value={marks}
            onChange={(event) => setMarks(event.target.value)}
            aria-invalid={!marksOk}
            className={examInputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor={`q-text-${formId}`} className={examLabelClass}>
          Question
        </label>
        <textarea
          id={`q-text-${formId}`}
          rows={type === 'debug' ? 6 : 3}
          required
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={
            type === 'debug'
              ? 'Describe the task, and paste the code to fix or finish…'
              : 'Type the question…'
          }
          className={`${examInputClass} ${type === 'debug' ? 'font-mono' : ''}`}
        />
      </div>

      {type === 'mcq' && (
        <fieldset className="space-y-2">
          <legend className={examLabelClass}>
            Choices (tick the right one)
          </legend>
          {OPTION_LETTERS.map((letter) => (
            <div key={letter} className="flex items-center gap-3">
              <input
                type="radio"
                name={`q-correct-${formId}`}
                aria-label={`Choice ${letter} is correct`}
                checked={correctLetter === letter}
                onChange={() => setCorrectLetter(letter)}
                disabled={(options[letter] ?? '').trim() === ''}
                className="h-4 w-4 accent-emerald-600"
              />
              <span className="w-5 text-sm font-black text-slate-500">
                {letter}
              </span>
              <label
                htmlFor={`q-option-${formId}-${letter}`}
                className="sr-only"
              >
                Choice {letter}
              </label>
              <input
                id={`q-option-${formId}-${letter}`}
                value={options[letter] ?? ''}
                onChange={(event) =>
                  setOptions((current) => ({
                    ...current,
                    [letter]: event.target.value,
                  }))
                }
                placeholder={letter < 'C' ? 'Required' : 'Optional'}
                className={`${examInputClass} mt-0`}
              />
            </div>
          ))}
          {!mcqOk && (
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
              Fill in at least two choices and tick the right one.
            </p>
          )}
        </fieldset>
      )}

      {type !== 'mcq' && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {type === 'file'
            ? 'Students upload a file (PDF, image, Word, text or ZIP). You mark it under Submissions.'
            : 'You mark this one by hand under Submissions.'}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-white/10"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!ready || pending}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? (
            <Loader2 size={14} className="animate-spin" aria-hidden="true" />
          ) : (
            <Save size={14} aria-hidden="true" />
          )}
          {question ? 'Save question' : 'Add question'}
        </button>
      </div>
    </form>
  )
}
