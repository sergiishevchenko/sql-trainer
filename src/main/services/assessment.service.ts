import { and, desc, eq, isNull } from 'drizzle-orm'
import {
  ASSESSMENT_XP,
  DAILY_TASKS_COUNT,
  LEVEL_EXAM_SIZE,
  MODULE_TEST_SIZE,
  SPEED_ROUND_SECONDS,
  SPEED_ROUND_SIZE,
  TEST_PASS_RATIO,
  type AssessmentKind,
  type LevelId
} from '@shared/constants/domain'
import type { ExerciseAnswer, SubmitResult } from '@shared/types/exercise'
import type { AssessmentAnswerDto, AssessmentDto, DailyTasksDto } from '@shared/types/learning'
import type { AppDatabase } from '../database/connection'
import { assessments } from '../database/schema'
import { AppError, notFound } from '../errors'
import type { ResolvedExercise } from '../content/loader'
import { deterministicShuffle } from '../content/programs'
import { tr } from '../i18n'
import { localDate } from '../utils/date'
import type { AchievementsService } from './achievements.service'
import type { CatalogService } from './catalog.service'
import type { ProgressService } from './progress.service'
import { grantXp } from './xp'

type AssessmentRow = typeof assessments.$inferSelect

const LOCKED_KINDS: AssessmentKind[] = ['module_test', 'level_exam', 'speed']
const QUICK_TYPES = new Set(['choose_query', 'explain_query', 'predict_result', 'fill_blank', 'order_parts'])
const LEVEL_EXAM_SECONDS = 40 * 60

function randomSample<T>(items: T[], size: number, seed: string): T[] {
  return deterministicShuffle(items, seed).slice(0, size)
}

/**
 * Structured practice sessions built from catalog exercises.
 */
export class AssessmentService {
  constructor(
    private readonly db: AppDatabase,
    private readonly catalog: CatalogService,
    private readonly progress: ProgressService,
    private readonly achievements: AchievementsService,
    private readonly now: () => number = Date.now
  ) {}

  private title(kind: AssessmentKind, scopeId: string | null, fallback: string): string {
    const text = this.catalog.text
    switch (kind) {
      case 'module_test':
        return scopeId && this.catalog.catalog.modules.has(scopeId) ? tr('assessment.moduleTest', { title: text.moduleTitle(scopeId) }) : fallback
      case 'level_exam':
        return scopeId ? tr('assessment.levelExam', { title: text.levelTitle(scopeId) }) : fallback
      case 'speed':
        return tr('assessment.speed')
      case 'review':
        return tr('assessment.review')
      case 'project': {
        const project = this.catalog.catalog.projects.find((p) => p.id === scopeId)
        return project ? tr('assessment.project', { title: text.project(project).title }) : fallback
      }
      case 'daily':
        return tr('assessment.daily')
    }
  }

  private toDto(row: AssessmentRow): AssessmentDto {
    return {
      id: row.id,
      kind: row.kind as AssessmentKind,
      scopeId: row.scopeId,
      title: this.title(row.kind as AssessmentKind, row.scopeId, row.title),
      exerciseIds: JSON.parse(row.exerciseIds) as string[],
      startedAt: row.startedAt,
      finishedAt: row.finishedAt,
      timeLimitSec: row.timeLimitSec,
      correctCount: row.correctCount,
      total: row.total,
      score: row.score,
      passed: row.passed,
      xpAwarded: row.xpAwarded,
      answers: JSON.parse(row.answers) as Record<string, AssessmentAnswerDto>
    }
  }

  private row(userId: string, id: number): AssessmentRow {
    const row = this.db.orm
      .select()
      .from(assessments)
      .where(and(eq(assessments.id, id), eq(assessments.userId, userId)))
      .get()
    if (!row) throw notFound('assessment')
    return row
  }

  private isExpired(row: AssessmentRow): boolean {
    return row.timeLimitSec !== null && this.now() > row.startedAt + row.timeLimitSec * 1000 + 5000
  }

  get(userId: string, id: number): AssessmentDto {
    let row = this.row(userId, id)
    if (!row.finishedAt && this.isExpired(row)) {
      this.finish(userId, id)
      row = this.row(userId, id)
    }
    return this.toDto(row)
  }

  recent(userId: string): AssessmentDto[] {
    return this.db.orm
      .select()
      .from(assessments)
      .where(eq(assessments.userId, userId))
      .orderBy(desc(assessments.startedAt))
      .limit(20)
      .all()
      .map((r) => this.toDto(r))
  }

  private openAssessment(userId: string, kind: AssessmentKind, scopeId: string | null): AssessmentRow | undefined {
    return this.db.orm
      .select()
      .from(assessments)
      .where(
        and(
          eq(assessments.userId, userId),
          eq(assessments.kind, kind),
          scopeId === null ? isNull(assessments.scopeId) : eq(assessments.scopeId, scopeId),
          isNull(assessments.finishedAt)
        )
      )
      .orderBy(desc(assessments.startedAt))
      .get()
  }

