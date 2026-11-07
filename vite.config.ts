import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import { seoPrerender } from './scripts/seoPrerender'

export default defineConfig({
  plugins: [react(), tailwindcss(), seoPrerender()],
  build: {
    target: 'es2015',
  },
  server: {
    // Forward API calls to the Express server (`server/`, port 5000) in dev.
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
})
