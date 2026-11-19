import { readFile } from 'node:fs/promises'

import {
  dashboardSessionResponse,
  renderDashboardDocument,
} from '../dist-ssr/entry-server.mjs'

const template = new URL('../dist/app.html', import.meta.url)

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store')
  try {
    const url = new URL(req.url ?? '/', 'http://localhost')
    const forwardedPath = url.searchParams.get('__dashboard_path')
    if (
      url.pathname === '/api/render' &&
      forwardedPath?.startsWith('/') &&
      !forwardedPath.startsWith('//')
    ) {
      url.pathname = forwardedPath
      url.searchParams.delete('__dashboard_path')
    }

    if (url.pathname === '/_dashboard-session') {
      if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST')
        res.statusCode = 405
      } else {
        const result = dashboardSessionResponse({
          authorization: req.headers.authorization,
          marker: req.headers['x-dashboard-session'],
          fetchSite: req.headers['sec-fetch-site'],
        })
        res.statusCode = result.status
        if (result.cookie) res.setHeader('Set-Cookie', result.cookie)
      }
      res.end()
      return
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD')
      res.statusCode = 405
      res.end()
      return
    }

    const html = await renderDashboardDocument(
      url.pathname + url.search,
      await readFile(template, 'utf8'),
      req.headers.cookie,
    )
    res.statusCode = html ? 200 : 404
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.end(
      req.method === 'HEAD'
        ? undefined
        : (html ?? 'Dashboard route not found.'),
    )
  } catch (error) {
    console.error('Dashboard render failed:', error)
    res.statusCode = 500
    res.end('Unable to render the dashboard.')
  }
}
