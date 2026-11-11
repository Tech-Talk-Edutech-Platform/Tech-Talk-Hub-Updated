import { Navigate, Route, Routes } from 'react-router-dom'
import { ClassroomLayout } from '../../components/classroom/layout/ClassroomLayout'
import { DEFAULT_ROOM_CODE } from '../../data/classroom'
import { ClassroomPage } from './ClassroomPage'
import { MaterialPage } from './MaterialPage'
import { TourPage } from './TourPage'

/**
 * Everything under /classroom. Loaded lazily from App, so the landing page
 * doesn't download the classroom.
 */
export function ClassroomRoutes() {
  return (
    <Routes>
      <Route element={<ClassroomLayout />}>
        <Route
          index
          element={<Navigate to={`/classroom/${DEFAULT_ROOM_CODE}`} replace />}
        />
        <Route path="tour" element={<TourPage />} />
        <Route path=":classroomId" element={<ClassroomPage />} />
        <Route path=":classroomId/material" element={<MaterialPage />} />
        <Route path="*" element={<Navigate to="/classroom" replace />} />
      </Route>
    </Routes>
  )
}
