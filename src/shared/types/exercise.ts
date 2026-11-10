import type {
  AttemptContext,
  Difficulty,
  ExerciseType,
  JoinType,
  LevelId,
  ProgressStatus,
  QueryExerciseType,
  StatementKind
} from '../constants/domain'
import type { ComparisonIssue, EngineError, ResultSet } from './engine'

export interface ExerciseSummary {
  id: string
  title: string
  snippet: string
  type: ExerciseType
  difficulty: Difficulty
  level: LevelId
  moduleId: string
  moduleTitle: string
  dataset: string
  xp: number
  minutes: number
  tags: string[]
  status: ProgressStatus
  isFavorite: boolean
  attempts: number
}

export type PublicExerciseContent =
  | {
      type: QueryExerciseType
      starter: string
      mode: 'query' | 'mutation'
      allow: StatementKind[]
      orderMatters: boolean
      columnNames: boolean
    }
  | { type: 'predict_result'; sql: string; ask: 'value' | 'rowCount'; options: string[] | null }
  | { type: 'choose_query'; options: string[] }
  | { type: 'fill_blank'; template: string; blanks: { choices: string[] | null }[] }
  | { type: 'join_builder'; tables: string[]; select: string; suffix: string }
  | { type: 'order_parts'; pieces: string[] }
  | { type: 'explain_query'; sql: string; options: string[] }

export interface ExerciseProgressDto {
  status: ProgressStatus
  attempts: number
  correctAttempts: number
  draft: string | null
  solutionRevealed: boolean
  firstSolvedAt: number | null
  bestTimeMs: number | null
}

export interface PublicExercise extends ExerciseSummary {
  description: string
  theory: string
  hints: string[]
  content: PublicExerciseContent
  hiddenTestCount: number
  relatedTables: string[]
  progress: ExerciseProgressDto
  note: string
  prevId: string | null
  nextId: string | null
  levelTitle: string
}

export type ExerciseAnswer =
  | { kind: 'sql'; sql: string }
  | { kind: 'option'; option: number }
  | { kind: 'value'; value: string }
  | { kind: 'blanks'; blanks: string[] }
  | { kind: 'parts'; parts: number[] }
  | { kind: 'join'; left: string; right: string; join: JoinType; leftColumn?: string; rightColumn?: string }

export interface ScenarioOutcome {
  name: string
  hidden: boolean
  passed: boolean
}

export interface GradeResult {
  correct: boolean
  issue?: ComparisonIssue
  error?: EngineError
  scenarios: ScenarioOutcome[]
  userResult?: ResultSet | null
  expectedResult?: ResultSet | null
  executedSql?: string
}

export interface RunResult {
  executedSql: string
  error?: EngineError
  result: ResultSet | null
  rowsAffected: number
  durationMs: number
  expectedResult: ResultSet | null
}

export interface UnlockedAchievement {
  id: string
  title: string
  description: string
  icon: string
  xpReward: number
}

export interface SubmitResult {
  grade: GradeResult
  xpAwarded: number
  levelUp: { from: number; to: number } | null
  unlockedAchievements: UnlockedAchievement[]
  progress: ExerciseProgressDto
  explanation: string | null
  dailyGoalReached: boolean
}

export interface RevealedSolution {
  solution: string
  explanation: string
}

export interface AttemptDto {
  id: number
  exerciseId: string
  title: string
  type: ExerciseType
  correct: boolean
  submittedAt: number
  durationMs: number
  xp: number
  context: AttemptContext
}

export interface CatalogFacets {
  total: number
  byLevel: Record<string, number>
  byType: Record<string, number>
  byDifficulty: Record<string, number>
  modules: { id: string; title: string; level: LevelId; count: number }[]
  xpRange: [number, number]
  minutesRange: [number, number]
}

export interface CatalogPage {
  items: ExerciseSummary[]
  total: number
}
