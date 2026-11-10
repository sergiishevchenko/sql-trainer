import { and, desc, eq, sql } from 'drizzle-orm'
import { REVIEW_FAIL_THRESHOLD, type AttemptContext, type ProgressStatus } from '@shared/constants/domain'
import type {
  ExerciseAnswer,
  ExerciseProgressDto,
  ExerciseSummary,
  RevealedSolution,
  RunResult,
  SubmitResult
} from '@shared/types/exercise'
import type { AppDatabase, Orm } from '../database/connection'
import {
  exerciseAttempts,
  exerciseProgress,
  favorites,
  learningSessions,
  userNotes,
  users
} from '../database/schema'
import { solutionText } from '../content/programs'
import { tr } from '../i18n'
import { localDate } from '../utils/date'
import type { AchievementsService } from './achievements.service'
import type { CatalogService, ProgressRow } from './catalog.service'
import type { GradingService } from './grading.service'
import type { UsersService } from './users.service'
import { bumpDailyActivity, grantXp, markActiveDay } from './xp'

const SESSION_GAP_MS = 3 * 60 * 1000
const REVIEW_CONTEXTS: AttemptContext[] = ['review', 'module_test', 'level_exam']

export interface SubmitOptions {
  exerciseId: string
  answer: ExerciseAnswer
  durationMs: number
  context: AttemptContext
  assessmentId?: number
}

export function nextStatus(
  current: ProgressRow | undefined,
  correct: boolean,
  context: AttemptContext
): ProgressStatus {
  if (correct) return 'solved'
  const wasSolved = Boolean(current?.firstSolvedAt)
  if (wasSolved) return REVIEW_CONTEXTS.includes(context) ? 'needs_review' : ((current?.status as ProgressStatus) ?? 'solved')
  const failures = (current?.attempts ?? 0) - (current?.correctAttempts ?? 0) + 1
  return failures >= REVIEW_FAIL_THRESHOLD ? 'needs_review' : 'in_progress'
}

function toDto(row: ProgressRow | undefined): ExerciseProgressDto {
  return {
    status: (row?.status as ProgressStatus | undefined) ?? 'not_started',
    attempts: row?.attempts ?? 0,
    correctAttempts: row?.correctAttempts ?? 0,
    draft: row?.draft ?? null,
    solutionRevealed: row?.solutionRevealed ?? false,
    firstSolvedAt: row?.firstSolvedAt ?? null,
    bestTimeMs: row?.bestTimeMs ?? null
  }
}

/**
 * Records attempts and maintains progress, XP, streaks and daily activity in single transactions.
 */
export class ProgressService {
  constructor(
    private readonly db: AppDatabase,
    private readonly catalog: CatalogService,
    private readonly grading: GradingService,
    private readonly achievements: AchievementsService,
    private readonly usersService: UsersService,
    private readonly now: () => number = Date.now
  ) {}

  private progressRow(orm: Orm, userId: string, exerciseId: string): ProgressRow | undefined {
    return orm
      .select()
      .from(exerciseProgress)
      .where(and(eq(exerciseProgress.userId, userId), eq(exerciseProgress.exerciseId, exerciseId)))
      .get()
  }

  private upsertProgress(orm: Orm, userId: string, exerciseId: string, patch: Partial<ProgressRow>): void {
    const now = this.now()
    orm
      .insert(exerciseProgress)
      .values({ userId, exerciseId, status: 'in_progress', updatedAt: now, ...patch })
      .onConflictDoUpdate({
        target: [exerciseProgress.userId, exerciseProgress.exerciseId],
        set: { ...patch, updatedAt: now }
      })
      .run()
  }

  touch(userId: string, exerciseId: string): void {
    this.catalog.get(exerciseId)
    this.db.write((orm) => {
      const current = this.progressRow(orm, userId, exerciseId)
      if (!current) this.upsertProgress(orm, userId, exerciseId, { status: 'in_progress' })
      else this.upsertProgress(orm, userId, exerciseId, {})
      orm.update(users).set({ lastExerciseId: exerciseId }).where(eq(users.id, userId)).run()
    })
  }

  async run(userId: string, exerciseId: string, answer: ExerciseAnswer): Promise<RunResult> {
    const ex = this.catalog.get(exerciseId)
    const result = await this.grading.run(ex, answer)
    this.touch(userId, exerciseId)
    return result
  }

