import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'

import './index.css'
import './fullcalendar.css'
import App from './App'
import { CartProvider } from './context/CartProvider'
import { queryClient } from './lib/queryClient'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Missing #root element in index.html')
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <App />
      </CartProvider>
    </QueryClientProvider>
  </StrictMode>,
)
