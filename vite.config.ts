import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import { seoPrerender } from './scripts/seoPrerender'
import { ssrMiddleware } from './scripts/ssrMiddleware'

/** Dev fallback when `VITE_BACKEND_SERVER_URL` is unset: the local Express server. */
const DEFAULT_API_URL = 'http://localhost:5000'

export default defineConfig(({ mode, isSsrBuild }) => {
  // Loads `.env`, `.env.[mode]` and their `.local` variants. `vite` runs in
  // `development` mode and `vite build` in `production` mode.
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const apiTarget = (env.VITE_BACKEND_SERVER_URL || DEFAULT_API_URL).replace(
    /\/+$/,
    '',
  )

  return {
    plugins: [react(), tailwindcss(), seoPrerender(), ssrMiddleware()],
    build: {
      target: 'es2015',
      copyPublicDir: !isSsrBuild,
    },
    server: {
      // In dev the browser calls `/api` on Vite's own origin and Vite forwards
      // it to the API server, so no CORS setup is needed locally.
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
