import type { NextFunction, Request, Response } from 'express'

/**
 * Browser origins that may always call this API. Origins must match exactly:
 * scheme + host + port, no trailing slash. Add extra ones (preview deploys,
 * staging) through the comma-separated `CORS_ORIGINS` env var.
 */
export const DEFAULT_CORS_ORIGINS = [
  'https://www.techtalk-hub.com',
  'https://techtalk-hub.com',
  'https://tech-talk-hub-updated.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
]

/**
 * Lets the listed browser origins call the API cross-origin, and answers
 * preflight (OPTIONS) requests. Must be mounted before every route.
 */
export function allowOrigins(origins: string[]) {
  const allowed = new Set(origins)

  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin

    // The response depends on the Origin header, so caches must key on it.
    res.vary('Origin')

    if (origin && allowed.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Access-Control-Allow-Credentials', 'true')
      res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, OPTIONS',
      )
      // Authorization carries the Supabase session token (admin, classroom).
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization',
      )
    }

    if (req.method === 'OPTIONS') {
      res.sendStatus(204)
      return
    }

    next()
  }
}
