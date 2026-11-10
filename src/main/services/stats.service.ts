import { and, desc, eq, gte } from 'drizzle-orm'
import type { AttemptContext } from '@shared/constants/domain'
import type { AttemptDto, ExerciseSummary } from '@shared/types/exercise'
import type { AnalyticsData, DashboardData, DayActivity, TopicStat } from '@shared/types/learning'
import type { AppDatabase } from '../database/connection'
import { dailyActivity, exerciseAttempts } from '../database/schema'
import { addDays, lastNDates, localDate } from '../utils/date'
import type { AchievementsService } from './achievements.service'
import type { AssessmentService } from './assessment.service'
import type { CatalogService } from './catalog.service'
import type { ProgressService } from './progress.service'
import type { UsersService } from './users.service'

export class StatsService {
  constructor(
    private readonly db: AppDatabase,
    private readonly catalog: CatalogService,
    private readonly usersService: UsersService,
    private readonly progress: ProgressService,
    private readonly achievements: AchievementsService,
    private readonly assessments: AssessmentService,
    private readonly now: () => number = Date.now
  ) {}

  activity(userId: string, days: number): DayActivity[] {
    const today = localDate(this.now())
    const from = addDays(today, -(days - 1))
    const rows = this.db.orm
      .select()
      .from(dailyActivity)
      .where(and(eq(dailyActivity.userId, userId), gte(dailyActivity.date, from)))
      .all()
    const byDate = new Map(rows.map((r) => [r.date, r]))
    return lastNDates(days, today).map((date) => {
      const r = byDate.get(date)
      return { date, xp: r?.xp ?? 0, solved: r?.solved ?? 0, attempts: r?.attempts ?? 0, correct: r?.correct ?? 0, seconds: r?.seconds ?? 0 }
    })
  }

  private recommended(userId: string, exclude: Set<string>): ExerciseSummary[] {
    const progress = this.catalog.progressMap(userId)
    const all = this.catalog.catalog.exercises
    const review = all.filter((e) => progress.get(e.id)?.status === 'needs_review' && !exclude.has(e.id)).slice(0, 2)
    const levels = this.catalog.levels(userId)
    const current = levels.find((l) => !l.completed) ?? levels[levels.length - 1]
    const seenModules = new Set<string>()
    const fresh = all.filter((e) => {
      if (e.level !== current.id || progress.get(e.id)?.firstSolvedAt || exclude.has(e.id) || seenModules.has(e.module)) return false
      seenModules.add(e.module)
      return true
    })
    const picked = [...review, ...fresh].slice(0, 4).map((e) => e.id)
    return this.catalog.summaries(userId, picked)
  }

  dashboard(userId: string): DashboardData {
    const user = this.usersService.profile(userId)
    const settings = this.usersService.settings(userId)
    const progress = this.catalog.progressMap(userId)
    const exercises = this.catalog.catalog.exercises
    let solved = 0
    let inProgress = 0
    let needsReview = 0
    for (const ex of exercises) {
      const p = progress.get(ex.id)
      if (p?.firstSolvedAt) solved += 1
      if (p?.status === 'in_progress') inProgress += 1
      if (p?.status === 'needs_review') needsReview += 1
    }
    const activity = this.activity(userId, 30)
    const today = activity[activity.length - 1]
    const unlocked = this.achievements
      .list(userId)
      .filter((a) => a.unlockedAt)
      .sort((a, b) => (b.unlockedAt ?? 0) - (a.unlockedAt ?? 0))
      .slice(0, 4)
    const continueExercise = this.progress.next(userId)
    const levels = this.catalog.levels(userId)
    const current = levels.find((l) => !l.completed) ?? levels[levels.length - 1]
    return {
      user,
      totals: {
        exercises: exercises.length,
        solved,
        inProgress,
        needsReview,
        progress: exercises.length > 0 ? solved / exercises.length : 0
      },
      today: { xp: today.xp, solved: today.solved, goal: settings.dailyGoal, goalReached: today.xp >= settings.dailyGoal },
      activity,
      recentAchievements: unlocked,
      continueExercise,
      recommended: this.recommended(userId, new Set(continueExercise ? [continueExercise.id] : [])),
      currentLevel: { id: current.id, title: current.title, progress: current.progress, solved: current.solved, total: current.total },
      daily: this.assessments.daily(userId)
    }
  }

