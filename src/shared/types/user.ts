import type { RankKey } from '../constants/levels'

export interface UserProfile {
  id: string
  username: string
  email: string
  createdAt: number
  lastLoginAt: number | null
  level: number
  xp: number
  levelProgress: number
  currentLevelXp: number
  nextLevelXp: number
  rank: RankKey
  completedCount: number
  learningSeconds: number
  currentStreak: number
  longestStreak: number
  avatarColor: string
  lastExerciseId: string | null
}

export interface AccountSummary {
  id: string
  username: string
  avatarColor: string
  level: number
  lastLoginAt: number | null
}

export interface UserSettingsDto {
  locale: 'ru' | 'en'
  dailyGoal: number
  editorFontSize: number
  editorMinimap: boolean
  editorWordWrap: boolean
  autoSaveDrafts: boolean
  reduceMotion: boolean
}

export interface AuthResult {
  user: UserProfile
  recoveryCode?: string
}
