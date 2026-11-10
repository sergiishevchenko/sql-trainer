import { sql } from 'drizzle-orm'
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    username: text('username').notNull(),
    usernameNormalized: text('username_normalized').notNull(),
    email: text('email').notNull(),
    emailNormalized: text('email_normalized').notNull(),
    passwordHash: text('password_hash').notNull(),
    recoveryHash: text('recovery_hash').notNull(),
    avatarColor: text('avatar_color').notNull(),
    createdAt: integer('created_at').notNull(),
    lastLoginAt: integer('last_login_at'),
    level: integer('level').notNull().default(1),
    xp: integer('xp').notNull().default(0),
    completedCount: integer('completed_count').notNull().default(0),
    learningSeconds: integer('learning_seconds').notNull().default(0),
    currentStreak: integer('current_streak').notNull().default(0),
    longestStreak: integer('longest_streak').notNull().default(0),
    lastActiveDate: text('last_active_date'),
    lastExerciseId: text('last_exercise_id')
  },
  (t) => [
    uniqueIndex('users_username_idx').on(t.usernameNormalized),
    uniqueIndex('users_email_idx').on(t.emailNormalized)
  ]
)

export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    createdAt: integer('created_at').notNull(),
    expiresAt: integer('expires_at').notNull()
  },
  (t) => [index('sessions_user_idx').on(t.userId)]
)

export const userSettings = sqliteTable('user_settings', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  locale: text('locale').notNull().default('ru'),
  dailyGoal: integer('daily_goal').notNull().default(50),
  editorFontSize: integer('editor_font_size').notNull().default(14),
  editorMinimap: integer('editor_minimap', { mode: 'boolean' }).notNull().default(false),
  editorWordWrap: integer('editor_word_wrap', { mode: 'boolean' }).notNull().default(true),
  autoSaveDrafts: integer('auto_save_drafts', { mode: 'boolean' }).notNull().default(true),
  reduceMotion: integer('reduce_motion', { mode: 'boolean' }).notNull().default(false),
  updatedAt: integer('updated_at').notNull()
})

export const courses = sqliteTable('courses', {
  id: text('id').primaryKey(),
  position: integer('position').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull()
})

export const modules = sqliteTable(
  'modules',
  {
    id: text('id').primaryKey(),
    courseId: text('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    theory: text('theory').notNull(),
    tags: text('tags').notNull().default('[]')
  },
  (t) => [index('modules_course_idx').on(t.courseId)]
)

export const exercises = sqliteTable(
  'exercises',
  {
    id: text('id').primaryKey(),
    moduleId: text('module_id')
      .notNull()
      .references(() => modules.id, { onDelete: 'cascade' }),
    courseId: text('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    type: text('type').notNull(),
    difficulty: text('difficulty').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    dataset: text('dataset').notNull(),
    xp: integer('xp').notNull(),
    minutes: integer('minutes').notNull(),
    tags: text('tags').notNull(),
    contentHash: text('content_hash').notNull(),
    payload: text('payload').notNull(),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    updatedAt: integer('updated_at').notNull()
  },
  (t) => [
    index('exercises_module_idx').on(t.moduleId),
    index('exercises_course_idx').on(t.courseId),
    index('exercises_type_idx').on(t.type),
    index('exercises_difficulty_idx').on(t.difficulty)
  ]
)

export const exerciseAttempts = sqliteTable(
  'exercise_attempts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'cascade' }),
    submittedAt: integer('submitted_at').notNull(),
    isCorrect: integer('is_correct', { mode: 'boolean' }).notNull(),
    answer: text('answer').notNull(),
    durationMs: integer('duration_ms').notNull().default(0),
    xpAwarded: integer('xp_awarded').notNull().default(0),
    errorCode: text('error_code'),
    context: text('context').notNull().default('practice'),
    assessmentId: integer('assessment_id')
  },
  (t) => [
    index('attempts_user_time_idx').on(t.userId, t.submittedAt),
    index('attempts_user_exercise_idx').on(t.userId, t.exerciseId)
  ]
)

export const exerciseProgress = sqliteTable(
  'exercise_progress',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('not_started'),
    attempts: integer('attempts').notNull().default(0),
    correctAttempts: integer('correct_attempts').notNull().default(0),
    failedSinceSolve: integer('failed_since_solve').notNull().default(0),
    firstSolvedAt: integer('first_solved_at'),
    firstTry: integer('first_try', { mode: 'boolean' }).notNull().default(false),
    lastAttemptAt: integer('last_attempt_at'),
    bestTimeMs: integer('best_time_ms'),
    draft: text('draft'),
    solutionRevealed: integer('solution_revealed', { mode: 'boolean' }).notNull().default(false),
    xpEarned: integer('xp_earned').notNull().default(0),
    updatedAt: integer('updated_at').notNull()
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.exerciseId] }),
    index('progress_user_status_idx').on(t.userId, t.status),
    index('progress_user_updated_idx').on(t.userId, t.updatedAt)
  ]
)

