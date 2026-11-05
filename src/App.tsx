import { Route, Routes } from 'react-router-dom'

import { useScrollToHash } from './hooks/useScrollToHash'
import { HomePage } from './pages/HomePage'

export function App() {
  useScrollToHash()

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
    </Routes>
  )
}
