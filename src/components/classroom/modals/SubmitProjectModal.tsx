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
        className="pr-10 text-[20px] leading-[30px] font-semibold text-ink"
      >
        You are submitting this activity on behalf of {student.name}
      </h2>
      <p className="mt-4 text-[11.5px] font-medium text-brand">
        Step {step} of 2
      </p>

      {step === 1 || !activity ? (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (activity) setStep(2)
          }}
        >
          <h3 className="mt-1 text-[17px] text-ink">
            Choose student & activity
          </h3>
          <p className="mt-0.5 text-[13px] text-ink-soft">
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
              className="press h-10 w-[147px] rounded-[4px] bg-brand text-[15px] font-medium text-white hover:bg-brand-strong disabled:bg-brand-faded"
            >
              Continue
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={submit} noValidate>
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
            placeholder={activity.project}
            aria-invalid={!!linkError}
            aria-describedby={linkError ? 'project-link-error' : undefined}
            className={`h-10 w-full rounded-[4px] border px-2.5 text-[15px] text-ink outline-none placeholder:text-faint focus:border-brand ${
              linkError ? 'border-brand' : 'border-line-strong'
            }`}
          />
          {linkError && (
            <p
              id="project-link-error"
              className="mt-1.5 text-[13px] text-brand"
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
            className="w-full resize-none rounded-[4px] border border-line-strong px-2.5 py-2 text-[15px] leading-[22px] text-ink outline-none placeholder:text-faint focus:border-brand"
          />

          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="press -ml-2 flex h-10 items-center gap-1 rounded-[4px] px-2 text-[15px] font-medium text-ink-soft hover:text-ink"
            >
              <ChevronLeft size={18} aria-hidden="true" /> Back
            </button>
            <button
              type="submit"
              className="press h-10 w-[147px] rounded-[4px] bg-brand text-[15px] font-medium text-white hover:bg-brand-strong"
            >
              Submit
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
