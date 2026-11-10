interface Bucket {
  failures: number
  lockedUntil: number
}

/**
 * Exponential lockout for repeated failed authentication attempts per identifier.
 */
export class RateLimiter {
  private readonly buckets = new Map<string, Bucket>()

  constructor(
    private readonly freeAttempts = 5,
    private readonly baseLockMs = 15_000,
    private readonly now: () => number = Date.now
  ) {}

  retryAfterMs(key: string): number {
    const bucket = this.buckets.get(key)
    if (!bucket) return 0
    return Math.max(0, bucket.lockedUntil - this.now())
  }

  fail(key: string): void {
    const bucket = this.buckets.get(key) ?? { failures: 0, lockedUntil: 0 }
    bucket.failures += 1
    if (bucket.failures >= this.freeAttempts) {
      const exponent = bucket.failures - this.freeAttempts
      bucket.lockedUntil = this.now() + this.baseLockMs * 2 ** Math.min(exponent, 6)
    }
    this.buckets.set(key, bucket)
  }

  reset(key: string): void {
    this.buckets.delete(key)
  }
}
