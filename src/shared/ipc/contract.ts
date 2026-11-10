import { z } from 'zod'
import {
  changePasswordSchema,
  loginSchema,
  passwordConfirmSchema,
  recoverSchema,
  registerSchema,
  updateProfileSchema
} from '../schemas/auth'
import {
  assessmentIdSchema,
  assessmentStartSchema,
  catalogQuerySchema,
  datasetInputSchema,
  draftInputSchema,
  emptyInput,
  exerciseIdSchema,
  heartbeatSchema,
  historyQuerySchema,
  noteInputSchema,
  playgroundRunSchema,
  runInputSchema,
  settingsUpdateSchema,
  submitInputSchema
} from '../schemas/ipc'
import type { DatasetSchema, DatasetSummary } from '../types/engine'
import type {
  CatalogFacets,
  CatalogPage,
  ExerciseSummary,
  PublicExercise,
  RevealedSolution,
  RunResult,
  SubmitResult,
  UnlockedAchievement
} from '../types/exercise'
import type {
  AchievementDto,
  AnalyticsData,
  AssessmentDto,
  DailyTasksDto,
  DashboardData,
  LevelDto,
  ModuleDetailDto,
  ProjectDto
} from '../types/learning'
import type { PlaygroundRunResult, QueryHistoryItem } from '../types/playground'
import type { AccountSummary, AuthResult, UserProfile, UserSettingsDto } from '../types/user'
import type { IpcChannel } from './channels'

export interface AppInfo {
  version: string
  platform: string
  userDataPath: string
  exerciseCount: number
  datasetCount: number
  invalidExercises: number
}

export const ipcContract = {
  'app:info': { input: emptyInput, auth: false },
  'auth:accounts': { input: emptyInput, auth: false },
  'auth:session': { input: emptyInput, auth: false },
  'auth:register': { input: registerSchema, auth: false },
  'auth:login': { input: loginSchema, auth: false },
  'auth:logout': { input: emptyInput, auth: false },
  'auth:recover': { input: recoverSchema, auth: false },
  'auth:changePassword': { input: changePasswordSchema, auth: true },
  'auth:regenerateRecovery': { input: passwordConfirmSchema, auth: true },
  'auth:updateProfile': { input: updateProfileSchema, auth: true },
  'auth:deleteAccount': { input: passwordConfirmSchema, auth: true },
  'settings:get': { input: emptyInput, auth: true },
  'settings:update': { input: settingsUpdateSchema, auth: true },
  'dashboard:get': { input: emptyInput, auth: true },
  'learning:levels': { input: emptyInput, auth: true },
  'learning:module': { input: z.object({ moduleId: z.string().max(80) }), auth: true },
  'learning:projects': { input: emptyInput, auth: true },
  'exercises:list': { input: catalogQuerySchema, auth: true },
  'exercises:facets': { input: emptyInput, auth: true },
  'exercises:get': { input: z.object({ exerciseId: exerciseIdSchema }), auth: true },
  'exercises:run': { input: runInputSchema, auth: true },
  'exercises:submit': { input: submitInputSchema, auth: true },
  'exercises:saveDraft': { input: draftInputSchema, auth: true },
  'exercises:reveal': { input: z.object({ exerciseId: exerciseIdSchema }), auth: true },
  'exercises:toggleFavorite': { input: z.object({ exerciseId: exerciseIdSchema }), auth: true },
  'exercises:markReview': { input: z.object({ exerciseId: exerciseIdSchema, review: z.boolean() }), auth: true },
  'exercises:saveNote': { input: noteInputSchema, auth: true },
  'exercises:next': { input: emptyInput, auth: true },
  'datasets:list': { input: emptyInput, auth: true },
  'datasets:schema': { input: datasetInputSchema, auth: true },
  'playground:run': { input: playgroundRunSchema, auth: true },
  'playground:reset': { input: datasetInputSchema, auth: true },
  'playground:history': { input: historyQuerySchema, auth: true },
  'playground:clearHistory': { input: emptyInput, auth: true },
  'analytics:get': { input: emptyInput, auth: true },
  'achievements:list': { input: emptyInput, auth: true },
  'assessments:start': { input: assessmentStartSchema, auth: true },
  'assessments:get': { input: assessmentIdSchema, auth: true },
  'assessments:finish': { input: assessmentIdSchema, auth: true },
  'assessments:recent': { input: emptyInput, auth: true },
  'assessments:daily': { input: emptyInput, auth: true },
  'activity:heartbeat': { input: heartbeatSchema, auth: true }
} as const satisfies Record<IpcChannel, { input: z.ZodTypeAny; auth: boolean }>

export interface IpcOutputs {
  'app:info': AppInfo
  'auth:accounts': AccountSummary[]
  'auth:session': UserProfile | null
  'auth:register': AuthResult
  'auth:login': AuthResult
  'auth:logout': null
  'auth:recover': AuthResult
  'auth:changePassword': null
  'auth:regenerateRecovery': { recoveryCode: string }
  'auth:updateProfile': UserProfile
  'auth:deleteAccount': null
  'settings:get': UserSettingsDto
  'settings:update': UserSettingsDto
  'dashboard:get': DashboardData
  'learning:levels': LevelDto[]
  'learning:module': ModuleDetailDto
  'learning:projects': ProjectDto[]
  'exercises:list': CatalogPage
  'exercises:facets': CatalogFacets
  'exercises:get': PublicExercise
  'exercises:run': RunResult
  'exercises:submit': SubmitResult
  'exercises:saveDraft': null
  'exercises:reveal': RevealedSolution
  'exercises:toggleFavorite': { isFavorite: boolean }
  'exercises:markReview': null
  'exercises:saveNote': null
  'exercises:next': ExerciseSummary | null
  'datasets:list': DatasetSummary[]
  'datasets:schema': DatasetSchema
  'playground:run': PlaygroundRunResult
  'playground:reset': null
  'playground:history': QueryHistoryItem[]
  'playground:clearHistory': null
  'analytics:get': AnalyticsData
  'achievements:list': AchievementDto[]
  'assessments:start': AssessmentDto
  'assessments:get': AssessmentDto
  'assessments:finish': AssessmentDto
  'assessments:recent': AssessmentDto[]
  'assessments:daily': DailyTasksDto
  'activity:heartbeat': UnlockedAchievement[]
}

export type IpcContract = typeof ipcContract
export type IpcInput<C extends IpcChannel> = z.input<IpcContract[C]['input']>
export type IpcParsedInput<C extends IpcChannel> = z.output<IpcContract[C]['input']>
export type IpcOutput<C extends IpcChannel> = IpcOutputs[C]

export type AppErrorCode =
  | 'validation'
  | 'unauthorized'
  | 'not_found'
  | 'conflict'
  | 'invalid_credentials'
  | 'rate_limited'
  | 'forbidden'
  | 'internal'

export interface AppErrorPayload {
  code: AppErrorCode
  message: string
  fields?: Record<string, string>
}

export type IpcEnvelope<T> = { ok: true; data: T } | { ok: false; error: AppErrorPayload }