  async submit(userId: string, options: SubmitOptions): Promise<SubmitResult> {
    const ex = this.catalog.get(options.exerciseId)
    const grade = await this.grading.grade(ex, options.answer)

    if (grade.error?.code === 'internal') {
      const current = this.progressRow(this.db.orm, userId, ex.id)
      return { grade, xpAwarded: 0, levelUp: null, unlockedAchievements: [], progress: toDto(current), explanation: null, dailyGoalReached: false }
    }

    const now = this.now()
    const today = localDate(now)
    const goal = this.usersService.settings(userId).dailyGoal

    const outcome = this.db.write((orm) => {
      const current = this.progressRow(orm, userId, ex.id)
      const isFirstSolve = grade.correct && !current?.firstSolvedAt
      const xp = isFirstSolve && !current?.solutionRevealed ? ex.xp : 0
      const status = nextStatus(current, grade.correct, options.context)
      const xpBefore = this.todayXp(orm, userId, today)

      orm
        .insert(exerciseAttempts)
        .values({
          userId,
          exerciseId: ex.id,
          submittedAt: now,
          isCorrect: grade.correct,
          answer: JSON.stringify(options.answer),
          durationMs: options.durationMs,
          xpAwarded: xp,
          errorCode: grade.error?.code ?? grade.issue?.code ?? null,
          context: options.context,
          assessmentId: options.assessmentId ?? null
        })
        .run()

      this.upsertProgress(orm, userId, ex.id, {
        status,
        attempts: (current?.attempts ?? 0) + 1,
        correctAttempts: (current?.correctAttempts ?? 0) + (grade.correct ? 1 : 0),
        failedSinceSolve: grade.correct ? 0 : (current?.failedSinceSolve ?? 0) + 1,
        firstSolvedAt: current?.firstSolvedAt ?? (grade.correct ? now : null),
        firstTry: current?.firstTry || (isFirstSolve && (current?.attempts ?? 0) === 0),
        lastAttemptAt: now,
        bestTimeMs: grade.correct
          ? Math.min(current?.bestTimeMs ?? Number.MAX_SAFE_INTEGER, options.durationMs)
          : (current?.bestTimeMs ?? null),
        xpEarned: (current?.xpEarned ?? 0) + xp
      })

      bumpDailyActivity(orm, userId, today, {
        attempts: 1,
        correct: grade.correct ? 1 : 0,
        solved: isFirstSolve ? 1 : 0
      })
      if (isFirstSolve) {
        orm
          .update(users)
          .set({ completedCount: sql`${users.completedCount} + 1` })
          .where(eq(users.id, userId))
          .run()
      }
      orm.update(users).set({ lastExerciseId: ex.id }).where(eq(users.id, userId)).run()
      markActiveDay(orm, userId, today)
      const levels = grantXp(orm, userId, xp, today)
      const unlocked = this.achievements.evaluate(userId)
      const levelAfter = orm.select({ level: users.level }).from(users).where(eq(users.id, userId)).get()?.level ?? levels.to
      const xpAfter = this.todayXp(orm, userId, today)
      return {
        xp,
        unlocked,
        levelUp: levelAfter > levels.from ? { from: levels.from, to: levelAfter } : null,
        dailyGoalReached: xpBefore < goal && xpAfter >= goal,
        progress: toDto(this.progressRow(orm, userId, ex.id))
      }
    })

    return {
      grade,
      xpAwarded: outcome.xp,
      levelUp: outcome.levelUp,
      unlockedAchievements: outcome.unlocked,
      progress: outcome.progress,
      explanation: grade.correct ? this.catalog.text.exercise(ex).explanation : null,
      dailyGoalReached: outcome.dailyGoalReached
    }
  }

  private todayXp(orm: Orm, userId: string, today: string): number {
    const row = orm.all<{ xp: number }>(sql`SELECT xp FROM daily_activity WHERE user_id = ${userId} AND date = ${today}`)
    return row[0]?.xp ?? 0
  }

  saveDraft(userId: string, exerciseId: string, draft: string): void {
    this.catalog.get(exerciseId)
    this.db.write((orm) => {
      const current = this.progressRow(orm, userId, exerciseId)
      this.upsertProgress(orm, userId, exerciseId, {
        draft,
        status: (current?.status as ProgressStatus | undefined) === 'not_started' || !current ? 'in_progress' : (current.status as ProgressStatus)
      })
    })
  }

