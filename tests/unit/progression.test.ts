import { describe, expect, it } from 'vitest'
import { levelFromXp, levelProgress, rankForLevel, xpForLevel } from '@shared/constants/levels'
import { nextStreak } from '../../src/main/services/xp'
import { addDays } from '../../src/main/utils/date'
import { RateLimiter } from '../../src/main/security/rate-limiter'

describe('levels', () => {
  it('uses a growing XP curve', () => {
    expect(xpForLevel(1)).toBe(0)
    expect(xpForLevel(2)).toBe(100)
    expect(xpForLevel(3)).toBe(300)
    expect(levelFromXp(0)).toBe(1)
    expect(levelFromXp(99)).toBe(1)
    expect(levelFromXp(100)).toBe(2)
    expect(levelFromXp(299)).toBe(2)
    expect(levelFromXp(300)).toBe(3)
  })

  it('computes progress within the current level', () => {
    const progress = levelProgress(200)
    expect(progress.level).toBe(2)
    expect(progress.currentLevelXp).toBe(100)
    expect(progress.nextLevelXp).toBe(300)
  })

  it('maps levels to ranks', () => {
    expect(rankForLevel(1)).toBe('novice')
    expect(rankForLevel(50)).toBe('grandmaster')
  })
})

describe('streaks', () => {
  it('starts, continues and resets', () => {
    const today = '2024-03-10'
    expect(nextStreak(null, 0, today)).toBe(1)
    expect(nextStreak(today, 4, today)).toBe(4)
    expect(nextStreak(addDays(today, -1), 4, today)).toBe(5)
    expect(nextStreak(addDays(today, -3), 4, today)).toBe(1)
  })
})

describe('RateLimiter', () => {
  it('locks out after repeated failures with exponential backoff', () => {
    let now = 0
    const limiter = new RateLimiter(3, 1000, () => now)
    for (let i = 0; i < 2; i += 1) limiter.fail('a')
    expect(limiter.retryAfterMs('a')).toBe(0)
    limiter.fail('a')
    expect(limiter.retryAfterMs('a')).toBe(1000)
    limiter.fail('a')
    expect(limiter.retryAfterMs('a')).toBe(2000)
    now = 5000
    expect(limiter.retryAfterMs('a')).toBe(0)
    limiter.reset('a')
    limiter.fail('a')
    expect(limiter.retryAfterMs('a')).toBe(0)
  })
})
