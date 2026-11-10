import { CalendarCheck, CheckCircle2, ChevronRight, FolderKanban, GraduationCap, RotateCcw, Timer, XCircle, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { SPEED_ROUND_SIZE } from '@shared/constants/domain'
import type { AssessmentDto } from '@shared/types/learning'
import { Page, PageHeader } from '@/components/common/page'
import { EmptyState } from '@/components/common/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useT } from '@/i18n'
import { formatDateTime } from '@/lib/format'
import { useApi } from '@/lib/query'
import { useStartAssessment } from './use-start-assessment'

function ModeCard({ icon: Icon, title, text, footer, accent }: { icon: LucideIcon; title: string; text: string; footer: ReactNode; accent: string }) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className={`mb-2 flex size-9 items-center justify-center rounded-lg ${accent}`}>
          <Icon className="size-4.5" />
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription className="text-[13px]">{text}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto">{footer}</CardContent>
    </Card>
  )
}

export function PracticePage() {
  const t = useT()
  const start = useStartAssessment()
  const daily = useApi('assessments:daily')
  const recent = useApi('assessments:recent')
  const levels = useApi('learning:levels')
  const projects = useApi('learning:projects')
  const reviewCount = useApi('exercises:list', { status: 'needs_review', limit: 1 })
  const pending = (kind: string, scopeId?: string) => start.isPending && start.variables?.kind === kind && start.variables?.scopeId === scopeId

  return (
    <Page wide>
      <PageHeader title={t('practice.title')} subtitle={t('practice.subtitle')} />
      <div className="grid gap-4 md:grid-cols-3">
        <ModeCard
          icon={CalendarCheck}
          accent="bg-primary/15 text-primary"
          title={t('practice.daily')}
          text={t('practice.dailyText')}
          footer={
            <div className="space-y-3">
              {daily.data && (
                <div className="flex items-center gap-2">
                  <Progress value={(daily.data.completed / Math.max(1, daily.data.exercises.length)) * 100} />
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {daily.data.completed}/{daily.data.exercises.length}
                  </span>
                </div>
              )}
              <Button className="w-full" loading={pending('daily')} onClick={() => start.mutate({ kind: 'daily' })}>
                {daily.data && daily.data.completed > 0 ? t('practice.resume') : t('practice.startSession')}
              </Button>
            </div>
          }
        />
        <ModeCard
          icon={Timer}
          accent="bg-amber-400/15 text-amber-400"
          title={t('practice.speed')}
          text={t('practice.speedText', { n: SPEED_ROUND_SIZE })}
          footer={
            <Button className="w-full" variant="secondary" loading={pending('speed')} onClick={() => start.mutate({ kind: 'speed' })} data-testid="start-speed">
              {t('practice.startSession')}
            </Button>
          }
        />
        <ModeCard
          icon={RotateCcw}
          accent="bg-warning/15 text-warning"
          title={t('practice.review')}
          text={t('practice.reviewText')}
          footer={
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">{t('practice.reviewCount', { n: reviewCount.data?.total ?? 0 })}</p>
              <Button className="w-full" variant="secondary" loading={pending('review')} onClick={() => start.mutate({ kind: 'review' })}>
                {t('practice.startSession')}
              </Button>
            </div>
          }
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="size-4 text-primary" />
              {t('practice.exams')}
            </CardTitle>
            <CardDescription>{t('practice.examsText')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {levels.isPending && <Skeleton className="h-40" />}
            {levels.data?.map((level) => (
              <div key={level.id} className="flex items-center gap-3 rounded-lg border bg-background/30 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{level.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {level.solved}/{level.total}
                  </p>
                </div>
                {level.examPassed && <Badge variant="success">{t('practice.passed')}</Badge>}
                <Button size="xs" variant="outline" disabled={level.total === 0} loading={pending('level_exam', level.id)} onClick={() => start.mutate({ kind: 'level_exam', scopeId: level.id })}>
                  {t('practice.startSession')}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderKanban className="size-4 text-primary" />
              {t('practice.projects')}
            </CardTitle>
            <CardDescription>{t('practice.projectsText')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {projects.data?.length === 0 && <EmptyState title={t('common.empty')} />}
            {projects.data?.map((project) => (
              <div key={project.id} className="flex items-center gap-3 rounded-lg border bg-background/30 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{project.title}</p>
                  <p className="line-clamp-1 text-[11px] text-muted-foreground">{project.description}</p>
                </div>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {project.solved}/{project.total}
                </span>
                {project.completed && <CheckCircle2 className="size-4 text-success" />}
                <Button size="xs" variant="outline" loading={pending('project', project.id)} onClick={() => start.mutate({ kind: 'project', scopeId: project.id })}>
                  {t('common.open')}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>{t('practice.recent')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 px-2">
          {recent.data?.length === 0 && <EmptyState title={t('practice.noRecent')} className="mx-3" />}
          {recent.data?.map((a) => <RecentRow key={a.id} assessment={a} />)}
        </CardContent>
      </Card>
    </Page>
  )
}

function RecentRow({ assessment }: { assessment: AssessmentDto }) {
  const t = useT()
  const finished = assessment.finishedAt !== null
  return (
    <Link to={`/practice/session/${assessment.id}`} className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-accent/50">
      {!finished ? (
        <Timer className="size-4 text-info" />
      ) : assessment.passed ? (
        <CheckCircle2 className="size-4 text-success" />
      ) : (
        <XCircle className="size-4 text-destructive" />
      )}
      <span className="flex-1 truncate text-sm">{assessment.title}</span>
      <span className="text-xs text-muted-foreground tabular-nums">
        {assessment.correctCount}/{assessment.total}
      </span>
      {finished ? (
        <Badge variant={assessment.passed ? 'success' : 'outline'}>{assessment.passed ? t('practice.passed') : t('practice.failed')}</Badge>
      ) : (
        <Badge variant="info">{t('practice.inProgress')}</Badge>
      )}
      <span className="w-28 text-right text-[11px] text-muted-foreground">{formatDateTime(assessment.startedAt)}</span>
      <ChevronRight className="size-4 text-muted-foreground" />
    </Link>
  )
}