  private pick(userId: string, kind: AssessmentKind, scopeId: string | null): { title: string; ids: string[]; timeLimitSec: number | null } {
    const all = this.catalog.catalog.exercises
    const progress = this.catalog.progressMap(userId)
    const seed = `${userId}:${kind}:${scopeId}:${this.now()}`
    switch (kind) {
      case 'module_test': {
        const module = scopeId ? this.catalog.catalog.modules.get(scopeId) : undefined
        if (!module) throw notFound('module')
        const pool = all.filter((e) => e.module === module.id)
        const quick = randomSample(pool.filter((e) => QUICK_TYPES.has(e.type)), Math.ceil(MODULE_TEST_SIZE / 2), seed)
        const rest = randomSample(pool.filter((e) => !quick.includes(e)), MODULE_TEST_SIZE - quick.length, `${seed}:rest`)
        const ids = deterministicShuffle([...quick, ...rest], seed).map((e) => e.id)
        if (ids.length === 0) throw new AppError('not_found', 'errors.emptyAssessment')
        return { title: this.title(kind, module.id, module.title), ids, timeLimitSec: null }
      }
      case 'level_exam': {
        const level = this.catalog.catalog.levels.find((l) => l.id === scopeId)
        if (!level) throw notFound('level')
        const perModule = level.modules.map((m) => randomSample(all.filter((e) => e.module === m.id), 2, `${seed}:${m.id}`))
        const picked: ResolvedExercise[] = []
        for (let round = 0; picked.length < LEVEL_EXAM_SIZE && round < 2; round += 1) {
          for (const group of deterministicShuffle(perModule, `${seed}:${round}`)) {
            if (group[round] && picked.length < LEVEL_EXAM_SIZE) picked.push(group[round])
          }
        }
        if (picked.length === 0) throw new AppError('not_found', 'errors.emptyAssessment')
        return { title: this.title(kind, level.id, level.title), ids: picked.map((e) => e.id), timeLimitSec: LEVEL_EXAM_SECONDS }
      }
      case 'speed': {
        const levelIds = scopeId ? [scopeId] : (['beginner', 'fundamentals'] as LevelId[])
        const pool = all.filter((e) => levelIds.includes(e.level) && (QUICK_TYPES.has(e.type) || e.difficulty === 'easy'))
        const ids = randomSample(pool, SPEED_ROUND_SIZE, seed).map((e) => e.id)
        if (ids.length === 0) throw new AppError('not_found', 'errors.emptyAssessment')
        return { title: tr('assessment.speed'), ids, timeLimitSec: SPEED_ROUND_SECONDS }
      }
      case 'review': {
        const failing = all
          .filter((e) => progress.get(e.id)?.status === 'needs_review')
          .sort((a, b) => (progress.get(b.id)?.failedSinceSolve ?? 0) - (progress.get(a.id)?.failedSinceSolve ?? 0))
        const shaky = all.filter((e) => {
          const p = progress.get(e.id)
          return p && p.status !== 'needs_review' && p.attempts - p.correctAttempts >= 2
        })
        const ids = [...failing, ...shaky].slice(0, 10).map((e) => e.id)
        if (ids.length === 0) throw new AppError('not_found', 'errors.nothingToReview')
        return { title: tr('assessment.review'), ids, timeLimitSec: null }
      }
      case 'project': {
        const project = this.catalog.catalog.projects.find((p) => p.id === scopeId)
        if (!project) throw notFound('project')
        return { title: this.title(kind, project.id, project.title), ids: project.exercises, timeLimitSec: null }
      }
      case 'daily':
        return { title: tr('assessment.daily'), ids: this.dailyExerciseIds(userId, scopeId ?? localDate(this.now())), timeLimitSec: null }
    }
  }

  private dailyExerciseIds(userId: string, date: string): string[] {
    const all = this.catalog.catalog.exercises
    const progress = this.catalog.progressMap(userId)
    const levels = this.catalog.levels(userId)
    const current = levels.find((l) => !l.completed) ?? levels[levels.length - 1]
    const unsolved = all.filter((e) => e.level === current.id && !progress.get(e.id)?.firstSolvedAt)
    const repetition = all.filter((e) => progress.get(e.id)?.status === 'needs_review' || progress.get(e.id)?.firstSolvedAt)
    const seed = `${userId}:daily:${date}`
    const picked = randomSample(unsolved, DAILY_TASKS_COUNT - 1, seed)
    const extra = randomSample(repetition.filter((e) => !picked.includes(e)), 1, `${seed}:rep`)
    const result = [...picked, ...extra]
    if (result.length < DAILY_TASKS_COUNT) {
      const filler = randomSample(all.filter((e) => !result.includes(e)), DAILY_TASKS_COUNT - result.length, `${seed}:fill`)
      result.push(...filler)
    }
    return result.map((e) => e.id)
  }

