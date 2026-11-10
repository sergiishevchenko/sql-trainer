import { ArrowLeft, ArrowRight, Award, ClipboardCheck, ListChecks, Play } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { MODULE_TEST_SIZE } from '@shared/constants/domain'
import { ExerciseRow } from '@/components/common/exercise-row'
import { Markdown } from '@/components/common/markdown'
import { Page } from '@/components/common/page'
import { EmptyState, ErrorState } from '@/components/common/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useT } from '@/i18n'
import { formatPercent } from '@/lib/format'
import { useApi } from '@/lib/query'
import { useStartAssessment } from '@/features/practice/use-start-assessment'

export function ModulePage() {
  const t = useT()
  const { moduleId = '' } = useParams()
  const module = useApi('learning:module', { moduleId })
  const startTest = useStartAssessment()

  if (module.isPending) {
    return (
      <Page>
        <Skeleton className="mb-3 h-4 w-40" />
        <Skeleton className="mb-6 h-8 w-80" />
        <div className="grid grid-cols-5 gap-5">
          <Skeleton className="col-span-3 h-96 rounded-xl" />
          <Skeleton className="col-span-2 h-96 rounded-xl" />
        </div>
      </Page>
    )
  }
  if (module.isError) {
    return (
      <Page>
        <ErrorState error={module.error} onRetry={() => module.refetch()} />
      </Page>
    )
  }

  const data = module.data
  const firstOpen = data.exercises.find((e) => e.status !== 'solved') ?? data.exercises[0]

  return (
    <Page wide>
      <Link to="/learn" className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3" />
        {data.levelTitle}
      </Link>
      <div className="mb-6 flex items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">{data.title}</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">{data.description}</p>
          <div className="flex items-center gap-3">
            <Progress value={data.progress * 100} className="w-56" />
            <span className="text-xs text-muted-foreground tabular-nums">
              {data.solved}/{data.total} · {formatPercent(data.progress)}
            </span>
            {data.testPassed && (
              <Badge>
                <Award />
                {t('learning.testPassed')}
              </Badge>
            )}
          </div>
        </div>
        {firstOpen && (
          <Button asChild size="lg">
            <Link to={`/exercises/${firstOpen.id}`}>
              <Play />
              {data.solved > 0 ? t('common.continue') : t('learning.startModule')}
            </Link>
          </Button>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>{t('learning.theory')}</CardTitle>
          </CardHeader>
          <CardContent>
            {data.theory ? <Markdown>{data.theory}</Markdown> : <p className="text-sm text-muted-foreground">{data.description}</p>}
          </CardContent>
        </Card>
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ListChecks className="size-4 text-primary" />
                {t('learning.exercises')}
              </CardTitle>
              <span className="text-xs text-muted-foreground">{t('learning.exercisesCount', { n: data.exercises.length })}</span>
            </CardHeader>
            <CardContent className="space-y-0.5 px-2">
              {data.exercises.length === 0 && <EmptyState title={t('common.empty')} className="mx-3" />}
              {data.exercises.map((exercise) => (
                <ExerciseRow key={exercise.id} exercise={exercise} compact />
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="size-4 text-primary" />
                {t('learning.moduleTest')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">{t('learning.moduleTestHint', { n: MODULE_TEST_SIZE })}</p>
              {data.testBestScore !== null && <p className="text-xs">{t('learning.bestScore', { score: data.testBestScore })}</p>}
              <Button
                className="w-full"
                variant={data.testPassed ? 'secondary' : 'default'}
                disabled={data.exercises.length === 0}
                loading={startTest.isPending}
                onClick={() => startTest.mutate({ kind: 'module_test', scopeId: data.id })}
              >
                {t('common.start')}
              </Button>
            </CardContent>
          </Card>
          <div className="flex justify-between gap-2">
            {data.prevModuleId ? (
              <Button variant="ghost" size="sm" asChild>
                <Link to={`/learn/${data.prevModuleId}`}>
                  <ArrowLeft />
                  {t('learning.prevModule')}
                </Link>
              </Button>
            ) : (
              <span />
            )}
            {data.nextModuleId && (
              <Button variant="ghost" size="sm" asChild>
                <Link to={`/learn/${data.nextModuleId}`}>
                  {t('learning.nextModule')}
                  <ArrowRight />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </Page>
  )
}
