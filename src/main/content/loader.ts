import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { DEFAULT_MINUTES, DEFAULT_XP, LEVEL_IDS, type LevelId } from '@shared/constants/domain'
import {
  curriculumSchema,
  exerciseDefinitionSchema,
  exerciseFileSchema,
  type CurriculumProject,
  type ExerciseDefinition
} from '@shared/schemas/content'
import { hasTopLevelOrderBy } from '../engine/guard'

export interface ResolvedModule {
  id: string
  levelId: LevelId
  position: number
  title: string
  description: string
  tags: string[]
  theory: string
}

export interface ResolvedLevel {
  id: LevelId
  position: number
  title: string
  description: string
  modules: ResolvedModule[]
}

export type ResolvedExercise = ExerciseDefinition & {
  level: LevelId
  module: string
  dataset: string
  xp: number
  minutes: number
  tags: string[]
  theory: string
  position: number
  sourceFile: string
  contentHash: string
}

export interface ContentIssue {
  file: string
  exerciseId?: string
  message: string
}

export interface Catalog {
  levels: ResolvedLevel[]
  modules: Map<string, ResolvedModule>
  exercises: ResolvedExercise[]
  byId: Map<string, ResolvedExercise>
  projects: CurriculumProject[]
  issues: ContentIssue[]
}

export interface LoadOptions {
  contentDir: string
  datasetIds: string[]
  extraExerciseDirs?: string[]
}

function listJsonFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return []
  const out: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...listJsonFiles(full))
    else if (entry.isFile() && entry.name.endsWith('.json')) out.push(full)
  }
  return out.sort()
}

function countPlaceholders(template: string): number[] {
  return [...template.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1]))
}

function semanticIssues(ex: ExerciseDefinition, tables: Set<string> | null): string[] {
  const issues: string[] = []
  switch (ex.type) {
    case 'choose_query':
    case 'explain_query':
      if (ex.correct >= ex.options.length) issues.push('correct index is out of range')
      if (new Set(ex.options).size !== ex.options.length) issues.push('options must be unique')
      break
    case 'fill_blank': {
      const placeholders = countPlaceholders(ex.template)
      const expected = ex.answers.map((_, i) => i + 1)
      if (placeholders.length !== ex.answers.length || expected.some((n) => !placeholders.includes(n))) {
        issues.push('template placeholders {{1}}..{{n}} must match answers')
      }
      if (ex.choices) {
        if (ex.choices.length !== ex.answers.length) issues.push('choices length must match answers length')
        ex.choices.forEach((c, i) => {
          if (c && !c.includes(ex.answers[i])) issues.push(`choices for blank ${i + 1} must include the answer`)
        })
      }
      break
    }
    case 'join_builder': {
      const { left, right, join, leftColumn, rightColumn } = ex.answer
      if (!ex.tables.includes(left) || !ex.tables.includes(right)) issues.push('answer tables must be listed in tables')
      if (join !== 'CROSS' && (!leftColumn || !rightColumn)) issues.push('non-CROSS join requires leftColumn and rightColumn')
      if (tables) for (const t of ex.tables) if (!tables.has(t)) issues.push(`unknown table ${t}`)
      break
    }
    case 'order_parts':
      if (new Set([...ex.parts, ...(ex.distractors ?? [])]).size !== ex.parts.length + (ex.distractors?.length ?? 0)) {
        issues.push('parts and distractors must be unique')
      }
      break
    case 'predict_result':
      break
    default: {
      if (ex.allow?.some((k) => k === 'drop' || k === 'alter')) issues.push('DROP and ALTER cannot be allowed in exercises')
      if (ex.mode === 'mutation' && !ex.check) issues.push('mutation exercises require a check query')
      if (ex.mode === 'mutation' && !ex.allow?.length) issues.push('mutation exercises must declare allowed statements')
    }
  }
  return issues
}

/**
 * Loads curriculum, theory and exercises from the content directory.
 * Invalid exercises are reported in `issues` and skipped rather than crashing the app.
 */
