import { z } from 'zod'
import { DIFFICULTIES, JOIN_TYPES, LEVEL_IDS, STATEMENT_KINDS } from '../constants/domain'

const idSchema = z
  .string()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9][a-z0-9._-]*$/, 'id must be lowercase letters, digits, dots, dashes or underscores')

const sqlSchema = z.string().min(1).max(8000)

const hiddenTestSchema = z.object({
  name: z.string().optional(),
  setup: sqlSchema
})

const baseExerciseSchema = z.object({
  id: idSchema,
  title: z.string().min(3).max(140),
  description: z.string().min(10).max(4000),
  difficulty: z.enum(DIFFICULTIES),
  module: idSchema.optional(),
  dataset: idSchema.optional(),
  theory: z.string().max(6000).optional(),
  xp: z.number().int().min(1).max(500).optional(),
  minutes: z.number().int().min(1).max(120).optional(),
  tags: z.array(z.string().min(1).max(40)).max(12).optional(),
  hints: z.array(z.string().min(3).max(600)).min(1).max(5),
  explanation: z.string().min(10).max(4000)
})

const queryFields = {
  starter: z.string().max(8000).optional(),
  solution: sqlSchema,
  alt: z.array(sqlSchema).max(6).optional(),
  orderMatters: z.boolean().optional(),
  columnNames: z.boolean().optional(),
  hidden: z.array(hiddenTestSchema).max(6).optional(),
  mode: z.enum(['query', 'mutation']).optional(),
  check: sqlSchema.optional(),
  allow: z.array(z.enum(STATEMENT_KINDS)).optional(),
  allowEmpty: z.boolean().optional()
}

export const writeQueryExerciseSchema = baseExerciseSchema.extend({
  type: z.literal('write_query'),
  ...queryFields
})

export const businessCaseExerciseSchema = baseExerciseSchema.extend({
  type: z.literal('business_case'),
  ...queryFields
})

export const challengeExerciseSchema = baseExerciseSchema.extend({
  type: z.literal('challenge'),
  ...queryFields
})

export const fixBugExerciseSchema = baseExerciseSchema.extend({
  type: z.literal('fix_bug'),
  ...queryFields,
  starter: sqlSchema
})

export const predictResultExerciseSchema = baseExerciseSchema.extend({
  type: z.literal('predict_result'),
  sql: sqlSchema,
  ask: z.enum(['value', 'rowCount']),
  options: z.array(z.string().min(1).max(200)).min(2).max(6).optional()
})

export const chooseQueryExerciseSchema = baseExerciseSchema.extend({
  type: z.literal('choose_query'),
  options: z.array(sqlSchema).min(2).max(6),
  correct: z.number().int().min(0),
  orderMatters: z.boolean().optional()
})

export const fillBlankExerciseSchema = baseExerciseSchema.extend({
  type: z.literal('fill_blank'),
  template: sqlSchema,
  answers: z.array(z.string().min(1).max(400)).min(1).max(6),
  choices: z.array(z.array(z.string().min(1).max(400)).min(2).max(8).nullable()).max(6).optional(),
  orderMatters: z.boolean().optional()
})

export const joinBuilderExerciseSchema = baseExerciseSchema.extend({
  type: z.literal('join_builder'),
  tables: z.array(z.string().min(1)).min(2).max(6),
  select: z.string().min(1).max(1000),
  suffix: z.string().max(1000).optional(),
  answer: z.object({
    left: z.string().min(1),
    right: z.string().min(1),
    join: z.enum(JOIN_TYPES),
    leftColumn: z.string().min(1).optional(),
    rightColumn: z.string().min(1).optional()
  }),
  orderMatters: z.boolean().optional()
})

export const orderPartsExerciseSchema = baseExerciseSchema.extend({
  type: z.literal('order_parts'),
  parts: z.array(z.string().min(1).max(400)).min(3).max(12),
  distractors: z.array(z.string().min(1).max(400)).max(4).optional(),
  orderMatters: z.boolean().optional()
})

export const explainQueryExerciseSchema = baseExerciseSchema.extend({
  type: z.literal('explain_query'),
  sql: sqlSchema,
  options: z.array(z.string().min(3).max(600)).min(2).max(6),
  correct: z.number().int().min(0)
})

export const exerciseDefinitionSchema = z.discriminatedUnion('type', [
  writeQueryExerciseSchema,
  fixBugExerciseSchema,
  predictResultExerciseSchema,
  chooseQueryExerciseSchema,
  fillBlankExerciseSchema,
  joinBuilderExerciseSchema,
  orderPartsExerciseSchema,
  explainQueryExerciseSchema,
  businessCaseExerciseSchema,
  challengeExerciseSchema
])

export type ExerciseDefinition = z.infer<typeof exerciseDefinitionSchema>

export const exerciseFileSchema = z.object({
  module: idSchema.optional(),
  dataset: idSchema.optional(),
  exercises: z.array(z.unknown()).min(1)
})

export const curriculumModuleSchema = z.object({
  id: idSchema,
  title: z.string().min(2).max(120),
  description: z.string().min(5).max(600),
  tags: z.array(z.string()).default([])
})

export const curriculumLevelSchema = z.object({
  id: z.enum(LEVEL_IDS),
  title: z.string().min(2),
  description: z.string().min(5),
  modules: z.array(curriculumModuleSchema).min(1)
})

export const curriculumProjectSchema = z.object({
  id: idSchema,
  title: z.string().min(3),
  description: z.string().min(10),
  level: z.enum(LEVEL_IDS),
  dataset: idSchema,
  exercises: z.array(idSchema).min(2)
})

export const curriculumSchema = z.object({
  levels: z.array(curriculumLevelSchema).length(LEVEL_IDS.length),
  projects: z.array(curriculumProjectSchema).default([])
})

export type Curriculum = z.infer<typeof curriculumSchema>
export type CurriculumModule = z.infer<typeof curriculumModuleSchema>
export type CurriculumProject = z.infer<typeof curriculumProjectSchema>

export const datasetMetaSchema = z.object({
  id: idSchema,
  title: z.string().min(2),
  description: z.string().min(5),
  icon: z.string().default('database'),
  tables: z.record(z.string(), z.string()).default({})
})

export type DatasetMeta = z.infer<typeof datasetMetaSchema>
