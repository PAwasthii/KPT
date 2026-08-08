import type { Request, Response, NextFunction } from 'express'

type KeyFn = (req: Request) => string

interface RateLimitOptions {
  windowMs: number
  max: number
  keyGenerator?: KeyFn
}

const buckets = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(options: RateLimitOptions) {
  const { windowMs, max, keyGenerator } = options
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown'
    const keyExtra = keyGenerator ? keyGenerator(req) : ''
    const key = `${ip}:${keyExtra}`
    const now = Date.now()
    const entry = buckets.get(key)
    if (!entry || entry.resetAt < now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs })
      return next()
    }
    if (entry.count >= max) {
      const retryAfter = Math.max(0, Math.ceil((entry.resetAt - now) / 1000))
      res.setHeader('Retry-After', String(retryAfter))
      return res.status(429).json({ error: 'Too many requests. Please try again later.' })
    }
    entry.count += 1
    return next()
  }
}


