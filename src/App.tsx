import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { useScrollToHash } from './hooks/useScrollToHash'
import { HomePage } from './pages/HomePage'

const ClassroomRoutes = lazy(() =>
  import('./pages/classroom/ClassroomRoutes').then((module) => ({
    default: module.ClassroomRoutes,
  })),
)

export function App() {
  useScrollToHash()

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route
        path="/classroom/*"
        element={
          <Suspense fallback={null}>
            <ClassroomRoutes />
          </Suspense>
        }
      />
    </Routes>
  )
}
