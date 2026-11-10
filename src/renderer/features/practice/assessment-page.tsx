import { motion } from 'framer-motion'
import { ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, Flag, Timer, Trophy, XCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import type { AssessmentKind } from '@shared/constants/domain'
import type { AssessmentDto } from '@shared/types/learning'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { Page } from '@/components/common/page'
import { ErrorState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ExerciseSolver } from '@/features/exercises/solver/exercise-solver'
import { useT } from '@/i18n'
import { formatClock } from '@/lib/format'
import { invalidateProgress, queryClient, useApi, useApiMutation } from '@/lib/query'
import { cn } from '@/lib/utils'
import { useStartAssessment } from './use-start-assessment'

const TEST_KINDS: AssessmentKind[] = ['module_test', 'level_exam', 'speed']

function useCountdown(assessment: AssessmentDto | undefined): number | null {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!assessment?.timeLimitSec || assessment.finishedAt) return
    const timer = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(timer)
  }, [assessment?.timeLimitSec, assessment?.finishedAt])
  if (!assessment?.timeLimitSec) return null
  return Math.max(0, (assessment.startedAt + assessment.timeLimitSec * 1000 - now) / 1000)
}

export function AssessmentPage() {
  const { assessmentId = '' } = useParams()
  const id = Number(assessmentId)
  const assessment = useApi('assessments:get', { assessmentId: id }, { enabled: Number.isInteger(id) && id > 0 })

  if (assessment.isPending) {
    return (
      <Page>
        <Skeleton className="h-[480px] rounded-xl" />
      </Page>
    )
  }
  if (assessment.isError) {
    return (
      <Page>
        <ErrorState error={assessment.error} onRetry={() => assessment.refetch()} />
      </Page>
    )
  }
  if (assessment.data.finishedAt) return <AssessmentResults assessment={assessment.data} />
  return <AssessmentRunner assessment={assessment.data} />
}

function AssessmentRunner({ assessment }: { assessment: AssessmentDto }) {
  const t = useT()
  const testMode = TEST_KINDS.includes(assessment.kind)
  const locked = testMode
  const firstOpen = Math.max(0, assessment.exerciseIds.findIndex((eid) => !assessment.answers[eid]))
  const [index, setIndex] = useState(firstOpen)
  const [confirmFinish, setConfirmFinish] = useState(false)
  const exerciseId = assessment.exerciseIds[index]
  const exercise = useApi('exercises:get', { exerciseId }, { staleTime: 0 })
  const remaining = useCountdown(assessment)
  const queryKey = ['assessments:get', { assessmentId: assessment.id }]

  const finish = useApiMutation('assessments:finish', {
    onSuccess: (result) => {
      queryClient.setQueryData(queryKey, result)
      void invalidateProgress()
    }
  })

  useEffect(() => {
    if (remaining === 0 && !finish.isPending && !finish.isSuccess) {
      toast.warning(t('assessment.timeUp'))
      finish.mutate({ assessmentId: assessment.id })
    }
  }, [remaining, finish, assessment.id, t])

  const answeredCount = Object.keys(assessment.answers).length
  const answer = assessment.answers[exerciseId]

  const header = (
    <div className="flex shrink-0 items-center gap-3 border-b px-4 py-2.5">
      <Button variant="ghost" size="icon-sm" asChild>
        <Link to="/practice" aria-label={t('common.back')}>
          <ArrowLeft />
        </Link>
      </Button>
      <div className="min-w-0">
        <p className="truncate text-[11px] text-muted-foreground">{assessment.title}</p>
        <h1 className="truncate text-sm font-semibold">
          {t('assessment.question', { n: index + 1, total: assessment.total })}
          {exercise.data && <span className="font-normal text-muted-foreground"> · {exercise.data.title}</span>}
        </h1>
      </div>
      <div className="mx-auto flex items-center gap-1">
        {assessment.exerciseIds.map((eid, i) => {
          const a = assessment.answers[eid]
          return (
            <button
              key={eid}
              onClick={() => setIndex(i)}
              className={cn(
                'size-6 rounded-md border text-[11px] font-medium tabular-nums transition-colors',
                i === index && 'border-primary ring-1 ring-primary/50',
                a?.correct && 'border-success/40 bg-success/15 text-success',
                a && !a.correct && 'border-destructive/40 bg-destructive/15 text-destructive',
                !a && 'bg-card text-muted-foreground hover:bg-accent'
              )}
            >
              {i + 1}
            </button>
          )
        })}
      </div>
      {remaining !== null && (
        <div className={cn('flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-sm tabular-nums', remaining < 60 && 'border-destructive/50 text-destructive')} data-testid="assessment-timer">
          <Timer className="size-3.5" />
          {formatClock(remaining)}
        </div>
      )}
      <Button variant="ghost" size="icon-sm" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
        <ChevronLeft />
      </Button>
      <Button variant="ghost" size="icon-sm" disabled={index >= assessment.total - 1} onClick={() => setIndex((i) => i + 1)}>
        <ChevronRight />
      </Button>
      <Button size="sm" variant={answeredCount === assessment.total ? 'default' : 'outline'} onClick={() => setConfirmFinish(true)} loading={finish.isPending} data-testid="finish-assessment">
        <Flag />
        {t('assessment.finish')}
      </Button>
    </div>
  )

  return (
    <div className="flex h-full flex-col">
      {exercise.data ? (
        <ExerciseSolver
          key={`${assessment.id}:${exerciseId}`}
          exercise={exercise.data}
          assessmentId={assessment.id}
          testMode={testMode}
          locked={locked && !!answer}
          header={header}
          onSubmitted={(result) => {
            void queryClient.invalidateQueries({ queryKey })
            if (locked) {
              const next = assessment.exerciseIds.findIndex((eid, i) => i > index && !assessment.answers[eid])
              if (next >= 0) window.setTimeout(() => setIndex(next), result.grade.correct ? 900 : 1600)
            }
          }}
        />
      ) : (
        <>
          {header}
          <div className="p-6">{exercise.isError ? <ErrorState error={exercise.error} /> : <Skeleton className="h-96 rounded-xl" />}</div>
        </>
      )}
      <ConfirmDialog
        open={confirmFinish}
        onOpenChange={setConfirmFinish}
        title={t('assessment.finishConfirmTitle')}
        description={answeredCount < assessment.total ? t('assessment.finishConfirmText') : undefined}
        onConfirm={() => finish.mutate({ assessmentId: assessment.id })}
      />
    </div>
  )
}

