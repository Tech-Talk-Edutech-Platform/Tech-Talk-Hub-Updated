import { APP_ROLES, isAppRole } from '../types/roles'

export const dashboardSessionPath = '/_dashboard-session'

const dashboardTools = new Set([
  '/assign-homework',
  '/receive-homework',
  '/calendar',
  '/receipt',
  '/upload-results',
  '/users',
])

/** Every path the dashboard renderer serves; `vercel.json` must match it. */
export const dashboardRendererPaths: readonly string[] = [
  ...APP_ROLES.map((role) => `/${role}`),
  ...dashboardTools,
  dashboardSessionPath,
]

export function isDashboardPath(pathname: string) {
  const path = pathname.replace(/\/$/, '')
  return (
    path.startsWith('/') &&
    (isAppRole(path.slice(1)) || dashboardTools.has(path))
  )
}
