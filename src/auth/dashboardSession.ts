import { dashboardSessionPath } from './dashboardPaths'

let latest: string | null | undefined
let pending = Promise.resolve()

/** Mirror the short-lived access token into a server-only cookie. */
export function syncDashboardSession(token: string | null) {
  if (latest === token) return
  latest = token
  pending = pending.then(async () => {
    if (latest !== token) return
    try {
      const response = await fetch(dashboardSessionPath, {
        method: 'POST',
        credentials: 'same-origin',
        keepalive: true,
        headers: token
          ? { 'X-Dashboard-Session': '1', Authorization: `Bearer ${token}` }
          : { 'X-Dashboard-Session': '1' },
      })
      if (!response.ok && latest === token) latest = undefined
    } catch {
      if (latest === token) latest = undefined
    }
  })
}
