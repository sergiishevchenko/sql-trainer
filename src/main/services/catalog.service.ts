import { and, eq, inArray, notInArray } from 'drizzle-orm'
import { ACHIEVEMENTS } from '@shared/constants/achievements'
import { DIFFICULTIES, type ProgressStatus } from '@shared/constants/domain'
import type { CatalogQuery } from '@shared/schemas/ipc'
import type { CatalogFacets, CatalogPage, ExerciseSummary, PublicExercise } from '@shared/types/exercise'
import type { LevelDto, ModuleDetailDto, ModuleSummaryDto, ProjectDto } from '@shared/types/learning'
import type { AppDatabase } from '../database/connection'
import {
  achievements,
  appMeta,
  assessments,
  courses,
  exerciseProgress,
  exercises,
  favorites,
  modules,
  userNotes
} from '../database/schema'
import { notFound } from '../errors'
import { referencedIdentifiers } from '../engine/guard'
import type { Catalog, ResolvedExercise } from '../content/loader'
import { referencePrograms, toPublicContent } from '../content/programs'
import type { DatasetStore } from '../engine/datasets'

export type ProgressRow = typeof exerciseProgress.$inferSelect

export const LEVEL_COMPLETION_RATIO = 0.8

export function isLevelCompleted(solved: number, total: number, examPassed: boolean): boolean {
  return examPassed || (total > 0 && solved / total >= LEVEL_COMPLETION_RATIO)
}