function AssessmentResults({ assessment }: { assessment: AssessmentDto }) {
  const t = useT()
  const navigate = useNavigate()
  const restart = useStartAssessment()
  const summaries = useApi('exercises:list', { limit: 600 }, { staleTime: 60_000 })
  const titles = useMemo(() => new Map((summaries.data?.items ?? []).map((e) => [e.id, e.title])), [summaries.data])
  const score = assessment.score ?? 0

  return (
    <Page>
      <Link to="/practice" className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3" />
        {t('assessment.backToPractice')}
      </Link>
      <Card className="relative overflow-hidden p-8 text-center">
        <div className="glow pointer-events-none absolute inset-0" />
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 18 }}
          className={cn(
            'relative mx-auto mb-4 flex size-20 items-center justify-center rounded-2xl',
            assessment.passed ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'
          )}
        >
          {assessment.passed ? <Trophy className="size-9" /> : <Flag className="size-9" />}
        </motion.div>
        <p className="relative text-sm text-muted-foreground">{assessment.title}</p>
        <h1 className="relative mt-1 text-2xl font-semibold" data-testid="assessment-result">
          {assessment.passed ? t('assessment.passed') : t('assessment.failed')}
        </h1>
        <p className="relative mt-3 text-4xl font-semibold tabular-nums">{score}%</p>
        <p className="relative mt-1 text-sm text-muted-foreground">{t('assessment.correctCount', { correct: assessment.correctCount, total: assessment.total })}</p>
        {assessment.xpAwarded > 0 && <p className="relative mt-2 text-sm font-semibold text-primary">{t('assessment.xpAwarded', { n: assessment.xpAwarded })}</p>}
        <div className="relative mt-6 flex justify-center gap-2">
          <Button variant="outline" onClick={() => navigate('/practice')}>
            {t('assessment.backToPractice')}
          </Button>
          {assessment.kind !== 'daily' && (
            <Button loading={restart.isPending} onClick={() => restart.mutate({ kind: assessment.kind, scopeId: assessment.scopeId ?? undefined })}>
              {t('assessment.tryAgain')}
            </Button>
          )}
        </div>
      </Card>
      <Card className="mt-4 divide-y divide-border/50 p-1.5">
        {assessment.exerciseIds.map((eid, i) => {
          const a = assessment.answers[eid]
          return (
            <Link key={eid} to={`/exercises/${eid}`} className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-accent/50">
              <span className="w-6 text-right text-xs text-muted-foreground tabular-nums">{i + 1}</span>
              {a?.correct ? <CheckCircle2 className="size-4 text-success" /> : <XCircle className="size-4 text-destructive" />}
              <span className="flex-1 truncate text-sm">{titles.get(eid) ?? eid}</span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          )
        })}
      </Card>
    </Page>
  )
}