  start(userId: string, kind: AssessmentKind, scopeId?: string): AssessmentDto {
    const scope = kind === 'daily' ? localDate(this.now()) : (scopeId ?? null)
    const open = this.openAssessment(userId, kind, scope)
    if (open) {
      if (!this.isExpired(open)) return this.toDto(open)
      this.finish(userId, open.id)
    }
    if (kind === 'daily') {
      const existing = this.db.orm
        .select()
        .from(assessments)
        .where(and(eq(assessments.userId, userId), eq(assessments.kind, 'daily'), eq(assessments.scopeId, scope!)))
        .get()
      if (existing) return this.toDto(existing)
    }
    const { title, ids, timeLimitSec } = this.pick(userId, kind, scope)
    const id = this.db.write((orm) =>
      orm
        .insert(assessments)
        .values({
          userId,
          kind,
          scopeId: scope,
          title,
          exerciseIds: JSON.stringify(ids),
          startedAt: this.now(),
          timeLimitSec,
          total: ids.length
        })
        .returning({ id: assessments.id })
        .get()
    ).id
    return this.toDto(this.row(userId, id))
  }

  async submit(
    userId: string,
    assessmentId: number,
    exerciseId: string,
    answer: ExerciseAnswer,
    durationMs: number
  ): Promise<SubmitResult> {
    const row = this.row(userId, assessmentId)
    const kind = row.kind as AssessmentKind
    const ids = JSON.parse(row.exerciseIds) as string[]
    if (!ids.includes(exerciseId)) throw new AppError('forbidden', 'errors.notInAssessment')
    if (row.finishedAt && kind !== 'daily') throw new AppError('forbidden', 'errors.assessmentFinished')
    if (this.isExpired(row)) {
      this.finish(userId, assessmentId)
      throw new AppError('forbidden', 'errors.assessmentExpired')
    }
    const answers = JSON.parse(row.answers) as Record<string, AssessmentAnswerDto>
    if (LOCKED_KINDS.includes(kind) && answers[exerciseId]) throw new AppError('forbidden', 'errors.alreadyAnswered')

    const result = await this.progress.submit(userId, { exerciseId, answer, durationMs, context: kind, assessmentId })

    const fresh = this.row(userId, assessmentId)
    const freshAnswers = JSON.parse(fresh.answers) as Record<string, AssessmentAnswerDto>
    if (!freshAnswers[exerciseId]?.correct) {
      freshAnswers[exerciseId] = { correct: result.grade.correct, answeredAt: this.now() }
    }
    const correctCount = Object.values(freshAnswers).filter((a) => a.correct).length
    this.db.write((orm) =>
      orm
        .update(assessments)
        .set({ answers: JSON.stringify(freshAnswers), correctCount })
        .where(eq(assessments.id, assessmentId))
        .run()
    )
    if (kind === 'daily' && !fresh.finishedAt && correctCount === ids.length) {
      this.finish(userId, assessmentId)
    }
    return result
  }

  finish(userId: string, assessmentId: number): AssessmentDto {
    const row = this.row(userId, assessmentId)
    if (row.finishedAt) return this.toDto(row)
    const kind = row.kind as AssessmentKind
    const answers = JSON.parse(row.answers) as Record<string, AssessmentAnswerDto>
    const correct = Object.values(answers).filter((a) => a.correct).length
    const ratio = row.total > 0 ? correct / row.total : 0
    let passed: boolean
    switch (kind) {
      case 'module_test':
      case 'level_exam':
        passed = ratio >= TEST_PASS_RATIO
        break
      case 'speed':
        passed = correct >= 5
        break
      default:
        passed = correct === row.total
    }
    const today = localDate(this.now())
    this.db.write((orm) => {
      const alreadyRewarded = orm
        .select({ id: assessments.id })
        .from(assessments)
        .where(
          and(
            eq(assessments.userId, userId),
            eq(assessments.kind, kind),
            row.scopeId === null ? isNull(assessments.scopeId) : eq(assessments.scopeId, row.scopeId),
            eq(assessments.passed, true)
          )
        )
        .get()
      const repeatable = kind === 'speed' || kind === 'review'
      const xp = passed && (repeatable || !alreadyRewarded) ? (kind === 'speed' ? Math.min(correct * 3, 60) : ASSESSMENT_XP[kind]) : 0
      orm
        .update(assessments)
        .set({ finishedAt: this.now(), correctCount: correct, score: Math.round(ratio * 100), passed, xpAwarded: xp })
        .where(eq(assessments.id, assessmentId))
        .run()
      grantXp(orm, userId, xp, today)
      this.achievements.evaluate(userId)
    })
    return this.toDto(this.row(userId, assessmentId))
  }

  daily(userId: string): DailyTasksDto {
    const date = localDate(this.now())
    const dto = this.start(userId, 'daily')
    return {
      date,
      exercises: this.catalog.summaries(userId, dto.exerciseIds),
      completed: dto.exerciseIds.filter((id) => dto.answers[id]?.correct).length,
      assessmentId: dto.id,
      bonusClaimed: dto.passed
    }
  }
}
