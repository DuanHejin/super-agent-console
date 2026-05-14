const requestRecords = new Map<string, number[]>()

export interface RateLimitOptions {
  key: string
  limit: number
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: string
}

export function checkRateLimit(options: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  const windowStart = now - options.windowMs
  const records = (requestRecords.get(options.key) ?? []).filter((timestamp) => timestamp > windowStart)
  const resetAt = records[0] ? new Date(records[0] + options.windowMs).toISOString() : new Date(now + options.windowMs).toISOString()

  if (records.length >= options.limit) {
    requestRecords.set(options.key, records)

    return {
      allowed: false,
      remaining: 0,
      resetAt
    }
  }

  records.push(now)
  requestRecords.set(options.key, records)

  return {
    allowed: true,
    remaining: Math.max(options.limit - records.length, 0),
    resetAt
  }
}
