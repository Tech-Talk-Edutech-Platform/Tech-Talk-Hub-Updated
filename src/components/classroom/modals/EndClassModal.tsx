import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import { Info, LoaderCircle, TriangleAlert } from 'lucide-react'
import { END_COMPLETED_VIA, END_NOT_COMPLETED } from '../../../data/classroom'
import type {
  ClassEndReport,
  ClassOutcome,
  Student,
} from '../../../types/classroom'
import { Checkbox, Radio } from '../ui/Choice'
import { Modal } from '../ui/Modal'

const CONFIRMATIONS = [
  'I have completed my interaction with the student and their parent, or the student did not join, or the class was not successfully completed.',
  'There is no academic counsellor currently speaking with the parent in this class.',
  'I understand that ending the class will disconnect all active participants in the classroom.',
]

type Field = 'outcome' | 'missed' | 'details' | 'attended'

const sameName = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase()

type EndClassModalProps = {
  open: boolean
  onClose: () => void
  /** Return a promise to show the button's pending state until it settles. */
  onConfirm: (report: ClassEndReport) => void | Promise<void>
  elapsedMs: number
  recording: boolean
  /** Everyone booked into the class, for the attendance list. */
  students: Student[]
  /** The planned class length; ending earlier asks the teacher to double-check. */
  recommendedMinutes: number
  /** Names of the other people in the room now; matching students start ticked. */
  present: string[]
  /** The current video platform; a class moved elsewhere starts as "Moved to …". */
  platformId: string
}

/**
 * End class, in two steps: confirm nobody is mid-conversation, then say how
 * the class went and who attended. Remount with a `key` to start over.
 */
