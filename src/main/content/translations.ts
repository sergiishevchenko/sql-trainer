import fs from 'node:fs'
import path from 'node:path'
import { z } from 'zod'
import { CONTENT_SOURCE_LOCALE, LOCALES, type Locale } from '@shared/constants/locale'

const nonEmpty = z.string().trim().min(1)

const titledSchema = z
  .object({
    title: nonEmpty.optional(),
    description: nonEmpty.optional()
  })
  .strict()

const curriculumTranslationSchema = z
  .object({
    levels: z.record(z.string(), titledSchema).default({}),
    modules: z.record(z.string(), titledSchema).default({}),
    projects: z.record(z.string(), titledSchema).default({})
  })
  .strict()

const datasetTranslationSchema = z.record(
  z.string(),
  titledSchema.extend({ tables: z.record(z.string(), nonEmpty).default({}) }).strict()
)

const exerciseTextSchema = z
  .object({
    title: nonEmpty.optional(),
    description: nonEmpty.optional(),
    hints: z.array(nonEmpty).optional(),
    explanation: nonEmpty.optional(),
    theory: nonEmpty.optional(),
    options: z.array(nonEmpty).optional()
  })
  .strict()

const exerciseTranslationFileSchema = z.record(z.string(), exerciseTextSchema)

export type TitledText = z.infer<typeof titledSchema>
export type ExerciseText = z.infer<typeof exerciseTextSchema>
export type DatasetText = z.infer<typeof datasetTranslationSchema>[string]

export interface ModuleText extends TitledText {
  theory?: string
}

export interface ContentTranslation {
  levels: Map<string, TitledText>
  modules: Map<string, ModuleText>
  projects: Map<string, TitledText>
  datasets: Map<string, DatasetText>
  exercises: Map<string, ExerciseText>
}

export interface TranslationIssue {
  file: string
  exerciseId?: string
  message: string
}

export interface TranslationTargets {
  levels: Set<string>
  modules: Set<string>
  projects: Set<string>
  datasets: Map<string, Set<string>>
  exercises: Map<string, { optionCount: number | null }>
}

function readJson(file: string): unknown {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

function zodMessage(error: z.ZodError): string {
  return error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
}

function loadLocale(dir: string, locale: Locale, targets: TranslationTargets, issues: TranslationIssue[]): ContentTranslation {
  const relative = (file: string) => path.join('i18n', locale, path.relative(dir, file))
  const result: ContentTranslation = {
    levels: new Map(),
    modules: new Map(),
    projects: new Map(),
    datasets: new Map(),
    exercises: new Map()
  }

  const curriculumFile = path.join(dir, 'curriculum.json')
  if (fs.existsSync(curriculumFile)) {
    const parsed = curriculumTranslationSchema.safeParse(readJson(curriculumFile))
    if (!parsed.success) issues.push({ file: relative(curriculumFile), message: zodMessage(parsed.error) })
    else {
      const sections = [
        ['levels', parsed.data.levels, targets.levels, result.levels],
        ['modules', parsed.data.modules, targets.modules, result.modules],
        ['projects', parsed.data.projects, targets.projects, result.projects]
      ] as const
      for (const [name, entries, known, target] of sections) {
        for (const [id, text] of Object.entries(entries)) {
          if (!known.has(id)) issues.push({ file: relative(curriculumFile), message: `Unknown ${name} id ${id}` })
          else target.set(id, text)
        }
      }
    }
  }

  const theoryDir = path.join(dir, 'theory')
  if (fs.existsSync(theoryDir)) {
    for (const entry of fs.readdirSync(theoryDir).filter((f) => f.endsWith('.md')).sort()) {
      const id = entry.slice(0, -3)
      if (!targets.modules.has(id)) {
        issues.push({ file: relative(path.join(theoryDir, entry)), message: `Theory for unknown module ${id}` })
        continue
      }
      const theory = fs.readFileSync(path.join(theoryDir, entry), 'utf8')
      result.modules.set(id, { ...result.modules.get(id), theory })
    }
  }

  const datasetsFile = path.join(dir, 'datasets.json')
  if (fs.existsSync(datasetsFile)) {
    const parsed = datasetTranslationSchema.safeParse(readJson(datasetsFile))
    if (!parsed.success) issues.push({ file: relative(datasetsFile), message: zodMessage(parsed.error) })
    else {
      for (const [id, text] of Object.entries(parsed.data)) {
        const tables = targets.datasets.get(id)
        if (!tables) {
          issues.push({ file: relative(datasetsFile), message: `Unknown dataset ${id}` })
          continue
        }
        const unknown = Object.keys(text.tables).filter((t) => !tables.has(t))
        if (unknown.length > 0) issues.push({ file: relative(datasetsFile), message: `Unknown tables in ${id}: ${unknown.join(', ')}` })
        result.datasets.set(id, text)
      }
    }
  }

  const exercisesDir = path.join(dir, 'exercises')
  if (fs.existsSync(exercisesDir)) {
    for (const entry of fs.readdirSync(exercisesDir).filter((f) => f.endsWith('.json')).sort()) {
      const file = path.join(exercisesDir, entry)
      const parsed = exerciseTranslationFileSchema.safeParse(readJson(file))
      if (!parsed.success) {
        issues.push({ file: relative(file), message: zodMessage(parsed.error) })
        continue
      }
      for (const [id, text] of Object.entries(parsed.data)) {
        const target = targets.exercises.get(id)
        if (!target) {
          issues.push({ file: relative(file), exerciseId: id, message: 'Translation for unknown exercise' })
          continue
        }
        if (text.options && text.options.length !== target.optionCount) {
          issues.push({ file: relative(file), exerciseId: id, message: 'Translated options must match the original option count' })
          continue
        }
        if (result.exercises.has(id)) {
          issues.push({ file: relative(file), exerciseId: id, message: 'Duplicate exercise translation' })
          continue
        }
        result.exercises.set(id, text)
      }
    }
  }

  return result
}

/**
 * Loads optional content overlays from `<contentDir>/i18n/<locale>`. Missing entries fall back
 * to the source language; entries that point at unknown content are reported as issues.
 */
export function loadTranslations(
  contentDir: string,
  targets: TranslationTargets
): { translations: Map<Locale, ContentTranslation>; issues: TranslationIssue[] } {
  const translations = new Map<Locale, ContentTranslation>()
  const issues: TranslationIssue[] = []
  for (const locale of LOCALES) {
    if (locale === CONTENT_SOURCE_LOCALE) continue
    const dir = path.join(contentDir, 'i18n', locale)
    if (!fs.existsSync(dir)) continue
    try {
      translations.set(locale, loadLocale(dir, locale, targets, issues))
    } catch (error) {
      issues.push({ file: path.join('i18n', locale), message: `Invalid translation: ${(error as Error).message}` })
    }
  }
  return { translations, issues }
}