export function loadCatalog(options: LoadOptions, datasetTables?: Map<string, Set<string>>): Catalog {
  const issues: ContentIssue[] = []
  const curriculumPath = path.join(options.contentDir, 'curriculum.json')
  const curriculum = curriculumSchema.parse(JSON.parse(fs.readFileSync(curriculumPath, 'utf8')))

  const modules = new Map<string, ResolvedModule>()
  const levels: ResolvedLevel[] = LEVEL_IDS.map((levelId, levelIndex) => {
    const level = curriculum.levels.find((l) => l.id === levelId)
    if (!level) throw new Error(`curriculum.json is missing level ${levelId}`)
    const resolvedModules = level.modules.map((m, moduleIndex) => {
      const theoryPath = path.join(options.contentDir, 'theory', `${m.id}.md`)
      let theory = m.description
      if (fs.existsSync(theoryPath)) theory = fs.readFileSync(theoryPath, 'utf8')
      else issues.push({ file: theoryPath, message: `Missing theory for module ${m.id}` })
      const resolved: ResolvedModule = {
        id: m.id,
        levelId,
        position: levelIndex * 100 + moduleIndex,
        title: m.title,
        description: m.description,
        tags: m.tags,
        theory
      }
      if (modules.has(m.id)) throw new Error(`Duplicate module id ${m.id}`)
      modules.set(m.id, resolved)
      return resolved
    })
    return { id: levelId, position: levelIndex, title: level.title, description: level.description, modules: resolvedModules }
  })

  const datasetIds = new Set(options.datasetIds)
  const exercises: ResolvedExercise[] = []
  const byId = new Map<string, ResolvedExercise>()
  const moduleCounters = new Map<string, number>()

  const files = [
    ...listJsonFiles(path.join(options.contentDir, 'exercises')),
    ...(options.extraExerciseDirs ?? []).flatMap(listJsonFiles)
  ]

  for (const file of files) {
    const relative = path.relative(options.contentDir, file)
    let parsedFile
    try {
      parsedFile = exerciseFileSchema.parse(JSON.parse(fs.readFileSync(file, 'utf8')))
    } catch (error) {
      issues.push({ file: relative, message: `Invalid exercise file: ${(error as Error).message}` })
      continue
    }
    for (const rawExercise of parsedFile.exercises) {
      const candidate = exerciseDefinitionSchema.safeParse(rawExercise)
      const rawId = (rawExercise as { id?: string })?.id
      if (!candidate.success) {
        issues.push({
          file: relative,
          exerciseId: rawId,
          message: candidate.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
        })
        continue
      }
      const ex = candidate.data
      const moduleId = ex.module ?? parsedFile.module
      const dataset = ex.dataset ?? parsedFile.dataset
      const module = moduleId ? modules.get(moduleId) : undefined
      const problems: string[] = []
      if (!module) problems.push(`unknown module ${moduleId ?? '(none)'}`)
      if (!dataset || !datasetIds.has(dataset)) problems.push(`unknown dataset ${dataset ?? '(none)'}`)
      if (byId.has(ex.id)) problems.push('duplicate exercise id')
      problems.push(...semanticIssues(ex, dataset ? (datasetTables?.get(dataset) ?? null) : null))
      if (problems.length > 0 || !module || !dataset) {
        issues.push({ file: relative, exerciseId: ex.id, message: problems.join('; ') })
        continue
      }
      const counter = moduleCounters.get(module.id) ?? 0
      moduleCounters.set(module.id, counter + 1)
      const withOrder = resolveOrdering(ex)
      const resolved: ResolvedExercise = {
        ...withOrder,
        level: module.levelId,
        module: module.id,
        dataset,
        xp: ex.xp ?? DEFAULT_XP[ex.difficulty],
        minutes: ex.minutes ?? DEFAULT_MINUTES[ex.difficulty],
        tags: [...new Set([...(module.tags ?? []), ...(ex.tags ?? [])])],
        theory: ex.theory ?? module.theory,
        position: module.position * 1000 + counter,
        sourceFile: relative,
        contentHash: crypto.createHash('sha1').update(JSON.stringify(rawExercise)).digest('hex')
      }
      exercises.push(resolved)
      byId.set(resolved.id, resolved)
    }
  }

  exercises.sort((a, b) => a.position - b.position)

  for (const project of curriculum.projects) {
    for (const id of project.exercises) {
      if (!byId.has(id)) issues.push({ file: 'curriculum.json', message: `Project ${project.id} references unknown exercise ${id}` })
    }
  }

  return {
    levels,
    modules,
    exercises,
    byId,
    projects: curriculum.projects.filter((p) => p.exercises.every((id) => byId.has(id))),
    issues
  }
}

function resolveOrdering(ex: ExerciseDefinition): ExerciseDefinition {
  switch (ex.type) {
    case 'write_query':
    case 'fix_bug':
    case 'business_case':
    case 'challenge':
      return { ...ex, orderMatters: ex.orderMatters ?? (ex.mode !== 'mutation' && hasTopLevelOrderBy(ex.solution)) }
    case 'choose_query':
      return { ...ex, orderMatters: ex.orderMatters ?? hasTopLevelOrderBy(ex.options[ex.correct]) }
    case 'fill_blank':
      return { ...ex, orderMatters: ex.orderMatters ?? hasTopLevelOrderBy(fillTemplate(ex.template, ex.answers)) }
    case 'order_parts':
      return { ...ex, orderMatters: ex.orderMatters ?? hasTopLevelOrderBy(ex.parts.join(' ')) }
    case 'join_builder':
      return { ...ex, orderMatters: ex.orderMatters ?? hasTopLevelOrderBy(ex.suffix ?? '') }
    default:
      return ex
  }
}

export function fillTemplate(template: string, values: string[]): string {
  return template.replace(/\{\{(\d+)\}\}/g, (_, n: string) => values[Number(n) - 1] ?? '')
}
