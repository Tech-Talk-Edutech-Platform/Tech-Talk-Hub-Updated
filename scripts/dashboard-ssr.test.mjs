import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

import handler from '../api/render.mjs'
import {
  dashboardRendererPaths,
  renderDashboardDocument,
} from '../dist-ssr/entry-server.mjs'

const template = await readFile(
  new URL('../dist/app.html', import.meta.url),
  'utf8',
)
const fakeToken = 'header.payload.signature'
const roleCookie = `__Host-tth-dashboard=${fakeToken}`

async function request(url, { method = 'GET', headers = {} } = {}) {
  const response = { headers: new Map(), statusCode: 0, body: undefined }
  await handler(
    { url, method, headers },
    {
      setHeader(name, value) {
        response.headers.set(name.toLowerCase(), value)
      },
      set statusCode(value) {
        response.statusCode = value
      },
      end(body) {
        response.body = body
      },
    },
  )
  return response
}

await test('the Vercel rewrite lists exactly the renderer paths', async () => {
  const { services } = JSON.parse(
    await readFile(new URL('../vercel.json', import.meta.url), 'utf8'),
  )
  const rewrite = services.app.rewrites.find(({ destination }) =>
    destination.startsWith('/api/render?'),
  )
  const alternatives = /^\/:dashboard\(([^)]+)\)$/.exec(rewrite.source)?.[1]
  assert.ok(alternatives, rewrite.source)
  assert.deepEqual(
    alternatives
      .split('|')
      .map((path) => `/${path}`)
      .toSorted((a, b) => a.localeCompare(b)),
    [...dashboardRendererPaths].toSorted((a, b) => a.localeCompare(b)),
  )
})

await test('only dashboard requests reach the dashboard renderer', async () => {
  const publicPaths = [
    '/',
    '/about',
    '/blog/some-post',
    '/book',
    '/checkout',
    '/login',
    '/reset-password',
    '/classroom/example',
    '/results/example',
    '/preview/sales',
  ]
  const { services } = JSON.parse(
    await readFile(new URL('../vercel.json', import.meta.url), 'utf8'),
  )
  const rewrite = services.app.rewrites.find(({ destination }) =>
    destination.startsWith('/api/render?'),
  )
  assert.ok(rewrite)
  const route = new RegExp(`^${rewrite.source.replace(':dashboard', '')}$`)
  await Promise.all(
    publicPaths.map(async (pathname) => {
      assert.equal(route.test(pathname), false, pathname)
      assert.equal(await renderDashboardDocument(pathname, template), null)
    }),
  )

  assert.equal(route.test('/student'), true)
  assert.equal(route.test('/_dashboard-session'), true)
  const response = await request('/api/render?__dashboard_path=/student')
  assert.equal(response.statusCode, 200)
  assert.equal(response.headers.get('cache-control'), 'private, no-store')
  assert.match(response.body, /data-dashboard-ssr="true"/)
  assert.match(response.body, /Verifying Access/)
  assert.doesNotMatch(response.body, /data-dashboard-role=/)
})

await test('verified role homes render navigation without sending tokens or user data', async (context) => {
  context.mock.method(globalThis, 'fetch', (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input.url)
    const headers = new Headers(init?.headers)
    assert.equal(headers.get('authorization'), `Bearer ${fakeToken}`)
    if (url.pathname === '/auth/v1/user') {
      return Promise.resolve(
        Response.json({
          id: '00000000-0000-0000-0000-000000000001',
          email: 'private-user@example.invalid',
        }),
      )
    }
    if (url.pathname === '/rest/v1/users') {
      assert.equal(url.searchParams.get('select'), 'role')
      return Promise.resolve(Response.json([{ role: 'student' }]))
    }
    throw new Error(`Unexpected URL ${url.pathname}`)
  })

  const [student, tutor, anonymous, schedule, invalidView] = await Promise.all([
    request('/student', { headers: { cookie: roleCookie } }),
    request('/tutor', { headers: { cookie: roleCookie } }),
    request('/student'),
    request('/student?view=schedule', { headers: { cookie: roleCookie } }),
    request('/student?view=users', { headers: { cookie: roleCookie } }),
  ])
  assert.match(
    schedule.body,
    /aria-current="page"[^>]*><svg[^>]*>(?:(?!<\/svg>)[\s\S])*<\/svg>Schedule<\/span>/,
  )
  assert.match(
    invalidView.body,
    /aria-current="page"[^>]*><svg[^>]*>(?:(?!<\/svg>)[\s\S])*<\/svg>Dashboard<\/span>/,
  )
  assert.doesNotMatch(schedule.body, /data-msg="The server did not finish/)
  assert.match(student.body, /data-dashboard-role="student"/)
  assert.match(student.body, /My Courses/)
  assert.doesNotMatch(student.body, /private-user|header\.payload\.signature/)
  assert.doesNotMatch(tutor.body, /data-dashboard-role=/)
  assert.doesNotMatch(anonymous.body, /data-dashboard-role=/)
})

await test('dashboard cookie requires same-origin intent and clears on logout', async () => {
  const url = '/api/render?__dashboard_path=/_dashboard-session'
  const sameOrigin = {
    'x-dashboard-session': '1',
    'sec-fetch-site': 'same-origin',
  }
  const authorization = `Bearer ${fakeToken}`
  const rejected = await request(url, {
    method: 'POST',
    headers: { ...sameOrigin, authorization, 'sec-fetch-site': 'cross-site' },
  })
  assert.equal(rejected.statusCode, 403)
  assert.equal(rejected.headers.get('set-cookie'), undefined)

  const set = await request(url, {
    method: 'POST',
    headers: { ...sameOrigin, authorization },
  })
  assert.equal(set.statusCode, 204)
  assert.match(set.headers.get('set-cookie'), /HttpOnly; Secure; SameSite=Lax/)

  const cleared = await request(url, { method: 'POST', headers: sameOrigin })
  assert.equal(cleared.statusCode, 204)
  assert.match(cleared.headers.get('set-cookie'), /Max-Age=0/)
})
