import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'

import './index.css'
import './fullcalendar.css'
import App from './App'
import { CartProvider } from './context/CartProvider'
import { createQueryClient } from './lib/queryClient'
import { isAppRole } from './types/roles'
import { isDashboardPath } from './auth/dashboardPaths'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Missing #root element in index.html')
}

const dashboardSsr =
  rootElement.dataset.dashboardSsr === 'true' &&
  isDashboardPath(window.location.pathname)
const dashboardRole = dashboardSsr
  ? rootElement.dataset.dashboardRole
  : undefined
const tree = (
  <StrictMode>
    <QueryClientProvider client={createQueryClient()}>
      <CartProvider>
        <App
          dashboardRole={isAppRole(dashboardRole) ? dashboardRole : undefined}
        />
      </CartProvider>
    </QueryClientProvider>
  </StrictMode>
)

if (dashboardSsr) {
  hydrateRoot(rootElement, tree)
} else {
  createRoot(rootElement).render(tree)
}
