export const LEVEL_IDS = ['beginner', 'fundamentals', 'intermediate', 'advanced', 'expert'] as const
export type LevelId = (typeof LEVEL_IDS)[number]

export const EXERCISE_TYPES = [
  'write_query',
  'fix_bug',
  'predict_result',
  'choose_query',
  'fill_blank',
  'join_builder',
  'order_parts',
  'explain_query',
  'business_case',
  'challenge'
] as const
export type ExerciseType = (typeof EXERCISE_TYPES)[number]

export const QUERY_EXERCISE_TYPES = ['write_query', 'fix_bug', 'business_case', 'challenge'] as const
export type QueryExerciseType = (typeof QUERY_EXERCISE_TYPES)[number]

export const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert'] as const
export type Difficulty = (typeof DIFFICULTIES)[number]

export const PROGRESS_STATUSES = ['not_started', 'in_progress', 'solved', 'needs_review'] as const
export type ProgressStatus = (typeof PROGRESS_STATUSES)[number]

export const ATTEMPT_CONTEXTS = ['practice', 'module_test', 'level_exam', 'speed', 'daily', 'review', 'project'] as const
export type AttemptContext = (typeof ATTEMPT_CONTEXTS)[number]

export const ASSESSMENT_KINDS = ['module_test', 'level_exam', 'speed', 'daily', 'review', 'project'] as const
export type AssessmentKind = (typeof ASSESSMENT_KINDS)[number]

export const JOIN_TYPES = ['INNER', 'LEFT', 'RIGHT', 'FULL OUTER', 'CROSS'] as const
export type JoinType = (typeof JOIN_TYPES)[number]

export const DEFAULT_XP: Record<Difficulty, number> = {
  easy: 10,
  medium: 20,
  hard: 35,
  expert: 50
}

export const DEFAULT_MINUTES: Record<Difficulty, number> = {
  easy: 2,
  medium: 5,
  hard: 10,
  expert: 15
}

export const STATEMENT_KINDS = [
  'select',
  'insert',
  'update',
  'delete',
  'create_table',
  'create_index',
  'create_view',
  'drop',
  'alter',
  'transaction'
] as const
export type StatementKind = (typeof STATEMENT_KINDS)[number]

export const ENGINE_LIMITS = {
  maxRows: 1000,
  maxSqlLength: 20000,
  maxStatements: 25,
  queryTimeoutMs: 4000,
  evaluateTimeoutMs: 8000
} as const

export const REVIEW_FAIL_THRESHOLD = 3
export const TEST_PASS_RATIO = 0.7
export const MODULE_TEST_SIZE = 6
export const LEVEL_EXAM_SIZE = 12
export const SPEED_ROUND_SECONDS = 300
export const SPEED_ROUND_SIZE = 15
export const DAILY_TASKS_COUNT = 3
export const DAILY_BONUS_XP = 15

export const ASSESSMENT_XP: Record<AssessmentKind, number> = {
  module_test: 40,
  level_exam: 200,
  speed: 30,
  daily: 30,
  review: 20,
  project: 120
}
