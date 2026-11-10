import { z } from 'zod'
import {
  ASSESSMENT_KINDS,
  DIFFICULTIES,
  EXERCISE_TYPES,
  JOIN_TYPES,
  LEVEL_IDS,
  PROGRESS_STATUSES
} from '../constants/domain'
import { ENGINE_LIMITS } from '../constants/domain'

export const emptyInput = z.undefined()

export const exerciseIdSchema = z.string().min(1).max(80)

export const exerciseAnswerSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('sql'), sql: z.string().max(ENGINE_LIMITS.maxSqlLength) }),
  z.object({ kind: z.literal('option'), option: z.number().int().min(0).max(10) }),
  z.object({ kind: z.literal('value'), value: z.string().max(500) }),
  z.object({ kind: z.literal('blanks'), blanks: z.array(z.string().max(400)).max(6) }),
  z.object({ kind: z.literal('parts'), parts: z.array(z.number().int().min(0).max(40)).max(40) }),
  z.object({
    kind: z.literal('join'),
    left: z.string().max(64),
    right: z.string().max(64),
    join: z.enum(JOIN_TYPES),
    leftColumn: z.string().max(64).optional(),
    rightColumn: z.string().max(64).optional()
  })
])

export const catalogQuerySchema = z.object({
  search: z.string().max(120).optional(),
  level: z.enum(LEVEL_IDS).optional(),
  moduleId: z.string().max(80).optional(),
  type: z.enum(EXERCISE_TYPES).optional(),
  difficulty: z.enum(DIFFICULTIES).optional(),
  status: z.enum(PROGRESS_STATUSES).optional(),
  favoritesOnly: z.boolean().optional(),
  xpMin: z.number().int().min(0).optional(),
  xpMax: z.number().int().min(0).optional(),
  minutesMax: z.number().int().min(0).optional(),
  sort: z.enum(['order', 'xp_desc', 'xp_asc', 'difficulty', 'title', 'minutes']).default('order'),
  limit: z.number().int().min(1).max(600).default(60),
  offset: z.number().int().min(0).default(0)
})

export type CatalogQuery = z.input<typeof catalogQuerySchema>

export const submitInputSchema = z.object({
  exerciseId: exerciseIdSchema,
  answer: exerciseAnswerSchema,
  durationMs: z.number().int().min(0).max(24 * 3600 * 1000),
  assessmentId: z.number().int().positive().optional()
})

export const runInputSchema = z.object({
  exerciseId: exerciseIdSchema,
  answer: exerciseAnswerSchema
})

export const draftInputSchema = z.object({
  exerciseId: exerciseIdSchema,
  draft: z.string().max(ENGINE_LIMITS.maxSqlLength)
})

export const noteInputSchema = z.object({
  exerciseId: exerciseIdSchema,
  content: z.string().max(10000)
})

export const settingsUpdateSchema = z
  .object({
    locale: z.enum(['ru', 'en']),
    dailyGoal: z.number().int().min(10).max(1000),
    editorFontSize: z.number().int().min(10).max(24),
    editorMinimap: z.boolean(),
    editorWordWrap: z.boolean(),
    autoSaveDrafts: z.boolean(),
    reduceMotion: z.boolean()
  })
  .partial()

export const playgroundRunSchema = z.object({
  dataset: z.string().min(1).max(40),
  sql: z.string().min(1).max(ENGINE_LIMITS.maxSqlLength)
})

export const datasetInputSchema = z.object({ dataset: z.string().min(1).max(40) })

export const assessmentStartSchema = z.object({
  kind: z.enum(ASSESSMENT_KINDS),
  scopeId: z.string().max(80).optional()
})

export const assessmentIdSchema = z.object({ assessmentId: z.number().int().positive() })

export const heartbeatSchema = z.object({
  seconds: z.number().int().min(1).max(120)
})

export const historyQuerySchema = z.object({
  dataset: z.string().max(40).optional(),
  limit: z.number().int().min(1).max(200).default(50)
})
