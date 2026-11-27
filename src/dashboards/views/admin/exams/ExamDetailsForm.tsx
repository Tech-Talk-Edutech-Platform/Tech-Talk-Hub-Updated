import { useState } from 'react'
import type { FormEvent } from 'react'
import { Loader2, Save } from 'lucide-react'

import type {
  CourseOption,
  ExamDetails,
} from '../../../../features/exams/examsApi'
import { examInputClass, examLabelClass } from './examStyles'

type ExamDetailsFormProps = {
  initial?: ExamDetails
  courses: CourseOption[]
  submitLabel: string
  pending: boolean
  onSubmit: (details: ExamDetails) => void
  onCancel?: () => void
}

/** An ISO time as a datetime-local value, in this device's time zone. */
function toLocalInput(iso: string | null | undefined) {
  if (!iso) return ''
  const date = new Date(iso)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function fromLocalInput(value: string) {
  return value ? new Date(value).toISOString() : null
}

/** Title, instructions, length, course and when the exam can be sat. */
export function ExamDetailsForm({
  initial,
  courses,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: ExamDetailsFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [duration, setDuration] = useState(
    String(initial?.durationMinutes ?? 45),
  )
  const [courseId, setCourseId] = useState(initial?.courseId ?? '')
  const [opensAt, setOpensAt] = useState(toLocalInput(initial?.opensAt))
  const [closesAt, setClosesAt] = useState(toLocalInput(initial?.closesAt))

  const minutes = Number(duration)
  const durationOk = Number.isInteger(minutes) && minutes >= 1 && minutes <= 600
  const windowOk = !opensAt || !closesAt || closesAt > opensAt
  const ready = title.trim() !== '' && durationOk && windowOk

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!ready || pending) return
    onSubmit({
      title: title.trim(),
      description: description.trim() || null,
      durationMinutes: minutes,
      courseId: courseId || null,
      opensAt: fromLocalInput(opensAt),
      closesAt: fromLocalInput(closesAt),
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="exam-title" className={examLabelClass}>
          Exam title
        </label>
        <input
          id="exam-title"
          required
          maxLength={200}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g. Python basics: end of term"
          className={examInputClass}
        />
      </div>
      <div>
        <label htmlFor="exam-description" className={examLabelClass}>
          Instructions for students (optional)
        </label>
        <textarea
          id="exam-description"
          rows={3}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="What to bring, what's allowed, how it's marked…"
          className={examInputClass}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="exam-duration" className={examLabelClass}>
            Time allowed (minutes)
          </label>
          <input
            id="exam-duration"
            type="number"
            min={1}
            max={600}
            required
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
            aria-invalid={!durationOk}
            className={examInputClass}
          />
        </div>
        <div>
          <label htmlFor="exam-course" className={examLabelClass}>
            Course
          </label>
          <select
            id="exam-course"
            value={courseId}
            onChange={(event) => setCourseId(event.target.value)}
            className={examInputClass}
          >
            <option value="">No course (pick students by name)</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="exam-opens" className={examLabelClass}>
            Opens (optional)
          </label>
          <input
            id="exam-opens"
            type="datetime-local"
            value={opensAt}
            onChange={(event) => setOpensAt(event.target.value)}
            className={examInputClass}
          />
        </div>
        <div>
          <label htmlFor="exam-closes" className={examLabelClass}>
            Closes (optional)
          </label>
          <input
            id="exam-closes"
            type="datetime-local"
            value={closesAt}
            onChange={(event) => setClosesAt(event.target.value)}
            aria-invalid={!windowOk}
            aria-describedby="exam-window-hint"
            className={examInputClass}
          />
        </div>
      </div>
      <p
        id="exam-window-hint"
        className={`text-xs ${windowOk ? 'text-slate-400' : 'font-semibold text-red-600'}`}
      >
        {windowOk
          ? 'Times are in your time zone. Students can start any time between them; once started, they have the time allowed (or until it closes).'
          : 'The closing time must be after the opening time.'}
      </p>
      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={!ready || pending}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? (
            <Loader2 size={14} className="animate-spin" aria-hidden="true" />
          ) : (
            <Save size={14} aria-hidden="true" />
          )}
          {pending ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
