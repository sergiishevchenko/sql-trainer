import type { LevelId } from './domain'
import type { Locale } from './locale'

export type AchievementMetric =
  | { kind: 'solved_total' }
  | { kind: 'solved_tag'; tag: string }
  | { kind: 'solved_type'; type: string }
  | { kind: 'first_try_total' }
  | { kind: 'correct_in_day' }
  | { kind: 'streak' }
  | { kind: 'level_completed'; level: LevelId }
  | { kind: 'assessments_passed'; assessment: string }
  | { kind: 'speed_best' }
  | { kind: 'playground_queries' }
  | { kind: 'playground_datasets' }
  | { kind: 'learning_minutes' }

export type AchievementCategory = 'progress' | 'mastery' | 'habits' | 'challenges' | 'explorer'

export interface AchievementDefinition {
  id: string
  title: string
  description: Record<Locale, string>
  icon: string
  category: AchievementCategory
  xpReward: number
  threshold: number
  metric: AchievementMetric
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  { id: 'first_query', title: 'First Query', description: { en: 'Solve your first exercise', ru: 'Решите первое задание' }, icon: 'sparkles', category: 'progress', xpReward: 10, threshold: 1, metric: { kind: 'solved_total' } },
  { id: 'getting_started', title: 'Getting Started', description: { en: 'Solve 10 exercises', ru: 'Решите 10 заданий' }, icon: 'rocket', category: 'progress', xpReward: 20, threshold: 10, metric: { kind: 'solved_total' } },
  { id: 'quarter_century', title: 'Quarter Century', description: { en: 'Solve 25 exercises', ru: 'Решите 25 заданий' }, icon: 'trending-up', category: 'progress', xpReward: 30, threshold: 25, metric: { kind: 'solved_total' } },
  { id: 'half_hundred', title: 'Half Hundred', description: { en: 'Solve 50 exercises', ru: 'Решите 50 заданий' }, icon: 'medal', category: 'progress', xpReward: 50, threshold: 50, metric: { kind: 'solved_total' } },
  { id: 'sql_marathon', title: 'SQL Marathon', description: { en: 'Solve 100 exercises', ru: 'Решите 100 заданий' }, icon: 'flag', category: 'progress', xpReward: 100, threshold: 100, metric: { kind: 'solved_total' } },
  { id: 'sql_ultramarathon', title: 'SQL Ultramarathon', description: { en: 'Solve 250 exercises', ru: 'Решите 250 заданий' }, icon: 'mountain', category: 'progress', xpReward: 200, threshold: 250, metric: { kind: 'solved_total' } },
  { id: 'sql_legend', title: 'SQL Legend', description: { en: 'Solve 500 exercises', ru: 'Решите 500 заданий' }, icon: 'crown', category: 'progress', xpReward: 500, threshold: 500, metric: { kind: 'solved_total' } },
  { id: 'sql_beginner', title: 'SQL Beginner', description: { en: 'Complete the SQL Beginner level', ru: 'Завершите уровень SQL Beginner' }, icon: 'graduation-cap', category: 'mastery', xpReward: 100, threshold: 1, metric: { kind: 'level_completed', level: 'beginner' } },
  { id: 'sql_fundamentals', title: 'SQL Fundamentals', description: { en: 'Complete the SQL Fundamentals level', ru: 'Завершите уровень SQL Fundamentals' }, icon: 'book-open', category: 'mastery', xpReward: 150, threshold: 1, metric: { kind: 'level_completed', level: 'fundamentals' } },
  { id: 'sql_intermediate', title: 'Intermediate SQL', description: { en: 'Complete the Intermediate SQL level', ru: 'Завершите уровень Intermediate SQL' }, icon: 'layers', category: 'mastery', xpReward: 200, threshold: 1, metric: { kind: 'level_completed', level: 'intermediate' } },
  { id: 'sql_advanced', title: 'Advanced SQL', description: { en: 'Complete the Advanced SQL level', ru: 'Завершите уровень Advanced SQL' }, icon: 'zap', category: 'mastery', xpReward: 300, threshold: 1, metric: { kind: 'level_completed', level: 'advanced' } },
  { id: 'sql_expert', title: 'Expert SQL', description: { en: 'Complete the Expert SQL level', ru: 'Завершите уровень Expert SQL' }, icon: 'gem', category: 'mastery', xpReward: 500, threshold: 1, metric: { kind: 'level_completed', level: 'expert' } },
  { id: 'join_master', title: 'JOIN Master', description: { en: 'Solve 30 JOIN exercises', ru: 'Решите 30 задач на JOIN' }, icon: 'git-merge', category: 'mastery', xpReward: 100, threshold: 30, metric: { kind: 'solved_tag', tag: 'join' } },
  { id: 'window_expert', title: 'Window Expert', description: { en: 'Solve 20 window function exercises', ru: 'Решите 20 задач на оконные функции' }, icon: 'app-window', category: 'mastery', xpReward: 100, threshold: 20, metric: { kind: 'solved_tag', tag: 'window' } },
  { id: 'aggregator', title: 'Aggregator', description: { en: 'Solve 25 aggregate function exercises', ru: 'Решите 25 задач на агрегатные функции' }, icon: 'sigma', category: 'mastery', xpReward: 60, threshold: 25, metric: { kind: 'solved_tag', tag: 'aggregate' } },
  { id: 'subquery_sage', title: 'Subquery Sage', description: { en: 'Solve 15 subquery exercises', ru: 'Решите 15 задач на подзапросы' }, icon: 'brackets', category: 'mastery', xpReward: 70, threshold: 15, metric: { kind: 'solved_tag', tag: 'subquery' } },
  { id: 'cte_architect', title: 'CTE Architect', description: { en: 'Solve 15 CTE exercises', ru: 'Решите 15 задач с CTE' }, icon: 'workflow', category: 'mastery', xpReward: 80, threshold: 15, metric: { kind: 'solved_tag', tag: 'cte' } },
  { id: 'bug_hunter', title: 'Bug Hunter', description: { en: 'Fix 15 broken queries', ru: 'Исправьте 15 ошибочных запросов' }, icon: 'bug', category: 'challenges', xpReward: 60, threshold: 15, metric: { kind: 'solved_type', type: 'fix_bug' } },
  { id: 'challenger', title: 'Challenger', description: { en: 'Solve 10 SQL Challenges', ru: 'Решите 10 SQL Challenge' }, icon: 'swords', category: 'challenges', xpReward: 120, threshold: 10, metric: { kind: 'solved_type', type: 'challenge' } },
  { id: 'perfectionist', title: 'Perfectionist', description: { en: 'Solve 20 exercises on the first try', ru: 'Решите 20 заданий с первой попытки' }, icon: 'target', category: 'challenges', xpReward: 60, threshold: 20, metric: { kind: 'first_try_total' } },
  { id: 'perfect_day', title: 'Perfect Day', description: { en: '10 correct answers in a single day', ru: '10 правильных ответов за один день' }, icon: 'sun', category: 'habits', xpReward: 50, threshold: 10, metric: { kind: 'correct_in_day' } },
  { id: 'consistency', title: 'Consistency', description: { en: 'Practice 7 days in a row', ru: 'Занимайтесь 7 дней подряд' }, icon: 'flame', category: 'habits', xpReward: 70, threshold: 7, metric: { kind: 'streak' } },
  { id: 'unstoppable', title: 'Unstoppable', description: { en: 'Practice 30 days in a row', ru: 'Занимайтесь 30 дней подряд' }, icon: 'calendar-check', category: 'habits', xpReward: 300, threshold: 30, metric: { kind: 'streak' } },
  { id: 'focused_hour', title: 'Focused Hour', description: { en: 'Spend 60 minutes learning', ru: 'Проведите в обучении 60 минут' }, icon: 'clock', category: 'habits', xpReward: 30, threshold: 60, metric: { kind: 'learning_minutes' } },
  { id: 'module_tester', title: 'Test Passed', description: { en: 'Pass your first module test', ru: 'Сдайте первый тест модуля' }, icon: 'clipboard-check', category: 'challenges', xpReward: 30, threshold: 1, metric: { kind: 'assessments_passed', assessment: 'module_test' } },
  { id: 'examiner', title: 'Examiner', description: { en: 'Pass a level exam', ru: 'Сдайте экзамен уровня' }, icon: 'award', category: 'challenges', xpReward: 100, threshold: 1, metric: { kind: 'assessments_passed', assessment: 'level_exam' } },
  { id: 'daily_habit', title: 'Daily Habit', description: { en: 'Complete the daily challenge 5 times', ru: 'Выполните ежедневные задания 5 раз' }, icon: 'calendar-days', category: 'habits', xpReward: 60, threshold: 5, metric: { kind: 'assessments_passed', assessment: 'daily' } },
  { id: 'speedrunner', title: 'Speedrunner', description: { en: 'Solve 10 exercises in a single speed round', ru: 'Решите 10 задач в одном скоростном раунде' }, icon: 'timer', category: 'challenges', xpReward: 80, threshold: 10, metric: { kind: 'speed_best' } },
  { id: 'sandbox_explorer', title: 'Sandbox Explorer', description: { en: 'Run 50 queries in the playground', ru: 'Выполните 50 запросов в песочнице' }, icon: 'terminal', category: 'explorer', xpReward: 30, threshold: 50, metric: { kind: 'playground_queries' } },
  { id: 'data_tourist', title: 'Data Tourist', description: { en: 'Work with every training database in the playground', ru: 'Поработайте со всеми учебными базами в песочнице' }, icon: 'database', category: 'explorer', xpReward: 40, threshold: 6, metric: { kind: 'playground_datasets' } }
]
