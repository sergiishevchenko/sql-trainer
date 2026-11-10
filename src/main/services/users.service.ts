import { desc, eq } from 'drizzle-orm'
import { levelProgress, rankForLevel } from '@shared/constants/levels'
import type { AccountSummary, UserProfile, UserSettingsDto } from '@shared/types/user'
import type { AppDatabase } from '../database/connection'
import { users, userSettings } from '../database/schema'
import { notFound } from '../errors'
import { addDays, localDate } from '../utils/date'

export type UserRow = typeof users.$inferSelect

export function effectiveStreak(row: Pick<UserRow, 'currentStreak' | 'lastActiveDate'>, today: string): number {
  if (!row.lastActiveDate) return 0
  if (row.lastActiveDate === today || row.lastActiveDate === addDays(today, -1)) return row.currentStreak
  return 0
}

export function toProfile(row: UserRow, now: number = Date.now()): UserProfile {
  const lp = levelProgress(row.xp)
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    createdAt: row.createdAt,
    lastLoginAt: row.lastLoginAt,
    level: lp.level,
    xp: row.xp,
    levelProgress: lp.progress,
    currentLevelXp: lp.currentLevelXp,
    nextLevelXp: lp.nextLevelXp,
    rank: rankForLevel(lp.level),
    completedCount: row.completedCount,
    learningSeconds: row.learningSeconds,
    currentStreak: effectiveStreak(row, localDate(now)),
    longestStreak: row.longestStreak,
    avatarColor: row.avatarColor,
    lastExerciseId: row.lastExerciseId
  }
}

export class UsersService {
  constructor(
    private readonly db: AppDatabase,
    private readonly now: () => number = Date.now
  ) {}

  row(userId: string): UserRow {
    const row = this.db.orm.select().from(users).where(eq(users.id, userId)).get()
    if (!row) throw notFound('user')
    return row
  }

  profile(userId: string): UserProfile {
    return toProfile(this.row(userId), this.now())
  }

  accounts(): AccountSummary[] {
    return this.db.orm
      .select({
        id: users.id,
        username: users.username,
        avatarColor: users.avatarColor,
        level: users.level,
        lastLoginAt: users.lastLoginAt
      })
      .from(users)
      .orderBy(desc(users.lastLoginAt))
      .all()
  }

  settings(userId: string): UserSettingsDto {
    let row = this.db.orm.select().from(userSettings).where(eq(userSettings.userId, userId)).get()
    if (!row) {
      this.db.write((orm) => orm.insert(userSettings).values({ userId, updatedAt: this.now() }).onConflictDoNothing().run())
      row = this.db.orm.select().from(userSettings).where(eq(userSettings.userId, userId)).get()!
    }
    return {
      locale: row.locale === 'en' ? 'en' : 'ru',
      dailyGoal: row.dailyGoal,
      editorFontSize: row.editorFontSize,
      editorMinimap: row.editorMinimap,
      editorWordWrap: row.editorWordWrap,
      autoSaveDrafts: row.autoSaveDrafts,
      reduceMotion: row.reduceMotion
    }
  }

  updateSettings(userId: string, patch: Partial<UserSettingsDto>): UserSettingsDto {
    this.settings(userId)
    if (Object.keys(patch).length > 0) {
      this.db.write((orm) =>
        orm
          .update(userSettings)
          .set({ ...patch, updatedAt: this.now() })
          .where(eq(userSettings.userId, userId))
          .run()
      )
    }
    return this.settings(userId)
  }

  setLastExercise(userId: string, exerciseId: string): void {
    this.db.write((orm) => orm.update(users).set({ lastExerciseId: exerciseId }).where(eq(users.id, userId)).run())
  }
}
