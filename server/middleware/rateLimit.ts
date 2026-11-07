import type { NextFunction, Request, Response } from 'express'

type RateLimitOptions = {
  /** Requests allowed per client within the window. */
  limit: number
  windowMs: number
}

/**
 * Small in-memory, per-IP rate limiter for public endpoints. Counts reset when
 * the server restarts, which is fine for slowing down abuse of a single
 * instance; use a shared store if the server is ever scaled out.
 */
export function rateLimit({ limit, windowMs }: RateLimitOptions) {
  const hits = new Map<string, { count: number; resetAt: number }>()

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now()
    const key = req.ip ?? 'unknown'
    const entry = hits.get(key)

    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs })

      // Drop expired entries now and then so the map can't grow forever.
      if (hits.size > 10_000) {
        for (const [ip, value] of hits) {
          if (value.resetAt <= now) {
            hits.delete(ip)
          }
        }
      }

      next()
      return
    }

    if (entry.count >= limit) {
      res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000))
      res
        .status(429)
        .json({ error: 'Too many requests. Please try again later.' })
      return
    }

    entry.count += 1
    next()
  }
}
