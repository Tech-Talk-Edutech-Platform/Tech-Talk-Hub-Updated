import { ReadLayout } from '../../components/classroom/layout/ReadLayout'
import { MaterialContent } from '../../components/classroom/panels/details/MaterialContent'
import { CLASSROOM } from '../../data/classroom'

/** "Open in new tab" from Classroom material. */
export function MaterialPage() {
  return (
    <ReadLayout title="Classroom material" subtitle={CLASSROOM.title}>
      <MaterialContent wide />
    </ReadLayout>
  )
}