  async reveal(userId: string, exerciseId: string): Promise<RevealedSolution> {
    const ex = this.catalog.get(exerciseId)
    const text = this.catalog.text.exercise(ex)
    let solution = solutionText(ex)
    if (ex.type === 'predict_result') {
      const expected = await this.grading.predictionAnswer(ex)
      solution = 'error' in expected ? ex.sql : `${tr('reveal.correctAnswer', { answer: expected.answer })}\n${ex.sql}`
    } else if (ex.type === 'explain_query') {
      const options = text.options ?? ex.options
      solution = `${tr('reveal.correctExplanation', { text: options[ex.correct] })}\n${ex.sql}`
    }
    this.db.write((orm) => {
      const current = this.progressRow(orm, userId, exerciseId)
      this.upsertProgress(orm, userId, exerciseId, {
        solutionRevealed: true,
        status: (current?.status as ProgressStatus | undefined) ?? 'in_progress'
      })
    })
    return { solution, explanation: text.explanation }
  }

  toggleFavorite(userId: string, exerciseId: string): boolean {
    this.catalog.get(exerciseId)
    return this.db.write((orm) => {
      const existing = orm
        .select()
        .from(favorites)
        .where(and(eq(favorites.userId, userId), eq(favorites.exerciseId, exerciseId)))
        .get()
      if (existing) {
        orm.delete(favorites).where(and(eq(favorites.userId, userId), eq(favorites.exerciseId, exerciseId))).run()
        return false
      }
      orm.insert(favorites).values({ userId, exerciseId, createdAt: this.now() }).run()
      return true
    })
  }

  markReview(userId: string, exerciseId: string, review: boolean): void {
    this.catalog.get(exerciseId)
    this.db.write((orm) => {
      const current = this.progressRow(orm, userId, exerciseId)
      const status: ProgressStatus = review ? 'needs_review' : current?.firstSolvedAt ? 'solved' : 'in_progress'
      this.upsertProgress(orm, userId, exerciseId, { status })
    })
  }

  saveNote(userId: string, exerciseId: string, content: string): void {
    this.catalog.get(exerciseId)
    this.db.write((orm) => {
      if (!content.trim()) {
        orm.delete(userNotes).where(and(eq(userNotes.userId, userId), eq(userNotes.exerciseId, exerciseId))).run()
        return
      }
      orm
        .insert(userNotes)
        .values({ userId, exerciseId, content, updatedAt: this.now() })
        .onConflictDoUpdate({ target: [userNotes.userId, userNotes.exerciseId], set: { content, updatedAt: this.now() } })
        .run()
    })
  }

  /**
   * Next exercise to continue with: the last opened unfinished one, otherwise the first unsolved in curriculum order.
   */
  next(userId: string): ExerciseSummary | null {
    const progress = this.catalog.progressMap(userId)
    const user = this.usersService.row(userId)
    const last = user.lastExerciseId ? this.catalog.catalog.byId.get(user.lastExerciseId) : undefined
    if (last && !progress.get(last.id)?.firstSolvedAt) return this.catalog.summaries(userId, [last.id])[0] ?? null
    const lastIndex = last ? this.catalog.catalog.exercises.findIndex((e) => e.id === last.id) : -1
    const ordered = [
      ...this.catalog.catalog.exercises.slice(lastIndex + 1),
      ...this.catalog.catalog.exercises.slice(0, lastIndex + 1)
    ]
    const candidate = ordered.find((e) => !progress.get(e.id)?.firstSolvedAt)
    return candidate ? (this.catalog.summaries(userId, [candidate.id])[0] ?? null) : null
  }

  recordActivity(userId: string, seconds: number): void {
    const now = this.now()
    const today = localDate(now)
    this.db.write((orm) => {
      bumpDailyActivity(orm, userId, today, { seconds })
      orm
        .update(users)
        .set({ learningSeconds: sql`${users.learningSeconds} + ${seconds}` })
        .where(eq(users.id, userId))
        .run()
      const last = orm
        .select()
        .from(learningSessions)
        .where(eq(learningSessions.userId, userId))
        .orderBy(desc(learningSessions.lastSeenAt))
        .limit(1)
        .get()
      if (last && now - last.lastSeenAt <= SESSION_GAP_MS) {
        orm
          .update(learningSessions)
          .set({ lastSeenAt: now, seconds: last.seconds + seconds })
          .where(eq(learningSessions.id, last.id))
          .run()
      } else {
        orm.insert(learningSessions).values({ userId, startedAt: now - seconds * 1000, lastSeenAt: now, seconds }).run()
      }
    })
  }
}
