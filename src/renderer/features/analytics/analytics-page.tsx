import { CheckCircle2, Clock, Flame, Gauge, ListChecks, Target, ThumbsDown, ThumbsUp, Timer, XCircle } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Link } from 'react-router'
import type { AnalyticsData, TopicStat } from '@shared/types/learning'
import { ActivityChart } from '@/components/common/activity-chart'
import { TypeBadge } from '@/components/common/exercise-badges'
import { Page, PageHeader } from '@/components/common/page'
import { StatCard } from '@/components/common/stat-card'
import { EmptyState, ErrorState } from '@/components/common/states'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useT } from '@/i18n'
import { formatDateTime, formatDuration, formatMs, formatPercent } from '@/lib/format'
import { useApi } from '@/lib/query'
import type { ExerciseType } from '@shared/constants/domain'

export function AnalyticsPage() {
  const t = useT()
  const analytics = useApi('analytics:get')
  return (
    <Page wide>
      <PageHeader title={t('analytics.title')} subtitle={t('analytics.subtitle')} />
      {analytics.isPending && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-72 rounded-xl" />
        </div>
      )}
      {analytics.isError && <ErrorState error={analytics.error} onRetry={() => analytics.refetch()} />}
      {analytics.data && <AnalyticsView data={analytics.data} />}
    </Page>
  )
}

function TopicList({ items, empty, tone }: { items: TopicStat[]; empty: string; tone: 'success' | 'warning' }) {
  if (items.length === 0) return <p className="py-4 text-center text-xs text-muted-foreground">{empty}</p>
  return (
    <ul className="space-y-2">
      {items.map((topic) => (
        <li key={topic.moduleId}>
          <Link to={`/learn/${topic.moduleId}`} className="block rounded-lg border bg-background/30 px-3 py-2 hover:border-primary/40">
            <div className="flex items-center justify-between text-sm">
              <span className="truncate">{topic.title}</span>
              <span className={tone === 'success' ? 'text-success' : 'text-warning'}>{formatPercent(topic.accuracy)}</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {topic.correct}/{topic.attempts} · {topic.solved}/{topic.total}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  )
}

function AnalyticsView({ data }: { data: AnalyticsData }) {
  const t = useT()
  const { totals } = data
  const typeData = data.byType.map((row) => ({ ...row, label: t(`exercises.types.${row.type as ExerciseType}`), wrong: row.attempts - row.correct }))
  const topics = data.byTopic.filter((topic) => topic.total > 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={CheckCircle2} label={t('analytics.solved')} value={totals.solved} hint={`${t('common.of')} ${totals.exercises} · ${formatPercent(totals.progress)}`} accent="text-success" />
        <StatCard icon={ListChecks} label={t('analytics.attempts')} value={totals.attempts} hint={`${t('analytics.errors')}: ${totals.incorrect}`} />
        <StatCard icon={Target} label={t('analytics.accuracy')} value={formatPercent(totals.accuracy)} accent="text-info">
          <Progress value={totals.accuracy * 100} className="h-1" indicatorClassName="bg-info" />
        </StatCard>
        <StatCard icon={Timer} label={t('analytics.avgTime')} value={totals.avgSolveMs > 0 ? formatMs(totals.avgSolveMs) : '—'} accent="text-amber-400" />
        <StatCard icon={Clock} label={t('analytics.learningTime')} value={formatDuration(totals.learningSeconds)} accent="text-info" />
        <StatCard icon={Flame} label={t('analytics.streak')} value={t('dashboard.days', { n: totals.currentStreak })} accent="text-orange-400" />
        <StatCard icon={Flame} label={t('analytics.longestStreak')} value={t('dashboard.days', { n: totals.longestStreak })} accent="text-orange-300" />
        <StatCard icon={XCircle} label={t('analytics.errors')} value={totals.incorrect} accent="text-destructive" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('analytics.activity')} · XP</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityChart data={data.activity} height={220} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              {t('analytics.activity')} · {t('analytics.correct')} / {t('analytics.wrong')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityChart data={data.activity} height={220} variant="bar" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{t('analytics.byLevel')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.byLevel.map((level) => (
              <div key={level.level} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>{level.title}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {level.solved}/{level.total}
                  </span>
                </div>
                <Progress value={level.total ? (level.solved / level.total) * 100 : 0} />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ThumbsUp className="size-4 text-success" />
              {t('analytics.strengths')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TopicList items={data.strengths} empty={t('analytics.noData')} tone="success" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ThumbsDown className="size-4 text-warning" />
              {t('analytics.weaknesses')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TopicList items={data.weaknesses} empty={t('analytics.noData')} tone="warning" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('analytics.byType')}</CardTitle>
          </CardHeader>
          <CardContent>
            {typeData.every((row) => row.attempts === 0) ? (
              <EmptyState icon={Gauge} title={t('analytics.noData')} />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={typeData} layout="vertical" margin={{ left: 40, right: 8 }}>
                  <CartesianGrid horizontal={false} stroke="oklch(1 0 0 / 5%)" />
                  <XAxis type="number" allowDecimals={false} stroke="oklch(1 0 0 / 30%)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="label" width={130} stroke="oklch(1 0 0 / 50%)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: 'oklch(1 0 0 / 4%)' }}
                    contentStyle={{ background: 'oklch(0.19 0.011 285)', border: '1px solid oklch(1 0 0 / 10%)', borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="correct" name={t('analytics.correct')} stackId="a" fill="oklch(0.72 0.16 155)" />
                  <Bar dataKey="wrong" name={t('analytics.wrong')} stackId="a" fill="oklch(0.64 0.21 22 / 70%)" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('analytics.recent')}</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[300px] space-y-0.5 overflow-y-auto px-2">
            {data.recentAttempts.length === 0 && <EmptyState title={t('analytics.noData')} className="mx-3" />}
            {data.recentAttempts.map((attempt) => (
              <Link key={attempt.id} to={`/exercises/${attempt.exerciseId}`} className="flex items-center gap-2.5 rounded-md px-3 py-1.5 hover:bg-accent/50">
                {attempt.correct ? <CheckCircle2 className="size-3.5 text-success" /> : <XCircle className="size-3.5 text-destructive" />}
                <span className="flex-1 truncate text-sm">{attempt.title}</span>
                <TypeBadge type={attempt.type} />
                {attempt.xp > 0 && <span className="text-xs text-primary">+{attempt.xp}</span>}
                <span className="w-24 text-right text-[11px] text-muted-foreground">{formatDateTime(attempt.submittedAt)}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('analytics.byTopic')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-x-8 gap-y-2.5 md:grid-cols-2">
            {topics.map((topic) => (
              <Link key={topic.moduleId} to={`/learn/${topic.moduleId}`} className="group space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="truncate group-hover:text-primary">{topic.title}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {topic.solved}/{topic.total}
                    {topic.attempts > 0 && ` · ${formatPercent(topic.accuracy)}`}
                  </span>
                </div>
                <Progress value={(topic.solved / topic.total) * 100} className="h-1" />
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
