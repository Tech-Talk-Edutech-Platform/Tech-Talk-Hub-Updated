import { lazy, Suspense } from 'react'

import { Tabs } from '../../../components/ui/Tabs'

const TutorTrainingView = lazy(() => import('./TutorTrainingView'))
const TutorTrialBookingsView = lazy(() => import('./TutorTrialBookingsView'))

export type TrainingSection = 'course' | 'trials'

type TutorTrainingHubProps = {
  userId: string
  section: TrainingSection
  onSectionChange: (section: TrainingSection) => void
}

/**
 * Dashboard › Training (tutors): the training course and the trial classes
 * assigned to them, as two tabs. Trial bookings used to be their own
 * sidebar item; `?view=trials` links still land on the Trial bookings tab.
 */
export default function TutorTrainingHub({
  userId,
  section,
  onSectionChange,
}: TutorTrainingHubProps) {
  return (
    <div>
      <div className="mx-auto max-w-7xl px-4 pt-4 md:px-8 md:pt-8">
        <Tabs
          id="tutor-training"
          label="Training"
          value={section}
          onChange={onSectionChange}
          tabs={[
            { value: 'course', label: 'Training course' },
            { value: 'trials', label: 'Trial bookings' },
          ]}
        >
          <Suspense fallback={<output className="block p-6">Loading…</output>}>
            {/* The views keep their own page padding; cancel the doubled part. */}
            <div className="-mx-4 -mt-4 md:-mx-8 md:-mt-8">
              {section === 'trials' ? (
                <TutorTrialBookingsView userId={userId} />
              ) : (
                <TutorTrainingView userId={userId} />
              )}
            </div>
          </Suspense>
        </Tabs>
      </div>
    </div>
  )
}
