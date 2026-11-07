import type { NextFunction, Request, Response } from 'express'

/**
 * Allows the listed browser origins to call the API. Only needed when the site
 * and this server are on different origins; with a same-origin `/api` proxy,
 * leave `CORS_ORIGINS` unset.
 */
export function allowOrigins(origins: string[]) {
  const allowed = new Set(origins)

  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin

    if (origin && allowed.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Vary', 'Origin')
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    }

    if (req.method === 'OPTIONS') {
      res.sendStatus(204)
      return
    }

    next()
  }
}
