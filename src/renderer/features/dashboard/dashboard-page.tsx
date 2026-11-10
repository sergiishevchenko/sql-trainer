import { motion } from 'framer-motion'
import { ArrowRight, CalendarCheck, CheckCircle2, Clock, Flame, Sparkles, Target, Trophy, Zap } from 'lucide-react'
import { Link } from 'react-router'
import { rankForLevel } from '@shared/constants/levels'
import { DAILY_BONUS_XP } from '@shared/constants/domain'
import type { DashboardData } from '@shared/types/learning'
import { ActivityChart } from '@/components/common/activity-chart'
import { DifficultyBadge, StatusIcon, TypeBadge } from '@/components/common/exercise-badges'
import { ExerciseRow } from '@/components/common/exercise-row'
import { NamedIcon } from '@/components/common/icon'
import { Page } from '@/components/common/page'
import { StatCard } from '@/components/common/stat-card'
import { ErrorState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useT } from '@/i18n'
import { formatDuration, formatNumber, formatPercent } from '@/lib/format'
import { useApi } from '@/lib/query'
import { useStartAssessment } from '@/features/practice/use-start-assessment'

function greetingKey(): 'dashboard.greetingMorning' | 'dashboard.greetingDay' | 'dashboard.greetingEvening' {
  const hour = new Date().getHours()
  if (hour < 12) return 'dashboard.greetingMorning'
  if (hour < 18) return 'dashboard.greetingDay'
  return 'dashboard.greetingEvening'
}

export function DashboardPage() {
  const dashboard = useApi('dashboard:get')
  if (dashboard.isPending) return <DashboardSkeleton />
  if (dashboard.isError) return <Page><ErrorState error={dashboard.error} onRetry={() => dashboard.refetch()} /></Page>
  return <DashboardView data={dashboard.data} />
}

