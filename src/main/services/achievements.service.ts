import { and, count, countDistinct, eq, isNotNull, max } from 'drizzle-orm'
import { ACHIEVEMENTS, type AchievementDefinition, type AchievementMetric } from '@shared/constants/achievements'
import type { UnlockedAchievement } from '@shared/types/exercise'
import type { AchievementDto } from '@shared/types/learning'
import type { AppDatabase, Orm } from '../database/connection'
import {
  assessments,
  dailyActivity,
  exerciseProgress,
  queryHistory,
  userAchievements,
  users
} from '../database/schema'
import type { Catalog } from '../content/loader'
import { getLocale } from '../i18n'
import { localDate } from '../utils/date'
import { isLevelCompleted } from './catalog.service'
import { effectiveStreak } from './users.service'
import { grantXp } from './xp'

class MetricContext {
  private solvedIds: string[] | null = null

  constructor(
    private readonly orm: Orm,
    private readonly catalog: Catalog,
    private readonly userId: string,
    private readonly today: string
  ) {}

  private solved(): string[] {
    this.solvedIds ??= this.orm
      .select({ id: exerciseProgress.exerciseId })
      .from(exerciseProgress)
      .where(and(eq(exerciseProgress.userId, this.userId), isNotNull(exerciseProgress.firstSolvedAt)))
      .all()
      .map((r) => r.id)
    return this.solvedIds
  }

  private passedCount(kind: string, scopeId?: string): number {
    const rows = this.orm
      .select({ scopeId: assessments.scopeId })
      .from(assessments)
      .where(and(eq(assessments.userId, this.userId), eq(assessments.kind, kind), eq(assessments.passed, true)))
      .all()
    return scopeId ? rows.filter((r) => r.scopeId === scopeId).length : rows.length
  }

  value(metric: AchievementMetric): number {
    switch (metric.kind) {
      case 'solved_total':
        return this.solved().filter((id) => this.catalog.byId.has(id)).length
      case 'solved_tag':
        return this.solved().filter((id) => this.catalog.byId.get(id)?.tags.includes(metric.tag)).length
      case 'solved_type':
        return this.solved().filter((id) => this.catalog.byId.get(id)?.type === metric.type).length
      case 'first_try_total':
        return (
          this.orm
            .select({ n: count() })
            .from(exerciseProgress)
            .where(and(eq(exerciseProgress.userId, this.userId), eq(exerciseProgress.firstTry, true)))
            .get()?.n ?? 0
        )
      case 'correct_in_day':
        return (
          this.orm
            .select({ n: max(dailyActivity.correct) })
            .from(dailyActivity)
            .where(eq(dailyActivity.userId, this.userId))
            .get()?.n ?? 0
        )
      case 'streak': {
        const row = this.orm.select().from(users).where(eq(users.id, this.userId)).get()
        if (!row) return 0
        return Math.max(row.longestStreak, effectiveStreak(row, this.today))
      }
      case 'level_completed': {
        const level = this.catalog.levels.find((l) => l.id === metric.level)
        if (!level) return 0
        const ids = this.catalog.exercises.filter((e) => e.level === metric.level).map((e) => e.id)
        const solvedSet = new Set(this.solved())
        const solved = ids.filter((id) => solvedSet.has(id)).length
        return isLevelCompleted(solved, ids.length, this.passedCount('level_exam', metric.level) > 0) ? 1 : 0
      }
      case 'assessments_passed':
        return this.passedCount(metric.assessment)
      case 'speed_best':
        return (
          this.orm
            .select({ n: max(assessments.correctCount) })
            .from(assessments)
            .where(and(eq(assessments.userId, this.userId), eq(assessments.kind, 'speed'), isNotNull(assessments.finishedAt)))
            .get()?.n ?? 0
        )
      case 'playground_queries':
        return (
          this.orm.select({ n: count() }).from(queryHistory).where(eq(queryHistory.userId, this.userId)).get()?.n ?? 0
        )
      case 'playground_datasets':
        return (
          this.orm
            .select({ n: countDistinct(queryHistory.dataset) })
            .from(queryHistory)
            .where(and(eq(queryHistory.userId, this.userId), eq(queryHistory.success, true)))
            .get()?.n ?? 0
        )
      case 'learning_minutes': {
        const row = this.orm.select({ s: users.learningSeconds }).from(users).where(eq(users.id, this.userId)).get()
        return Math.floor((row?.s ?? 0) / 60)
      }
    }
  }
}

/**
 * Evaluates achievement conditions against real progress data and unlocks them.
 */
export class AchievementsService {
  constructor(
    private readonly db: AppDatabase,
    private readonly catalog: Catalog,
    private readonly now: () => number = Date.now
  ) {}

  private unlockedMap(orm: Orm, userId: string): Map<string, number> {
    return new Map(
      orm
        .select()
        .from(userAchievements)
        .where(eq(userAchievements.userId, userId))
        .all()
        .map((r) => [r.achievementId, r.unlockedAt])
    )
  }

  evaluate(userId: string): UnlockedAchievement[] {
    return this.db.write((orm) => {
      const today = localDate(this.now())
      const unlocked = this.unlockedMap(orm, userId)
      const ctx = new MetricContext(orm, this.catalog, userId, today)
      const fresh: AchievementDefinition[] = []
      for (const def of ACHIEVEMENTS) {
        if (unlocked.has(def.id)) continue
        if (ctx.value(def.metric) >= def.threshold) fresh.push(def)
      }
      const at = this.now()
      for (const def of fresh) {
        orm.insert(userAchievements).values({ userId, achievementId: def.id, unlockedAt: at }).onConflictDoNothing().run()
        grantXp(orm, userId, def.xpReward, today)
      }
      return fresh.map((d) => ({ id: d.id, title: d.title, description: d.description[getLocale()], icon: d.icon, xpReward: d.xpReward }))
    })
  }

  list(userId: string): AchievementDto[] {
    const orm = this.db.orm
    const unlocked = this.unlockedMap(orm, userId)
    const ctx = new MetricContext(orm, this.catalog, userId, localDate(this.now()))
    return ACHIEVEMENTS.map((def) => ({
      id: def.id,
      title: def.title,
      description: def.description[getLocale()],
      icon: def.icon,
      category: def.category,
      xpReward: def.xpReward,
      threshold: def.threshold,
      current: Math.min(ctx.value(def.metric), def.threshold),
      unlockedAt: unlocked.get(def.id) ?? null
    }))
  }
}
