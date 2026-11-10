import { eq, sql } from 'drizzle-orm'
import { levelFromXp } from '@shared/constants/levels'
import type { Orm } from '../database/connection'
import { dailyActivity, users } from '../database/schema'
import { addDays } from '../utils/date'

export interface ActivityDelta {
  xp?: number
  solved?: number
  attempts?: number
  correct?: number
  seconds?: number
}

export function nextStreak(lastActive: string | null, current: number, today: string): number {
  if (lastActive === today) return Math.max(current, 1)
  if (lastActive === addDays(today, -1)) return current + 1
  return 1
}

export function bumpDailyActivity(orm: Orm, userId: string, date: string, delta: ActivityDelta): void {
  const values = {
    userId,
    date,
    xp: delta.xp ?? 0,
    solved: delta.solved ?? 0,
    attempts: delta.attempts ?? 0,
    correct: delta.correct ?? 0,
    seconds: delta.seconds ?? 0
  }
  orm
    .insert(dailyActivity)
    .values(values)
    .onConflictDoUpdate({
      target: [dailyActivity.userId, dailyActivity.date],
      set: {
        xp: sql`${dailyActivity.xp} + ${values.xp}`,
        solved: sql`${dailyActivity.solved} + ${values.solved}`,
        attempts: sql`${dailyActivity.attempts} + ${values.attempts}`,
        correct: sql`${dailyActivity.correct} + ${values.correct}`,
        seconds: sql`${dailyActivity.seconds} + ${values.seconds}`
      }
    })
    .run()
}

/**
 * Adds XP to the user and the daily ledger, keeping the stored level consistent.
 * Returns the user's level before and after.
 */
export function grantXp(orm: Orm, userId: string, amount: number, today: string): { from: number; to: number } {
  const row = orm.select({ xp: users.xp }).from(users).where(eq(users.id, userId)).get()
  const before = row?.xp ?? 0
  const from = levelFromXp(before)
  if (amount <= 0) return { from, to: from }
  const after = before + amount
  const to = levelFromXp(after)
  orm.update(users).set({ xp: after, level: to }).where(eq(users.id, userId)).run()
  bumpDailyActivity(orm, userId, today, { xp: amount })
  return { from, to }
}

export function markActiveDay(orm: Orm, userId: string, today: string): void {
  const row = orm
    .select({ lastActiveDate: users.lastActiveDate, currentStreak: users.currentStreak, longestStreak: users.longestStreak })
    .from(users)
    .where(eq(users.id, userId))
    .get()
  if (!row) return
  const streak = nextStreak(row.lastActiveDate, row.currentStreak, today)
  orm
    .update(users)
    .set({ currentStreak: streak, longestStreak: Math.max(row.longestStreak, streak), lastActiveDate: today })
    .where(eq(users.id, userId))
    .run()
}