function snippetOf(markdown: string): string {
  const plain = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[`*_#>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return plain.length > 160 ? `${plain.slice(0, 157)}…` : plain
}

const STATUS_DEFAULT: ProgressStatus = 'not_started'

export class CatalogService {
  constructor(
    private readonly db: AppDatabase,
    readonly catalog: Catalog,
    private readonly datasets: DatasetStore,
    private readonly hiddenTestCount: (ex: ResolvedExercise) => number,
    private readonly now: () => number = Date.now
  ) {}

  /**
   * Synchronises the file-based catalog into the database. Exercises that disappeared from
   * the content files are deactivated rather than deleted so user progress is never lost.
   */
  importToDatabase(): { inserted: number; updated: number; deactivated: number } {
    const now = this.now()
    let inserted = 0
    let updated = 0
    let deactivated = 0
    this.db.write((orm) => {
      for (const level of this.catalog.levels) {
        orm
          .insert(courses)
          .values({ id: level.id, position: level.position, title: level.title, description: level.description })
          .onConflictDoUpdate({
            target: courses.id,
            set: { position: level.position, title: level.title, description: level.description }
          })
          .run()
        for (const m of level.modules) {
          const values = {
            id: m.id,
            courseId: level.id,
            position: m.position,
            title: m.title,
            description: m.description,
            theory: m.theory,
            tags: JSON.stringify(m.tags)
          }
          orm.insert(modules).values(values).onConflictDoUpdate({ target: modules.id, set: values }).run()
        }
      }

      const existing = new Map(
        orm
          .select({ id: exercises.id, hash: exercises.contentHash, position: exercises.position, active: exercises.isActive })
          .from(exercises)
          .all()
          .map((r) => [r.id, r])
      )
      for (const ex of this.catalog.exercises) {
        const values = {
          id: ex.id,
          moduleId: ex.module,
          courseId: ex.level,
          position: ex.position,
          type: ex.type,
          difficulty: ex.difficulty,
          title: ex.title,
          description: ex.description,
          dataset: ex.dataset,
          xp: ex.xp,
          minutes: ex.minutes,
          tags: JSON.stringify(ex.tags),
          contentHash: ex.contentHash,
          payload: JSON.stringify(ex),
          isActive: true,
          updatedAt: now
        }
        const current = existing.get(ex.id)
        if (!current) {
          orm.insert(exercises).values(values).run()
          inserted += 1
        } else if (current.hash !== ex.contentHash || current.position !== ex.position || !current.active) {
          orm.update(exercises).set(values).where(eq(exercises.id, ex.id)).run()
          updated += 1
        }
      }
      const activeIds = this.catalog.exercises.map((e) => e.id)
      const stale = orm
        .select({ id: exercises.id })
        .from(exercises)
        .where(activeIds.length > 0 ? and(eq(exercises.isActive, true), notInArray(exercises.id, activeIds)) : eq(exercises.isActive, true))
        .all()
      if (stale.length > 0) {
        orm
          .update(exercises)
          .set({ isActive: false, updatedAt: now })
          .where(
            inArray(
              exercises.id,
              stale.map((s) => s.id)
            )
          )
          .run()
        deactivated = stale.length
      }

      ACHIEVEMENTS.forEach((a, position) => {
        const values = {
          id: a.id,
          title: a.title,
          description: a.description,
          icon: a.icon,
          category: a.category,
          xpReward: a.xpReward,
          threshold: a.threshold,
          position
        }
        orm.insert(achievements).values(values).onConflictDoUpdate({ target: achievements.id, set: values }).run()
      })

      const meta = { key: 'catalog', value: JSON.stringify({ importedAt: now, exercises: activeIds.length }), updatedAt: now }
      orm.insert(appMeta).values(meta).onConflictDoUpdate({ target: appMeta.key, set: meta }).run()
    })
    return { inserted, updated, deactivated }
  }

  get(exerciseId: string): ResolvedExercise {
    const ex = this.catalog.byId.get(exerciseId)
    if (!ex) throw notFound('exercise')
    return ex
  }

  progressMap(userId: string): Map<string, ProgressRow> {
    return new Map(
      this.db.orm
        .select()
        .from(exerciseProgress)
        .where(eq(exerciseProgress.userId, userId))
        .all()
        .map((r) => [r.exerciseId, r])
    )
  }

  favoriteSet(userId: string): Set<string> {
    return new Set(
      this.db.orm
        .select({ id: favorites.exerciseId })
        .from(favorites)
        .where(eq(favorites.userId, userId))
        .all()
        .map((r) => r.id)
    )
  }

  summary(ex: ResolvedExercise, progress?: ProgressRow, isFavorite = false): ExerciseSummary {
    return {
      id: ex.id,
      title: ex.title,
      snippet: snippetOf(ex.description),
      type: ex.type,
      difficulty: ex.difficulty,
      level: ex.level,
      moduleId: ex.module,
      moduleTitle: this.catalog.modules.get(ex.module)?.title ?? ex.module,
      dataset: ex.dataset,
      xp: ex.xp,
      minutes: ex.minutes,
      tags: ex.tags,
      status: (progress?.status as ProgressStatus | undefined) ?? STATUS_DEFAULT,
      isFavorite,
      attempts: progress?.attempts ?? 0
    }
  }

  summaries(userId: string, ids: string[]): ExerciseSummary[] {
    const progress = this.progressMap(userId)
    const favs = this.favoriteSet(userId)
    return ids
      .map((id) => this.catalog.byId.get(id))
      .filter((ex): ex is ResolvedExercise => Boolean(ex))
      .map((ex) => this.summary(ex, progress.get(ex.id), favs.has(ex.id)))
  }

  list(userId: string, query: Required<Pick<CatalogQuery, 'sort' | 'limit' | 'offset'>> & CatalogQuery): CatalogPage {
    const progress = this.progressMap(userId)
    const favs = this.favoriteSet(userId)
    const search = query.search?.trim().toLowerCase()
    const filtered = this.catalog.exercises.filter((ex) => {
      if (query.level && ex.level !== query.level) return false
      if (query.moduleId && ex.module !== query.moduleId) return false
      if (query.type && ex.type !== query.type) return false
      if (query.difficulty && ex.difficulty !== query.difficulty) return false
      if (query.favoritesOnly && !favs.has(ex.id)) return false
      if (query.xpMin !== undefined && ex.xp < query.xpMin) return false
      if (query.xpMax !== undefined && ex.xp > query.xpMax) return false
      if (query.minutesMax !== undefined && ex.minutes > query.minutesMax) return false
      if (query.status) {
        const status = (progress.get(ex.id)?.status as ProgressStatus | undefined) ?? STATUS_DEFAULT
        if (status !== query.status) return false
      }
      if (search) {
        const haystack = `${ex.title} ${ex.description} ${ex.tags.join(' ')} ${ex.id}`.toLowerCase()
        if (!search.split(/\s+/).every((word) => haystack.includes(word))) return false
      }
      return true
    })
    const difficultyRank = (d: string) => DIFFICULTIES.indexOf(d as (typeof DIFFICULTIES)[number])
    const sorted = [...filtered]
    switch (query.sort) {
      case 'xp_desc':
        sorted.sort((a, b) => b.xp - a.xp || a.position - b.position)
        break
      case 'xp_asc':
        sorted.sort((a, b) => a.xp - b.xp || a.position - b.position)
        break
      case 'difficulty':
        sorted.sort((a, b) => difficultyRank(a.difficulty) - difficultyRank(b.difficulty) || a.position - b.position)
        break
      case 'title':
        sorted.sort((a, b) => a.title.localeCompare(b.title, 'ru'))
        break
      case 'minutes':
        sorted.sort((a, b) => a.minutes - b.minutes || a.position - b.position)
        break
      default:
        break
    }
    const page = sorted.slice(query.offset, query.offset + query.limit)
    return {
      total: filtered.length,
      items: page.map((ex) => this.summary(ex, progress.get(ex.id), favs.has(ex.id)))
    }
  }

  facets(): CatalogFacets {
    const byLevel: Record<string, number> = {}
    const byType: Record<string, number> = {}
    const byDifficulty: Record<string, number> = {}
    const moduleCounts = new Map<string, number>()
    let xpMin = Infinity
    let xpMax = 0
    let minMin = Infinity
    let minMax = 0
    for (const ex of this.catalog.exercises) {
      byLevel[ex.level] = (byLevel[ex.level] ?? 0) + 1
      byType[ex.type] = (byType[ex.type] ?? 0) + 1
      byDifficulty[ex.difficulty] = (byDifficulty[ex.difficulty] ?? 0) + 1
      moduleCounts.set(ex.module, (moduleCounts.get(ex.module) ?? 0) + 1)
      xpMin = Math.min(xpMin, ex.xp)
      xpMax = Math.max(xpMax, ex.xp)
      minMin = Math.min(minMin, ex.minutes)
      minMax = Math.max(minMax, ex.minutes)
    }
    return {
      total: this.catalog.exercises.length,
      byLevel,
      byType,
      byDifficulty,
      modules: [...this.catalog.modules.values()]
        .filter((m) => moduleCounts.has(m.id))
        .map((m) => ({ id: m.id, title: m.title, level: m.levelId, count: moduleCounts.get(m.id) ?? 0 })),
      xpRange: [Number.isFinite(xpMin) ? xpMin : 0, xpMax],
      minutesRange: [Number.isFinite(minMin) ? minMin : 0, minMax]
    }
  }

  relatedTables(ex: ResolvedExercise): string[] {
    const tables = this.datasets.describe(ex.dataset).tables.map((t) => t.name)
    if (ex.type === 'join_builder') return ex.tables
    const source = ex.type === 'predict_result' || ex.type === 'explain_query' ? ex.sql : referencePrograms(ex).join(' ')
    const ids = referencedIdentifiers(source)
    const related = tables.filter((t) => ids.has(t.toLowerCase()))
    return related.length > 0 ? related : tables
  }

  publicExercise(userId: string, exerciseId: string): PublicExercise {
    const ex = this.get(exerciseId)
    const progress = this.db.orm
      .select()
      .from(exerciseProgress)
      .where(and(eq(exerciseProgress.userId, userId), eq(exerciseProgress.exerciseId, exerciseId)))
      .get()
    const isFavorite = Boolean(
      this.db.orm
        .select({ id: favorites.exerciseId })
        .from(favorites)
        .where(and(eq(favorites.userId, userId), eq(favorites.exerciseId, exerciseId)))
        .get()
    )
    const note =
      this.db.orm
        .select({ content: userNotes.content })
        .from(userNotes)
        .where(and(eq(userNotes.userId, userId), eq(userNotes.exerciseId, exerciseId)))
        .get()?.content ?? ''
    const siblings = this.catalog.exercises.filter((e) => e.module === ex.module)
    const index = siblings.findIndex((e) => e.id === ex.id)
    const level = this.catalog.levels.find((l) => l.id === ex.level)
    return {
      ...this.summary(ex, progress, isFavorite),
      description: ex.description,
      theory: ex.theory,
      hints: ex.hints,
      content: toPublicContent(ex),
      hiddenTestCount: this.hiddenTestCount(ex),
      relatedTables: this.relatedTables(ex),
      progress: {
        status: (progress?.status as ProgressStatus | undefined) ?? STATUS_DEFAULT,
        attempts: progress?.attempts ?? 0,
        correctAttempts: progress?.correctAttempts ?? 0,
        draft: progress?.draft ?? null,
        solutionRevealed: progress?.solutionRevealed ?? false,
        firstSolvedAt: progress?.firstSolvedAt ?? null,
        bestTimeMs: progress?.bestTimeMs ?? null
      },
      note,
      prevId: siblings[index - 1]?.id ?? null,
      nextId: siblings[index + 1]?.id ?? null,
      levelTitle: level?.title ?? ex.level
    }
  }

  private bestScores(userId: string, kind: 'module_test' | 'level_exam'): Map<string, { best: number; passed: boolean }> {
    const rows = this.db.orm
      .select({ scopeId: assessments.scopeId, score: assessments.score, passed: assessments.passed })
      .from(assessments)
      .where(and(eq(assessments.userId, userId), eq(assessments.kind, kind)))
      .all()
    const map = new Map<string, { best: number; passed: boolean }>()
    for (const r of rows) {
      if (!r.scopeId || r.score === null) continue
      const prev = map.get(r.scopeId)
      map.set(r.scopeId, {
        best: Math.max(prev?.best ?? 0, r.score),
        passed: (prev?.passed ?? false) || r.passed
      })
    }
    return map
  }

  private moduleSummaries(userId: string, progress: Map<string, ProgressRow>): Map<string, ModuleSummaryDto> {
    const tests = this.bestScores(userId, 'module_test')
    const result = new Map<string, ModuleSummaryDto>()
    for (const m of this.catalog.modules.values()) {
      const list = this.catalog.exercises.filter((e) => e.module === m.id)
      const solved = list.filter((e) => progress.get(e.id)?.firstSolvedAt).length
      const test = tests.get(m.id)
      result.set(m.id, {
        id: m.id,
        levelId: m.levelId,
        order: m.position % 100,
        title: m.title,
        description: m.description,
        tags: m.tags,
        total: list.length,
        solved,
        progress: list.length > 0 ? solved / list.length : 0,
        testPassed: test?.passed ?? false,
        testBestScore: test?.best ?? null
      })
    }
    return result
  }

  levels(userId: string): LevelDto[] {
    const progress = this.progressMap(userId)
    const moduleSummaries = this.moduleSummaries(userId, progress)
    const exams = this.bestScores(userId, 'level_exam')
    return this.catalog.levels.map((level) => {
      const mods = level.modules.map((m) => moduleSummaries.get(m.id)!)
      const total = mods.reduce((s, m) => s + m.total, 0)
      const solved = mods.reduce((s, m) => s + m.solved, 0)
      const examPassed = exams.get(level.id)?.passed ?? false
      return {
        id: level.id,
        order: level.position + 1,
        title: level.title,
        description: level.description,
        modules: mods,
        total,
        solved,
        progress: total > 0 ? solved / total : 0,
        examPassed,
        completed: isLevelCompleted(solved, total, examPassed)
      }
    })
  }

  moduleDetail(userId: string, moduleId: string): ModuleDetailDto {
    const m = this.catalog.modules.get(moduleId)
    if (!m) throw notFound('module')
    const progress = this.progressMap(userId)
    const favs = this.favoriteSet(userId)
    const summary = this.moduleSummaries(userId, progress).get(moduleId)!
    const ordered = [...this.catalog.modules.values()].sort((a, b) => a.position - b.position)
    const index = ordered.findIndex((x) => x.id === moduleId)
    const level = this.catalog.levels.find((l) => l.id === m.levelId)!
    return {
      ...summary,
      theory: m.theory,
      levelTitle: level.title,
      exercises: this.catalog.exercises
        .filter((e) => e.module === moduleId)
        .map((e) => this.summary(e, progress.get(e.id), favs.has(e.id))),
      prevModuleId: ordered[index - 1]?.id ?? null,
      nextModuleId: ordered[index + 1]?.id ?? null
    }
  }

  projects(userId: string): ProjectDto[] {
    const progress = this.progressMap(userId)
    return this.catalog.projects.map((p) => {
      const solved = p.exercises.filter((id) => progress.get(id)?.firstSolvedAt).length
      return {
        id: p.id,
        title: p.title,
        description: p.description,
        level: p.level,
        dataset: p.dataset,
        total: p.exercises.length,
        solved,
        completed: solved === p.exercises.length
      }
    })
  }
}