export function EndClassModal({
  open,
  onClose,
  onConfirm,
  elapsedMs,
  recording,
  students,
  recommendedMinutes,
  present,
  platformId,
}: EndClassModalProps) {
  const [step, setStep] = useState<'confirm' | 'reason'>('confirm')
  const [confirmed, setConfirmed] = useState(() =>
    CONFIRMATIONS.map(() => false),
  )
  const [outcome, setOutcome] = useState<ClassOutcome | null>(null)
  const [completedVia, setCompletedVia] = useState<string | null>(() => {
    const moved = `moved-${platformId}`
    return END_COMPLETED_VIA.some((option) => option.id === moved)
      ? moved
      : null
  })
  const [missedReason, setMissedReason] = useState<string | null>(null)
  const [details, setDetails] = useState('')
  const [attended, setAttended] = useState(() =>
    students
      .filter((student) => present.some((name) => sameName(name, student.name)))
      .map((student) => student.id),
  )
  const [attempted, setAttempted] = useState(false)
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)

  const headingRef = useRef<HTMLHeadingElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  // The button that opened step 2 is gone; give focus to the new step's title.
  useEffect(() => {
    if (step === 'reason') headingRef.current?.focus()
  }, [step])

  const allConfirmed = confirmed.every(Boolean)
  const early = elapsedMs < recommendedMinutes * 60_000
  const missed = END_NOT_COMPLETED.find((option) => option.id === missedReason)

  let problem: { field: Field; message: string } | null = null
  if (!outcome) {
    problem = { field: 'outcome', message: 'Choose a reason to end the class.' }
  } else if (
    outcome === 'completed' &&
    students.length > 0 &&
    attended.length === 0
  ) {
    problem = {
      field: 'attended',
      message: 'Select at least one student who attended.',
    }
  } else if (outcome === 'not-completed' && !missed) {
    problem = { field: 'missed', message: 'Choose what happened in the class.' }
  } else if (
    outcome === 'not-completed' &&
    missed?.detailsRequired &&
    !details.trim()
  ) {
    problem = {
      field: 'details',
      message: 'Add a few words about what happened.',
    }
  }
  // Errors wait for the first End class press, then follow the fixes live.
  const shown = attempted ? problem : null
  const describedBy = (field: Field) =>
    shown?.field === field ? `end-error-${field}` : undefined
  const errorFor = (field: Field) =>
    shown?.field === field && (
      <p
        id={`end-error-${field}`}
        role="alert"
        className="mt-2 text-[13px] leading-5 text-danger-ink"
      >
        {shown.message}
      </p>
    )

  const chooseOutcome = (next: ClassOutcome) => {
    setOutcome(next)
    setAttempted(false)
  }

  const chooseMissed = (id: string) => {
    setMissedReason(id)
    setAttempted(false)
  }

  const toggleAttended = (studentId: string) =>
    setAttended((ids) =>
      ids.includes(studentId)
        ? ids.filter((id) => id !== studentId)
        : [...ids, studentId],
    )

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending) return
    setAttempted(true)
    if (!outcome || problem) {
      const field = problem?.field ?? 'outcome'
      formRef.current
        ?.querySelector<HTMLElement>(
          `[data-field="${field}"] :is(input, textarea)`,
        )
        ?.focus()
      return
    }
    const report: ClassEndReport =
      outcome === 'completed'
        ? { outcome, reasonId: completedVia, details: '', attended }
        : {
            outcome,
            reasonId: missedReason,
            details: details.trim(),
            attended: [],
          }
    setFailed(false)
    const result = onConfirm(report)
    if (result instanceof Promise) {
      setPending(true)
      result.catch(() => {
        setPending(false)
        setFailed(true)
      })
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      width={512}
      labelledBy="end-title"
      tall
      padding={
        step === 'confirm'
          ? 'px-10 pt-14 pb-10 max-sm:pt-16'
          : 'px-20 pt-14 pb-14'
      }
    >
      {step === 'confirm' ? (
        <div>
          <h2 id="end-title" className="sr-only">
            End class
          </h2>

          <div className="rounded-r-[4px] border-l-[3px] border-callout-edge bg-callout px-4 pt-3.5 pb-4 text-[13.5px] leading-[21px] text-ink">
            <TriangleAlert
              size={36}
              strokeWidth={1.6}
              aria-hidden="true"
              className="mx-auto mb-2 text-accent-pink-strong"
            />
            <p>
              <strong className="font-semibold">DO NOT</strong> end the class if
              someone is interacting with the student or parent right now. If
              you end the class, they will be disconnected and it will impact
              your student’s enrolment.
            </p>
          </div>
          <p className="mt-2.5 rounded-r-[4px] border-l-[3px] border-info-edge bg-info px-4 py-2.5 text-[13.5px] leading-[21px] text-info-ink">
            You can just close the tab and leave the class. You can come back
            later to end it.
          </p>

          <fieldset className="mt-7">
            <legend className="text-[15px] leading-6 font-semibold text-ink">
              Before ending the class, please confirm:
            </legend>
            <div className="mt-4 space-y-3.5">
              {CONFIRMATIONS.map((text, index) => (
                <Checkbox
                  key={text}
                  checked={confirmed[index]}
                  onChange={() =>
                    setConfirmed((current) =>
                      current.map((value, i) => (i === index ? !value : value)),
                    )
                  }
                  label={text}
                  hint={
                    index === CONFIRMATIONS.length - 1 && recording
                      ? 'The recording will stop and download to this computer.'
                      : undefined
                  }
                />
              ))}
            </div>
          </fieldset>

          <div
            aria-live="polite"
            className="mt-8 flex flex-wrap items-center justify-between gap-3"
          >
            <button
              type="button"
              onClick={onClose}
              className="press h-10 rounded-[8px] border border-brand px-5 text-[15px] font-medium text-brand hover:bg-brand-soft"
            >
              End class later
            </button>
            {allConfirmed && (
              <button
                type="button"
                onClick={() => setStep('reason')}
                className="pop press h-10 w-[180px] rounded-[8px] bg-brand text-[15px] font-medium text-white hover:bg-brand-strong max-sm:flex-1"
              >
                End class now
              </button>
            )}
          </div>
        </div>
      ) : (
        <form ref={formRef} onSubmit={submit} noValidate className="panel-in">
          <h2
            id="end-title"
            ref={headingRef}
            tabIndex={-1}
            className="text-[22px] leading-[30px] font-semibold tracking-[-0.01em] text-balance text-ink focus:outline-none max-sm:pr-10"
          >
            Select a reason to end class
          </h2>

          {early && (
            <div className="mt-4 flex gap-3 rounded-r-[4px] border-l-[3px] border-callout-edge bg-callout px-4 py-3 text-[13.5px] leading-[21px] text-ink">
              <TriangleAlert
                size={20}
                strokeWidth={1.75}
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-callout-ink"
              />
              <p>
                You’re ending this class earlier than the recommended{' '}
                {recommendedMinutes} minutes. If it was completed, please ensure
                you’ve covered all necessary content before ending.
              </p>
            </div>
          )}

          <fieldset
            data-field="outcome"
            aria-describedby={describedBy('outcome')}
            className="mt-6"
          >
            <legend className="sr-only">Reason</legend>
            <div className="space-y-3">
              <div>
                <Radio
                  name="end-outcome"
                  value="completed"
                  checked={outcome === 'completed'}
                  onChange={() => chooseOutcome('completed')}
                  label="Class completed successfully"
                />
                {outcome === 'completed' && (
                  <fieldset className="reveal mt-2.5 ml-5 space-y-2">
                    <legend className="sr-only">
                      Where it finished, if not in this room (optional)
                    </legend>
                    {END_COMPLETED_VIA.map((option) => (
                      <Radio
                        key={option.id}
                        size="sm"
                        name="end-completed-via"
                        value={option.id}
                        checked={completedVia === option.id}
                        onChange={() => setCompletedVia(option.id)}
                        // Optional, so choosing the picked one again clears it.
                        onClick={() => {
                          if (completedVia === option.id) setCompletedVia(null)
                        }}
                        label={option.label}
                      />
                    ))}
                  </fieldset>
                )}
              </div>

              <div>
                <Radio
                  name="end-outcome"
                  value="not-completed"
                  checked={outcome === 'not-completed'}
                  onChange={() => chooseOutcome('not-completed')}
                  label="Class not completed"
                />
                {outcome === 'not-completed' && (
                  <fieldset
                    data-field="missed"
                    aria-describedby={describedBy('missed')}
                    className="reveal mt-2.5 ml-5 space-y-2"
                  >
                    <legend className="sr-only">What happened</legend>
                    {END_NOT_COMPLETED.map((option) => (
                      <div key={option.id}>
                        <Radio
                          size="sm"
                          name="end-missed"
                          value={option.id}
                          checked={missedReason === option.id}
                          onChange={() => chooseMissed(option.id)}
                          label={option.label}
                        />
                        {missedReason === option.id && (
                          <div
                            data-field="details"
                            className="reveal mt-2.5 mb-1 ml-7 space-y-2.5"
                          >
                            {option.note && (
                              <p className="flex gap-2.5 rounded-r-[4px] border-l-[3px] border-callout-edge bg-callout px-3 py-2.5 text-[13px] leading-[19px] text-ink">
                                <TriangleAlert
                                  size={18}
                                  strokeWidth={1.75}
                                  aria-hidden="true"
                                  className="mt-px shrink-0 text-danger"
                                />
                                {option.note}
                              </p>
                            )}
                            <textarea
                              rows={3}
                              value={details}
                              onChange={(event) =>
                                setDetails(event.target.value)
                              }
                              placeholder="Please provide more details"
                              aria-label={
                                option.detailsRequired
                                  ? 'What happened'
                                  : 'More details (optional)'
                              }
                              aria-invalid={shown?.field === 'details'}
                              aria-describedby={describedBy('details')}
                              className={`block w-full resize-none rounded-[8px] border px-2.5 py-2 text-[14px] leading-[21px] text-ink outline-none placeholder:text-muted focus:border-brand ${
                                shown?.field === 'details'
                                  ? 'border-danger'
                                  : 'border-line-strong'
                              }`}
                            />
                            {errorFor('details')}
                          </div>
                        )}
                      </div>
                    ))}
                    {errorFor('missed')}
                  </fieldset>
                )}
              </div>
            </div>
            {errorFor('outcome')}
          </fieldset>

          {outcome === 'completed' && students.length > 0 && (
            <div className="reveal mt-5 border-t border-line pt-5">
              <div className="flex items-start justify-between gap-4">
                <h3
                  id="end-attended-title"
                  className="text-[17px] leading-6 font-semibold text-ink"
                >
                  Select all students who attended the class
                </h3>
                <InfoTip id="end-attended-tip" label="About attendance">
                  Tick everyone who joined, even if only for part of the class.
                </InfoTip>
              </div>
              <fieldset
                data-field="attended"
                aria-labelledby="end-attended-title"
                aria-describedby={describedBy('attended')}
                className="mt-4 space-y-2.5"
              >
                {students.map((student) => (
                  <Checkbox
                    key={student.id}
                    checked={attended.includes(student.id)}
                    onChange={() => toggleAttended(student.id)}
                    label={
                      <>
                        {student.name}
                        {(student.grade || student.studentId) && (
                          <span className="text-ink-soft tabular-nums">
                            {' '}
                            ({student.grade || student.studentId})
                          </span>
                        )}
                      </>
                    }
                  />
                ))}
              </fieldset>
              {errorFor('attended')}
            </div>
          )}

          {failed && (
            <p
              role="alert"
              className="mt-6 text-[13px] leading-5 text-danger-ink"
            >
              Couldn’t end the class. Check your connection and try again.
            </p>
          )}

          <div className="mt-8 flex items-center gap-3">
            <button
              type="submit"
              disabled={pending}
              aria-busy={pending}
              className="press grid h-10 w-[147px] place-items-center rounded-[8px] bg-brand text-[15px] font-medium text-white hover:bg-brand-strong disabled:bg-brand-strong"
            >
              {pending ? (
                <>
                  <LoaderCircle
                    size={20}
                    strokeWidth={2.25}
                    aria-hidden="true"
                    className="animate-spin"
                  />
                  <span className="sr-only">Ending class</span>
                </>
              ) : (
                'End class'
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="press h-10 rounded-[8px] px-3 text-[15px] font-medium text-ink-soft hover:bg-surface-2 hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}

/** An (i) button whose tip shows on hover (after a beat) or keyboard focus. */
function InfoTip({
  id,
  label,
  children,
}: {
  id: string
  label: string
  children: ReactNode
}) {
  return (
    <span className="group relative shrink-0">
      <button
        type="button"
        aria-label={label}
        aria-describedby={id}
        className="grid size-7 place-items-center rounded-full text-muted transition-colors duration-150 hover:text-ink"
      >
        <Info size={19} strokeWidth={1.75} aria-hidden="true" />
      </button>
      <span
        role="tooltip"
        id={id}
        className="pointer-events-none absolute top-full right-0 z-10 mt-1.5 w-[220px] rounded-[8px] bg-toast px-3 py-2 text-[13px] leading-[19px] text-white opacity-0 shadow-[0_8px_24px_-8px_rgb(0_0_0/0.45)] transition-opacity duration-150 ease-out group-focus-within:opacity-100 group-hover:opacity-100 group-hover:delay-300"
      >
        {children}
      </span>
    </span>
  )
}
