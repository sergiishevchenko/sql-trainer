import type { CurriculumProject } from '@shared/schemas/content'
import type { DatasetSchema, DatasetSummary } from '@shared/types/engine'
import { CONTENT_SOURCE_LOCALE, type Locale } from '@shared/constants/locale'
import { getLocale } from '../i18n'
import type { Catalog, ResolvedExercise, ResolvedLevel, ResolvedModule } from './loader'
import type { ContentTranslation } from './translations'

export interface LocalizedExerciseText {
  title: string
  description: string
  hints: string[]
  explanation: string
  theory: string
  options: string[] | null
}

/**
 * Resolves user-facing content text in the active interface language, falling back to the
 * source language for anything that has not been translated yet.
 */
export class ContentLocalizer {
  constructor(
    private readonly catalog: Catalog,
    private readonly locale: () => Locale = getLocale
  ) {}

  get current(): Locale {
    return this.locale()
  }

  private overlay(): ContentTranslation | undefined {
    const locale = this.locale()
    return locale === CONTENT_SOURCE_LOCALE ? undefined : this.catalog.translations.get(locale)
  }

  compare(a: string, b: string): number {
    return a.localeCompare(b, this.locale())
  }

  level(level: ResolvedLevel): { title: string; description: string } {
    const text = this.overlay()?.levels.get(level.id)
    return { title: text?.title ?? level.title, description: text?.description ?? level.description }
  }

  levelTitle(levelId: string): string {
    const level = this.catalog.levels.find((l) => l.id === levelId)
    return level ? this.level(level).title : levelId
  }

  module(module: ResolvedModule): { title: string; description: string; theory: string } {
    const text = this.overlay()?.modules.get(module.id)
    return {
      title: text?.title ?? module.title,
      description: text?.description ?? module.description,
      theory: text?.theory ?? module.theory
    }
  }

  moduleTitle(moduleId: string): string {
    const module = this.catalog.modules.get(moduleId)
    return module ? this.module(module).title : moduleId
  }

  project(project: CurriculumProject): { title: string; description: string } {
    const text = this.overlay()?.projects.get(project.id)
    return { title: text?.title ?? project.title, description: text?.description ?? project.description }
  }

  exerciseTitle(ex: ResolvedExercise): string {
    return this.overlay()?.exercises.get(ex.id)?.title ?? ex.title
  }

  exercise(ex: ResolvedExercise): LocalizedExerciseText {
    const text = this.overlay()?.exercises.get(ex.id)
    const module = this.catalog.modules.get(ex.module)
    const inheritsModuleTheory = module !== undefined && ex.theory === module.theory
    return {
      title: text?.title ?? ex.title,
      description: text?.description ?? ex.description,
      hints: text?.hints ?? ex.hints,
      explanation: text?.explanation ?? ex.explanation,
      theory: text?.theory ?? (inheritsModuleTheory ? this.module(module).theory : ex.theory),
      options: ex.type === 'explain_query' ? (text?.options ?? ex.options) : null
    }
  }

  datasetSummary(summary: DatasetSummary): DatasetSummary {
    const text = this.overlay()?.datasets.get(summary.id)
    if (!text) return summary
    return { ...summary, title: text.title ?? summary.title, description: text.description ?? summary.description }
  }

  datasetSchema(schema: DatasetSchema): DatasetSchema {
    const text = this.overlay()?.datasets.get(schema.id)
    if (!text) return schema
    return {
      ...schema,
      title: text.title ?? schema.title,
      description: text.description ?? schema.description,
      tables: schema.tables.map((t) => ({ ...t, description: text.tables[t.name] ?? t.description }))
    }
  }
}
