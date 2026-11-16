/**
 * Origin of the API server (`server/`), from `VITE_BACKEND_SERVER_URL`.
 *
 * - Dev (`vite`): empty, so requests stay same-origin (`/api/...`) and Vite's
 *   proxy forwards them to `VITE_BACKEND_SERVER_URL` (see `vite.config.ts`).
 * - Build (`vite build`): the server's origin from `.env.production`, or empty
 *   to call `/api` on the site's own origin.
 */
const API_BASE_URL = import.meta.env.DEV
  ? ''
  : (import.meta.env.VITE_BACKEND_SERVER_URL ?? '').replace(/\/+$/, '')

/** URL for a backend endpoint, e.g. `apiUrl('/api/admin/users')`. */
export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`
}