function DashboardView({ data }: { data: DashboardData }) {
  const t = useT()
  const { user, totals, today } = data
  const levelSpan = user.nextLevelXp - user.currentLevelXp
  const levelPercent = levelSpan > 0 ? ((user.xp - user.currentLevelXp) / levelSpan) * 100 : 100
  const goalPercent = Math.min(100, (today.xp / Math.max(1, today.goal)) * 100)

  return (
    <Page wide>
      <div className="mb-7 flex items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="dashboard-greeting">
            {t(greetingKey(), { name: user.username })}
          </h1>
          <p className="text-sm text-muted-foreground">{t('dashboard.subtitle')}</p>
        </div>
        <Card className="flex items-center gap-4 px-4 py-3">
          <div className="relative size-12">
            <svg viewBox="0 0 36 36" className="size-12 -rotate-90">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="oklch(1 0 0 / 8%)" strokeWidth="3" />
              <motion.circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                stroke={today.goalReached ? 'oklch(0.72 0.16 155)' : 'oklch(0.64 0.2 286)'}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={97.4}
                initial={{ strokeDashoffset: 97.4 }}
                animate={{ strokeDashoffset: 97.4 * (1 - goalPercent / 100) }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </svg>
            <Target className="absolute inset-0 m-auto size-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t('dashboard.todayGoal')}</p>
            <p className="text-sm font-semibold tabular-nums">
              {today.xp} / {today.goal} XP
            </p>
            {today.goalReached && <p className="text-[11px] text-success">{t('dashboard.goalReached')}</p>}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard icon={Sparkles} label={t('dashboard.level')} value={user.level} hint={t(`ranks.${rankForLevel(user.level)}`)}>
          <Progress value={levelPercent} className="h-1" />
        </StatCard>
        <StatCard icon={Zap} label={t('dashboard.totalXp')} value={formatNumber(user.xp)} hint={`${formatNumber(user.nextLevelXp - user.xp)} XP до уровня ${user.level + 1}`} accent="text-amber-400" />
        <StatCard icon={CheckCircle2} label={t('dashboard.solved')} value={`${totals.solved}`} hint={`${t('common.of')} ${totals.exercises} · ${formatPercent(totals.progress)}`} accent="text-success">
          <Progress value={totals.progress * 100} className="h-1" indicatorClassName="bg-success" />
        </StatCard>
        <StatCard icon={Flame} label={t('dashboard.streak')} value={t('dashboard.days', { n: user.currentStreak })} hint={`Рекорд: ${user.longestStreak}`} accent="text-orange-400" />
        <StatCard icon={Clock} label={t('dashboard.learningTime')} value={formatDuration(user.learningSeconds)} accent="text-info" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <ContinueCard data={data} />
        <DailyCard data={data} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('dashboard.activityTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityChart data={data.activity} height={210} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>{t('dashboard.recentAchievements')}</CardTitle>
            <Link to="/achievements" className="text-xs text-muted-foreground hover:text-primary">
              {t('nav.achievements')}
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.recentAchievements.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <Trophy className="size-6 text-muted-foreground/50" />
                <p className="text-xs text-muted-foreground">{t('dashboard.noAchievements')}</p>
              </div>
            )}
            {data.recentAchievements.map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded-lg border bg-background/30 p-2.5">
                <div className="flex size-9 items-center justify-center rounded-md bg-primary/15 text-primary">
                  <NamedIcon name={a.icon} className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{a.title}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{a.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {data.recommended.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>{t('dashboard.recommended')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0.5 px-2">
            {data.recommended.map((ex) => (
              <ExerciseRow key={ex.id} exercise={ex} />
            ))}
          </CardContent>
        </Card>
      )}
    </Page>
  )
}

function ContinueCard({ data }: { data: DashboardData }) {
  const t = useT()
  const ex = data.continueExercise
  return (
    <Card className="relative overflow-hidden lg:col-span-2">
      <div className="glow pointer-events-none absolute inset-0 opacity-70" />
      <CardHeader className="relative">
        <CardDescription>{t('dashboard.continueTitle')}</CardDescription>
      </CardHeader>
      <CardContent className="relative">
        {ex ? (
          <div className="flex items-end justify-between gap-6">
            <div className="min-w-0 space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <StatusIcon status={ex.status} className="size-3.5" />
                {ex.moduleTitle}
              </div>
              <h2 className="truncate text-lg font-semibold tracking-tight">{ex.title}</h2>
              <p className="line-clamp-2 max-w-xl text-sm text-muted-foreground">{ex.snippet}</p>
              <div className="flex items-center gap-1.5 pt-1">
                <TypeBadge type={ex.type} />
                <DifficultyBadge difficulty={ex.difficulty} />
                <span className="text-xs text-primary">+{ex.xp} XP</span>
              </div>
            </div>
            <Button asChild size="lg" className="shrink-0" data-testid="continue-exercise">
              <Link to={`/exercises/${ex.id}`}>
                {t('common.continue')}
                <ArrowRight />
              </Link>
            </Button>
          </div>
        ) : (
          <p className="py-4 text-sm text-muted-foreground">{t('dashboard.continueEmpty')}</p>
        )}
        <div className="mt-5 space-y-1.5 border-t pt-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {t('dashboard.currentLevel')}: <span className="text-foreground">{data.currentLevel.title}</span>
            </span>
            <span className="tabular-nums text-muted-foreground">
              {data.currentLevel.solved} / {data.currentLevel.total}
            </span>
          </div>
          <Progress value={data.currentLevel.progress * 100} />
        </div>
      </CardContent>
    </Card>
  )
}

function DailyCard({ data }: { data: DashboardData }) {
  const t = useT()
  const start = useStartAssessment()
  const daily = data.daily
  const done = daily.exercises.length > 0 && daily.completed >= daily.exercises.length
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <CalendarCheck className="size-4 text-primary" />
            {t('dashboard.daily')}
          </CardTitle>
          <CardDescription>
            {done ? t('dashboard.dailyDone') : `${t('dashboard.dailyBonus')}: +${DAILY_BONUS_XP} XP`}
          </CardDescription>
        </div>
        <span className="text-sm font-semibold tabular-nums">
          {daily.completed}/{daily.exercises.length}
        </span>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          {daily.exercises.map((ex) => (
            <div key={ex.id} className="flex items-center gap-2 text-sm">
              <StatusIcon status={ex.status} className="size-3.5" />
              <span className="truncate">{ex.title}</span>
            </div>
          ))}
        </div>
        <Button
          variant={done ? 'secondary' : 'default'}
          className="w-full"
          loading={start.isPending}
          onClick={() => start.mutate({ kind: 'daily' })}
          disabled={daily.exercises.length === 0}
        >
          {done ? t('common.open') : daily.completed > 0 ? t('common.continue') : t('common.start')}
        </Button>
      </CardContent>
    </Card>
  )
}

function DashboardSkeleton() {
  return (
    <Page wide>
      <Skeleton className="mb-2 h-8 w-72" />
      <Skeleton className="mb-7 h-4 w-48" />
      <div className="grid grid-cols-5 gap-3">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-4">
        <Skeleton className="col-span-2 h-56 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
      <Skeleton className="mt-4 h-64 rounded-xl" />
    </Page>
  )
}
