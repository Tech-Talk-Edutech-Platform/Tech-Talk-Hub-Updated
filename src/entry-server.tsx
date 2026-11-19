import { StrictMode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createClient } from '@supabase/supabase-js'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'

import App from './App'
import { isDashboardPath } from './auth/dashboardPaths'
export { dashboardRendererPaths } from './auth/dashboardPaths'
import { CartProvider } from './context/CartProvider'
import { createQueryClient } from './lib/queryClient'
import { isAppRole } from './types/roles'
import type { Database } from './types/database'

const cookieName = '__Host-tth-dashboard'
const tokenPattern = /^[\w-]+\.[\w-]+\.[\w-]+$/
const maximumTokenLength = 3500

function validToken(token: string) {
  return token.length <= maximumTokenLength && tokenPattern.test(token)
}

export function dashboardSessionResponse(headers: {
  authorization?: string
  marker?: string
  fetchSite?: string
}) {
  if (
    headers.marker !== '1' ||
    (headers.fetchSite && headers.fetchSite !== 'same-origin')
  ) {
    return { status: 403 }
  }
  const token = headers.authorization?.match(/^Bearer (\S+)$/i)?.[1] ?? ''
  if (headers.authorization && !validToken(token)) return { status: 400 }

  return {
    status: 204,
    cookie: `${cookieName}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${token ? 3600 : 0}`,
  }
}

async function verifiedDashboardRole(path: string, cookieHeader: string) {
  // No other portal benefits from an identity lookup on initial render.
  const requestedRole = path.replace(/^\/|\/$/g, '')
  if (!isAppRole(requestedRole)) return undefined

  const token = cookieHeader
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1)
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!token || !validToken(token) || !url || !key) return undefined

  try {
    const timeout = AbortSignal.timeout(2400)
    const client = createClient<Database>(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: { Authorization: `Bearer ${token}` },
        fetch: (input, init) =>
          fetch(input, {
            ...init,
            signal: init?.signal
              ? AbortSignal.any([init.signal, timeout])
              : timeout,
          }),
      },
    })
    const {
      data: { user },
      error,
    } = await client.auth.getUser(token)
    if (error || !user) return undefined

    const { data: profile } = await client
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    // A mismatch is resolved by the existing browser role redirect.
    return profile?.role === requestedRole ? requestedRole : undefined
  } catch {
    return undefined
  }
}

export async function renderDashboardDocument(
  requestUrl: string,
  template: string,
  cookie = '',
) {
  const url = new URL(requestUrl, 'http://localhost')
  if (!isDashboardPath(url.pathname)) return null

  const role = await verifiedDashboardRole(url.pathname, cookie)
  const queryClient = createQueryClient()
  try {
    const markup = renderToString(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <CartProvider>
            <StaticRouter location={url.pathname + url.search}>
              <App serverRouter dashboardRole={role} />
            </StaticRouter>
          </CartProvider>
        </QueryClientProvider>
      </StrictMode>,
    )
    const meta =
      '<!-- seo:start --><meta name="robots" content="noindex,nofollow"><title>Tech Talk Hub Dashboard</title><!-- seo:end -->'
    return template
      .replace(/<!-- seo:start -->[\s\S]*?<!-- seo:end -->/, meta)
      .replace('<div id="root"></div>', () => {
        const dashboardRole = role ? ` data-dashboard-role="${role}"` : ''
        return `<div id="root" data-dashboard-ssr="true"${dashboardRole}>${markup}</div>`
      })
  } finally {
    queryClient.clear()
  }
}
