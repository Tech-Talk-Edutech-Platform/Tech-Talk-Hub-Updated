/**
 * URL for a backend (`server/`) endpoint. Requests stay same-origin (`/api/...`,
 * proxied to the server in dev) unless `VITE_API_BASE_URL` points elsewhere.
 */
export function apiUrl(path: string): string {
  const base = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') ?? ''

  return `${base}${path}`
}
