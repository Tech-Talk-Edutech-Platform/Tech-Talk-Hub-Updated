import { useParams } from 'react-router-dom'
import { ReadLayout } from '../../components/classroom/layout/ReadLayout'
import { MaterialContent } from '../../components/classroom/panels/details/MaterialContent'
import { DEFAULT_ROOM_CODE } from '../../data/classroom'
import { useClassroomData } from '../../hooks/classroom/useClassroomData'

/** "Open in new tab" from Classroom material. */
export function MaterialPage() {
  const { classroomId = DEFAULT_ROOM_CODE } = useParams()
  const query = useClassroomData(classroomId)

  if (query.isPending) {
    return (
      <ReadLayout title="Classroom material">
        <output className="block text-[16px] text-ink-soft">
          Loading the lesson material…
        </output>
      </ReadLayout>
    )
  }

  if (query.isError) {
    return (
      <ReadLayout title="Classroom material">
        <p role="alert" className="text-[16px] text-ink-soft">
          Couldn’t load the lesson material. {query.error.message}
        </p>
        <button
          type="button"
          onClick={() => void query.refetch()}
          className="press mt-5 h-10 rounded-[10px] bg-brand px-4 text-[15px] font-medium text-white hover:bg-brand-strong"
        >
          Try again
        </button>
      </ReadLayout>
    )
  }

  const { classroom, material } = query.data
  return (
    <ReadLayout title="Classroom material" subtitle={classroom.title}>
      {material ? (
        <MaterialContent material={material} wide />
      ) : (
        <p className="text-[16px] text-ink-soft">
          No lesson material is linked to this class yet. An admin can add one
          in Dashboard › Classroom › Lesson materials.
        </p>
      )}
    </ReadLayout>
  )
}
