import type { AchievementCategory } from '../constants/achievements'
import type { AssessmentKind, LevelId } from '../constants/domain'
import type { AttemptDto, ExerciseSummary } from './exercise'
import type { UserProfile } from './user'

export interface ModuleSummaryDto {
  id: string
  levelId: LevelId
  order: number
  title: string
  description: string
  tags: string[]
  total: number
  solved: number
  progress: number
  testPassed: boolean
  testBestScore: number | null
}

export interface LevelDto {
  id: LevelId
  order: number
  title: string
  description: string
  modules: ModuleSummaryDto[]
  total: number
  solved: number
  progress: number
  examPassed: boolean
  completed: boolean
}

export interface ModuleDetailDto extends ModuleSummaryDto {
  theory: string
  levelTitle: string
  exercises: ExerciseSummary[]
  prevModuleId: string | null
  nextModuleId: string | null
}

export interface ProjectDto {
  id: string
  title: string
  description: string
  level: LevelId
  dataset: string
  total: number
  solved: number
  completed: boolean
}

export interface AssessmentAnswerDto {
  correct: boolean
  answeredAt: number
}

export interface AssessmentDto {
  id: number
  kind: AssessmentKind
  scopeId: string | null
  title: string
  exerciseIds: string[]
  startedAt: number
  finishedAt: number | null
  timeLimitSec: number | null
  correctCount: number
  total: number
  score: number | null
  passed: boolean
  xpAwarded: number
  answers: Record<string, AssessmentAnswerDto>
}

export interface DailyTasksDto {
  date: string
  exercises: ExerciseSummary[]
  completed: number
  assessmentId: number | null
  bonusClaimed: boolean
}

export interface DayActivity {
  date: string
  xp: number
  solved: number
  attempts: number
  correct: number
  seconds: number
}

export interface AchievementDto {
  id: string
  title: string
  description: string
  icon: string
  category: AchievementCategory
  xpReward: number
  threshold: number
  current: number
  unlockedAt: number | null
}

export interface DashboardData {
  user: UserProfile
  totals: {
    exercises: number
    solved: number
    inProgress: number
    needsReview: number
    progress: number
  }
  today: { xp: number; solved: number; goal: number; goalReached: boolean }
  activity: DayActivity[]
  recentAchievements: AchievementDto[]
  continueExercise: ExerciseSummary | null
  recommended: ExerciseSummary[]
  currentLevel: { id: LevelId; title: string; progress: number; solved: number; total: number }
  daily: DailyTasksDto
}

export interface TopicStat {
  moduleId: string
  title: string
  level: LevelId
  solved: number
  total: number
  attempts: number
  correct: number
  accuracy: number
}

export interface AnalyticsData {
  totals: {
    solved: number
    attempts: number
    correct: number
    incorrect: number
    accuracy: number
    avgSolveMs: number
    learningSeconds: number
    exercises: number
    progress: number
    currentStreak: number
    longestStreak: number
  }
  activity: DayActivity[]
  byLevel: { level: LevelId; title: string; solved: number; total: number }[]
  byTopic: TopicStat[]
  byType: { type: string; solved: number; attempts: number; correct: number }[]
  strengths: TopicStat[]
  weaknesses: TopicStat[]
  recentAttempts: AttemptDto[]
}
