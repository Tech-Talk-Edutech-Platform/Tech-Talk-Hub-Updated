import { useState, type FormEvent } from 'react'
import { ChevronLeft } from 'lucide-react'
import { ACTIVITIES } from '../../../data/classroom'
import type { Student, SubmittedProject } from '../../../types/classroom'
import { Modal } from '../ui/Modal'
import { Select } from '../ui/Select'

const ACTIVITY_OPTIONS = ACTIVITIES.map((activity) => ({
  value: activity.id,
  label: activity.title,
}))

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
  student: Student
  onSubmit: (project: Omit<SubmittedProject, 'id' | 'at'>) => void
}

/** Two steps: pick the activity, then the project link (docs/breakdown/07-submit-project.md). */
export function SubmitProjectModal({
  open,
  onClose,
  student,
  onSubmit,
}: SubmitProjectModalProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [activityId, setActivityId] = useState('')
  const [link, setLink] = useState('')
  const [note, setNote] = useState('')
  const [touched, setTouched] = useState(false)

  const activity = ACTIVITIES.find((a) => a.id === activityId)
  const linkError =
    touched && !isUrl(link)
      ? 'Enter the full project link, starting with https://'
      : ''

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setTouched(true)
    if (!activity || !isUrl(link)) return
    onSubmit({ activity: activity.title, link, note: note.trim() })
  }

  return (
    <Modal open={open} onClose={onClose} width={512} labelledBy="submit-title">
      <h2
        id="submit-title"
        className="text-ink pr-10 text-[20px] font-semibold leading-[30px]"
      >
        You are submitting this activity on behalf of {student.name}
      </h2>
      <p className="text-brand mt-4 text-[11.5px] font-medium">
        Step {step} of 2
      </p>

      {step === 1 || !activity ? (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (activity) setStep(2)
          }}
        >
          <h3 className="text-ink mt-1 text-[17px]">
            Choose student & activity
          </h3>
          <p className="text-ink-soft mt-0.5 text-[13px]">
            Pick the student and the classroom activity you&apos;re submitting.
          </p>
          <div className="mt-8">
            <Select
              label="Select activity"
              value={activityId}
              onChange={setActivityId}
              options={ACTIVITY_OPTIONS}
            />
          </div>
          <div className="mt-10 flex justify-end">
            <button
              type="submit"
              disabled={!activity}
              className="press bg-brand hover:bg-brand-strong disabled:bg-brand-faded h-10 w-[147px] rounded-[4px] text-[15px] font-medium text-white"
            >
              Continue
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={submit} noValidate>
          <h3 className="text-ink mt-1 text-[17px]">Add the project</h3>
          <p className="text-ink-soft mt-0.5 text-[13px]">
            {activity.title} · paste the link to {student.name}&apos;s saved
            project.
          </p>

          <label
            htmlFor="project-link"
            className="text-ink mb-2 mt-8 block text-[15px] font-medium"
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
            placeholder={activity.project}
            aria-invalid={!!linkError}
            aria-describedby={linkError ? 'project-link-error' : undefined}
            className={`text-ink placeholder:text-faint focus:border-brand h-10 w-full rounded-[4px] border px-2.5 text-[15px] outline-none ${
              linkError ? 'border-brand' : 'border-line-strong'
            }`}
          />
          {linkError && (
            <p
              id="project-link-error"
              className="text-brand mt-1.5 text-[13px]"
            >
              {linkError}
            </p>
          )}

          <label
            htmlFor="project-note"
            className="text-ink mb-2 mt-5 block text-[15px] font-medium"
          >
            Note for the student{' '}
            <span className="text-muted font-normal">(optional)</span>
          </label>
          <textarea
            id="project-note"
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="What went well, what to try next"
            className="border-line-strong text-ink placeholder:text-faint focus:border-brand w-full resize-none rounded-[4px] border px-2.5 py-2 text-[15px] leading-[22px] outline-none"
          />

          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="press text-ink-soft hover:text-ink -ml-2 flex h-10 items-center gap-1 rounded-[4px] px-2 text-[15px] font-medium"
            >
              <ChevronLeft size={18} aria-hidden="true" /> Back
            </button>
            <button
              type="submit"
              className="press bg-brand hover:bg-brand-strong h-10 w-[147px] rounded-[4px] text-[15px] font-medium text-white"
            >
              Submit
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
