import { readFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { Plugin } from 'vite'
import {
  dashboardSessionPath,
  isDashboardPath,
} from '../src/auth/dashboardPaths'

type Renderer = Pick<
  typeof import('../src/entry-server'),
  'dashboardSessionResponse' | 'renderDashboardDocument'
>

function dashboardMiddleware(
  loadRenderer: () => Promise<Renderer>,
  loadTemplate: (url: string) => Promise<string>,
) {
  return (
    req: IncomingMessage,
    res: ServerResponse,
    next: (error?: unknown) => void,
  ) => {
    const url = new URL(req.url || '/', 'http://localhost')
    const sessionRequest = url.pathname === dashboardSessionPath
    if (
      !sessionRequest &&
      (!isDashboardPath(url.pathname) ||
        (req.method !== 'GET' && req.method !== 'HEAD') ||
        !req.headers.accept?.includes('text/html'))
    ) {
      next()
      return
    }

    const handle = async () => {
      const renderer = await loadRenderer()
      res.setHeader('Cache-Control', 'private, no-store')
      if (sessionRequest) {
        if (req.method !== 'POST') {
          res.setHeader('Allow', 'POST')
          res.statusCode = 405
        } else {
          const marker = req.headers['x-dashboard-session']
          const fetchSite = req.headers['sec-fetch-site']
          const result = renderer.dashboardSessionResponse({
            authorization: req.headers.authorization,
            marker: typeof marker === 'string' ? marker : undefined,
            fetchSite: typeof fetchSite === 'string' ? fetchSite : undefined,
          })
          res.statusCode = result.status
          if (result.cookie) res.setHeader('Set-Cookie', result.cookie)
        }
        res.end()
        return
      }

      const target = url.pathname + url.search
      const html = await renderer.renderDashboardDocument(
        target,
        await loadTemplate(target),
        req.headers.cookie,
      )
      res.statusCode = html ? 200 : 404
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.end(req.method === 'HEAD' ? undefined : (html ?? ''))
    }

    void handle().catch(next)
  }
}

export function ssrMiddleware(): Plugin {
  return {
    name: 'tech-talk-dashboard-ssr',
    configureServer(server) {
      server.middlewares.use(
        dashboardMiddleware(
          async () => {
            const renderer: Renderer = await server.ssrLoadModule(
              '/src/entry-server.tsx',
            )
            return renderer
          },
          async (url) => {
            const file = await readFile(
              resolve(server.config.root, 'index.html'),
              'utf8',
            )
            return server.transformIndexHtml(url, file)
          },
        ),
      )
    },
    configurePreviewServer(server) {
      const { root, build } = server.config
      const bundle = pathToFileURL(resolve(root, 'dist-ssr/entry-server.mjs'))
      server.middlewares.use(
        dashboardMiddleware(
          async () => {
            const renderer: Renderer = await import(bundle.href)
            return renderer
          },
          () => readFile(resolve(root, build.outDir, 'app.html'), 'utf8'),
        ),
      )
    },
  }
}