  analytics(userId: string): AnalyticsData {
    const user = this.usersService.profile(userId)
    const progress = this.catalog.progressMap(userId)
    const exercises = this.catalog.catalog.exercises
    const attempts = this.db.orm
      .select({
        id: exerciseAttempts.id,
        exerciseId: exerciseAttempts.exerciseId,
        isCorrect: exerciseAttempts.isCorrect,
        submittedAt: exerciseAttempts.submittedAt,
        durationMs: exerciseAttempts.durationMs,
        xp: exerciseAttempts.xpAwarded,
        context: exerciseAttempts.context
      })
      .from(exerciseAttempts)
      .where(eq(exerciseAttempts.userId, userId))
      .orderBy(desc(exerciseAttempts.submittedAt))
      .all()

    const correct = attempts.filter((a) => a.isCorrect).length
    const solvedRows = [...progress.values()].filter((p) => p.firstSolvedAt && this.catalog.catalog.byId.has(p.exerciseId))
    const solveTimes = solvedRows.map((p) => p.bestTimeMs).filter((t): t is number => typeof t === 'number' && t > 0)

    const attemptsByExercise = new Map<string, { total: number; correct: number }>()
    for (const a of attempts) {
      const s = attemptsByExercise.get(a.exerciseId) ?? { total: 0, correct: 0 }
      s.total += 1
      if (a.isCorrect) s.correct += 1
      attemptsByExercise.set(a.exerciseId, s)
    }

    const byTopic: TopicStat[] = [...this.catalog.catalog.modules.values()]
      .sort((a, b) => a.position - b.position)
      .map((m) => {
        const list = exercises.filter((e) => e.module === m.id)
        let att = 0
        let cor = 0
        for (const e of list) {
          const s = attemptsByExercise.get(e.id)
          if (s) {
            att += s.total
            cor += s.correct
          }
        }
        return {
          moduleId: m.id,
          title: m.title,
          level: m.levelId,
          solved: list.filter((e) => progress.get(e.id)?.firstSolvedAt).length,
          total: list.length,
          attempts: att,
          correct: cor,
          accuracy: att > 0 ? cor / att : 0
        }
      })

    const practiced = byTopic.filter((t) => t.attempts >= 3)
    const strengths = [...practiced].sort((a, b) => b.accuracy - a.accuracy || b.solved - a.solved).slice(0, 4)
    const weaknesses = [...practiced]
      .filter((t) => t.accuracy < 0.85)
      .sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts)
      .slice(0, 4)

    const types = new Map<string, { solved: number; attempts: number; correct: number }>()
    for (const e of exercises) {
      const s = types.get(e.type) ?? { solved: 0, attempts: 0, correct: 0 }
      if (progress.get(e.id)?.firstSolvedAt) s.solved += 1
      const a = attemptsByExercise.get(e.id)
      if (a) {
        s.attempts += a.total
        s.correct += a.correct
      }
      types.set(e.type, s)
    }

    const recentAttempts: AttemptDto[] = attempts.slice(0, 20).map((a) => {
      const ex = this.catalog.catalog.byId.get(a.exerciseId)
      return {
        id: a.id,
        exerciseId: a.exerciseId,
        title: ex?.title ?? a.exerciseId,
        type: ex?.type ?? 'write_query',
        correct: a.isCorrect,
        submittedAt: a.submittedAt,
        durationMs: a.durationMs,
        xp: a.xp,
        context: a.context as AttemptContext
      }
    })

    const levels = this.catalog.levels(userId)
    return {
      totals: {
        solved: solvedRows.length,
        attempts: attempts.length,
        correct,
        incorrect: attempts.length - correct,
        accuracy: attempts.length > 0 ? correct / attempts.length : 0,
        avgSolveMs: solveTimes.length > 0 ? solveTimes.reduce((s, t) => s + t, 0) / solveTimes.length : 0,
        learningSeconds: user.learningSeconds,
        exercises: exercises.length,
        progress: exercises.length > 0 ? solvedRows.length / exercises.length : 0,
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak
      },
      activity: this.activity(userId, 90),
      byLevel: levels.map((l) => ({ level: l.id, title: l.title, solved: l.solved, total: l.total })),
      byTopic,
      byType: [...types.entries()].map(([type, s]) => ({ type, ...s })),
      strengths,
      weaknesses,
      recentAttempts
    }
  }
}
