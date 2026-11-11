import { useState, type FormEvent } from 'react'
import { ChevronLeft } from 'lucide-react'
import type { Activity, Student } from '../../../types/classroom'
import { Modal } from '../ui/Modal'
import { Select } from '../ui/Select'

/** What the teacher submits; the page saves it and adds the id and time. */
export type ProjectDraft = {
  studentId: string
  /** null when the class has no activities and one was typed in. */
  activityId: string | null
  activity: string
  link: string
  note: string
}

const isUrl = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

type SubmitProjectModalProps = {
  open: boolean
  onClose: () => void
  students: Student[]
  /** The student selected in Class details; preselected here. */
  initialStudentId: string | null
  activities: Activity[]
  /** Return a promise to keep the button busy until it settles. */
  onSubmit: (project: ProjectDraft) => void | Promise<void>
}

/** Two steps: pick the activity, then the project link (docs/breakdown/07-submit-project.md). */
export function SubmitProjectModal({
  open,
  onClose,
  students,
  initialStudentId,
  activities,
  onSubmit,
}: SubmitProjectModalProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [studentId, setStudentId] = useState(
    initialStudentId ?? students[0]?.id ?? '',
  )
  const [activityId, setActivityId] = useState('')
  const [customActivity, setCustomActivity] = useState('')
  const [link, setLink] = useState('')
  const [note, setNote] = useState('')
  const [touched, setTouched] = useState(false)
  const [pending, setPending] = useState(false)

  const student = students.find((candidate) => candidate.id === studentId)
  const picked = activities.find((a) => a.id === activityId)
  const activity = activities.length
    ? picked
    : customActivity.trim()
      ? { id: null, title: customActivity.trim(), project: '' }
      : undefined
  const ready = !!student && !!activity
  const linkError =
    touched && !isUrl(link)
      ? 'Enter the full project link, starting with https://'
      : ''
  const studentOptions = students.map((candidate) => ({
    value: candidate.id,
    label: candidate.grade
      ? `${candidate.name} · ${candidate.grade}`
      : candidate.name,
  }))
  const activityOptions = activities.map((option) => ({
    value: option.id,
    label: option.title,
  }))

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setTouched(true)
    if (!student || !activity || !isUrl(link) || pending) return
    setPending(true)
    try {
      await onSubmit({
        studentId: student.id,
        activityId: activity.id,
        activity: activity.title,
        link: link.trim(),
        note: note.trim(),
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} width={512} labelledBy="submit-title">
      <h2
        id="submit-title"
        className="pr-10 text-[20px] leading-[30px] font-semibold text-ink"
      >
        {student
          ? `You are submitting this activity on behalf of ${student.name}`
          : 'Submit a project'}
      </h2>
      <p className="mt-4 text-[11.5px] font-medium text-brand">
        Step {step} of 2
      </p>

      {step === 1 || !activity || !student ? (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (ready) setStep(2)
          }}
        >
          <h3 className="mt-1 text-[17px] text-ink">
            Choose student & activity
          </h3>
          <p className="mt-0.5 text-[13px] text-ink-soft">
            Pick the student and the classroom activity you&apos;re submitting.
          </p>
          {students.length > 1 && (
            <div className="mt-8">
              <Select
                label="Select student"
                value={studentId}
                onChange={setStudentId}
                options={studentOptions}
              />
            </div>
          )}
          <div className={students.length > 1 ? 'mt-5' : 'mt-8'}>
            {activities.length ? (
              <Select
                label="Select activity"
                value={activityId}
                onChange={setActivityId}
                options={activityOptions}
              />
            ) : (
              <>
                <label
                  htmlFor="project-activity"
                  className="mb-2 block text-[15px] font-medium text-ink"
                >
                  Activity name
                </label>
                <input
                  id="project-activity"
                  value={customActivity}
                  onChange={(event) => setCustomActivity(event.target.value)}
                  placeholder="What did they build?"
                  className="h-10 w-full rounded-[8px] border border-line-strong px-2.5 text-[15px] text-ink outline-none placeholder:text-faint focus:border-brand"
                />
              </>
            )}
          </div>
          <div className="mt-10 flex justify-end">
            <button
              type="submit"
              disabled={!ready}
              className="press h-10 w-[147px] rounded-[8px] bg-brand text-[15px] font-medium text-white hover:bg-brand-strong disabled:bg-brand-faded"
            >
              Continue
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={(event) => void submit(event)} noValidate>
          <h3 className="mt-1 text-[17px] text-ink">Add the project</h3>
          <p className="mt-0.5 text-[13px] text-ink-soft">
            {activity.title} · paste the link to {student.name}&apos;s saved
            project.
          </p>

          <label
            htmlFor="project-link"
            className="mt-8 mb-2 block text-[15px] font-medium text-ink"
          >
            Project link
          </label>
          <input
            id="project-link"
            type="url"
            inputMode="url"
            // oxlint-disable-next-line jsx-a11y/no-autofocus -- step 2 exists only to take this link
            autoFocus
            value={link}
            onChange={(event) => setLink(event.target.value)}
            onBlur={() => setTouched(true)}
            placeholder={activity.project || 'https://'}
            aria-invalid={!!linkError}
            aria-describedby={linkError ? 'project-link-error' : undefined}
            className={`h-10 w-full rounded-[8px] border px-2.5 text-[15px] text-ink outline-none placeholder:text-faint focus:border-brand ${
              linkError ? 'border-danger' : 'border-line-strong'
            }`}
          />
          {linkError && (
            <p
              id="project-link-error"
              className="mt-1.5 text-[13px] text-danger-ink"
            >
              {linkError}
            </p>
          )}

          <label
            htmlFor="project-note"
            className="mt-5 mb-2 block text-[15px] font-medium text-ink"
          >
            Note for the student{' '}
            <span className="font-normal text-muted">(optional)</span>
          </label>
          <textarea
            id="project-note"
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="What went well, what to try next"
            className="w-full resize-none rounded-[8px] border border-line-strong px-2.5 py-2 text-[15px] leading-[22px] text-ink outline-none placeholder:text-faint focus:border-brand"
          />

          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="press -ml-2 flex h-10 items-center gap-1 rounded-[8px] px-2 text-[15px] font-medium text-ink-soft hover:text-ink"
            >
              <ChevronLeft size={18} aria-hidden="true" /> Back
            </button>
            <button
              type="submit"
              disabled={pending}
              aria-busy={pending || undefined}
              className="press h-10 w-[147px] rounded-[8px] bg-brand text-[15px] font-medium text-white hover:bg-brand-strong disabled:opacity-70"
            >
              {pending ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