export const achievements = sqliteTable('achievements', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  icon: text('icon').notNull(),
  category: text('category').notNull(),
  xpReward: integer('xp_reward').notNull(),
  threshold: integer('threshold').notNull(),
  position: integer('position').notNull()
})

export const userAchievements = sqliteTable(
  'user_achievements',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    achievementId: text('achievement_id')
      .notNull()
      .references(() => achievements.id, { onDelete: 'cascade' }),
    unlockedAt: integer('unlocked_at').notNull()
  },
  (t) => [primaryKey({ columns: [t.userId, t.achievementId] })]
)

export const dailyActivity = sqliteTable(
  'daily_activity',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    date: text('date').notNull(),
    xp: integer('xp').notNull().default(0),
    solved: integer('solved').notNull().default(0),
    attempts: integer('attempts').notNull().default(0),
    correct: integer('correct').notNull().default(0),
    seconds: integer('seconds').notNull().default(0)
  },
  (t) => [primaryKey({ columns: [t.userId, t.date] })]
)

export const favorites = sqliteTable(
  'favorites',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at').notNull()
  },
  (t) => [primaryKey({ columns: [t.userId, t.exerciseId] })]
)

export const learningSessions = sqliteTable(
  'learning_sessions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    startedAt: integer('started_at').notNull(),
    lastSeenAt: integer('last_seen_at').notNull(),
    seconds: integer('seconds').notNull().default(0)
  },
  (t) => [index('learning_sessions_user_idx').on(t.userId, t.startedAt)]
)

export const queryHistory = sqliteTable(
  'query_history',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    dataset: text('dataset').notNull(),
    sql: text('sql').notNull(),
    executedAt: integer('executed_at').notNull(),
    success: integer('success', { mode: 'boolean' }).notNull(),
    rowCount: integer('row_count').notNull().default(0),
    durationMs: integer('duration_ms').notNull().default(0),
    error: text('error')
  },
  (t) => [index('query_history_user_idx').on(t.userId, t.executedAt)]
)

export const userNotes = sqliteTable(
  'user_notes',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    updatedAt: integer('updated_at').notNull()
  },
  (t) => [primaryKey({ columns: [t.userId, t.exerciseId] })]
)

export const assessments = sqliteTable(
  'assessments',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    scopeId: text('scope_id'),
    title: text('title').notNull(),
    exerciseIds: text('exercise_ids').notNull(),
    answers: text('answers').notNull().default('{}'),
    startedAt: integer('started_at').notNull(),
    finishedAt: integer('finished_at'),
    timeLimitSec: integer('time_limit_sec'),
    correctCount: integer('correct_count').notNull().default(0),
    total: integer('total').notNull(),
    score: integer('score'),
    passed: integer('passed', { mode: 'boolean' }).notNull().default(false),
    xpAwarded: integer('xp_awarded').notNull().default(0)
  },
  (t) => [index('assessments_user_kind_idx').on(t.userId, t.kind, t.scopeId)]
)

export const appMeta = sqliteTable('app_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at')
    .notNull()
    .default(sql`(unixepoch() * 1000)`)
})
