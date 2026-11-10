import { ChevronLeft, ChevronRight, Clock, Play, RotateCcw, RotateCw, Send, Star, WandSparkles } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import type { ExerciseAnswer, PublicExercise, RevealedSolution, RunResult, SubmitResult } from '@shared/types/exercise'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { DifficultyBadge, StatusBadge, TypeBadge } from '@/components/common/exercise-badges'
import type { SqlEditorHandle } from '@/components/common/sql-editor'
import { Button } from '@/components/ui/button'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { Tooltip } from '@/components/ui/tooltip'
import { useT } from '@/i18n'
import { setCompletionSchema } from '@/lib/monaco'
import { invalidateProgress, queryClient, useApi, useApiMutation } from '@/lib/query'
import { announceRewards } from '@/lib/rewards'
import { cn, modKey } from '@/lib/utils'
import { LeftPanel } from './left-panel'
import { WORKSPACES } from './registry'
import { ResultPanel, type ResultTab } from './result-panel'
import { RUNNABLE_TYPES, SQL_TYPES, type WorkspaceProps } from './types'
import { resetQueryWorkspaceDraft } from './workspaces/query-editor'

export interface ExerciseSolverProps {
  exercise: PublicExercise
  assessmentId?: number
  testMode?: boolean
  locked?: boolean
  header?: ReactNode
  onSubmitted?: (result: SubmitResult) => void
}

function updateCachedExercise(exerciseId: string, patch: (old: PublicExercise) => PublicExercise) {
  queryClient.setQueryData<PublicExercise>(['exercises:get', { exerciseId }], (old) => (old ? patch(old) : old))
}

/**
 * Full exercise workspace: statement, type-specific answer UI, execution, grading and feedback.
 */
export function ExerciseSolver({ exercise, assessmentId, testMode = false, locked = false, header, onSubmitted }: ExerciseSolverProps) {
  const t = useT()
  const navigate = useNavigate()
  const schema = useApi('datasets:schema', { dataset: exercise.dataset }, { staleTime: Infinity })
  const editorRef = useRef<SqlEditorHandle | null>(null)
  const answerRef = useRef<ExerciseAnswer | null>(null)
  const startedAt = useRef(Date.now())
  const [hasAnswer, setHasAnswer] = useState(false)
  const [run, setRun] = useState<RunResult | null>(null)
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null)
  const [revealed, setRevealed] = useState<RevealedSolution | null>(null)
  const runnable = RUNNABLE_TYPES.includes(exercise.type)
  const isSql = SQL_TYPES.includes(exercise.type)
  const [tab, setTab] = useState<ResultTab>(runnable ? 'result' : 'check')
  const [resetKey, setResetKey] = useState(0)
  const [forcedSql, setForcedSql] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmReveal, setConfirmReveal] = useState(false)

  useEffect(() => {
    if (!schema.data) return
    setCompletionSchema(schema.data.tables.map((table) => ({ name: table.name, columns: table.columns.map((c) => c.name) })))
  }, [schema.data])

  const onAnswer = useCallback((answer: ExerciseAnswer | null) => {
    answerRef.current = answer
    setHasAnswer(answer !== null)
  }, [])

  const runMutation = useApiMutation('exercises:run', {
    onSuccess: (result) => {
      setRun(result)
      setTab('result')
    }
  })

  const submitMutation = useApiMutation('exercises:submit', {
    onSuccess: (result) => {
      setSubmitResult(result)
      setRun(null)
      setTab('check')
      announceRewards(result)
      updateCachedExercise(exercise.id, (old) => ({ ...old, progress: result.progress, status: result.progress.status }))
      void invalidateProgress()
      onSubmitted?.(result)
    }
  })

  const revealMutation = useApiMutation('exercises:reveal', {
    onSuccess: (solution) => {
      setRevealed(solution)
      setTab('check')
      updateCachedExercise(exercise.id, (old) => ({ ...old, progress: { ...old.progress, solutionRevealed: true } }))
    }
  })

  const favorite = useApiMutation('exercises:toggleFavorite', {
    onSuccess: ({ isFavorite }) => {
      updateCachedExercise(exercise.id, (old) => ({ ...old, isFavorite }))
      void queryClient.invalidateQueries({ queryKey: ['exercises:list'] })
    }
  })

  const review = useApiMutation('exercises:markReview', {
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['exercises:get', { exerciseId: exercise.id }] })
      void invalidateProgress()
    }
  })

  const disabled = locked || submitMutation.isPending

  const doRun = useCallback(() => {
    if (!runnable || runMutation.isPending) return
    const answer = answerRef.current
    if (!answer) {
      toast.info(t('solver.answerRequired'))
      return
    }
    runMutation.mutate({ exerciseId: exercise.id, answer })
  }, [runnable, runMutation, exercise.id, t])

  const doSubmit = useCallback(() => {
    if (disabled) return
    const answer = answerRef.current
    if (!answer) {
      toast.info(t('solver.answerRequired'))
      return
    }
    submitMutation.mutate({ exerciseId: exercise.id, answer, durationMs: Math.min(Date.now() - startedAt.current, 24 * 3600 * 1000 - 1), assessmentId })
  }, [disabled, submitMutation, exercise.id, assessmentId, t])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || !(e.metaKey || e.ctrlKey)) return
      if ((e.target as HTMLElement | null)?.closest('.monaco-editor')) return
      e.preventDefault()
      if (e.shiftKey) doSubmit()
      else doRun()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [doRun, doSubmit])

  const resetCode = async () => {
    if (exercise.content.type !== 'write_query' && exercise.content.type !== 'fix_bug' && exercise.content.type !== 'business_case' && exercise.content.type !== 'challenge') return
    const starter = exercise.content.starter
    await resetQueryWorkspaceDraft(exercise.id, starter).catch(() => null)
    setForcedSql(starter)
    setResetKey((k) => k + 1)
    setRun(null)
  }

  const Workspace = WORKSPACES[exercise.type] as ComponentType<WorkspaceProps>

  return (
    <div className="flex h-full flex-col">
      {header ?? (
        <div className="flex shrink-0 items-center gap-3 border-b px-4 py-2.5">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link to={`/learn/${exercise.moduleId}`} aria-label={t('common.back')}>
              <ChevronLeft />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] text-muted-foreground">
              {exercise.levelTitle} › {exercise.moduleTitle}
            </p>
            <h1 className="truncate text-sm font-semibold" data-testid="exercise-title">
              {exercise.title}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <TypeBadge type={exercise.type} />
            <DifficultyBadge difficulty={exercise.difficulty} />
            <StatusBadge status={exercise.status} />
            <span className="flex items-center gap-1 px-1 text-[11px] text-muted-foreground">
              <Clock className="size-3" />
              {exercise.minutes} {t('common.minutes')}
            </span>
            <span className="px-1 text-xs font-semibold text-primary">+{exercise.xp} XP</span>
            <Tooltip content={exercise.isFavorite ? t('exercises.unfavorite') : t('exercises.favorite')}>
              <Button variant="ghost" size="icon-sm" onClick={() => favorite.mutate({ exerciseId: exercise.id })} data-testid="favorite-toggle">
                <Star className={cn(exercise.isFavorite && 'fill-amber-400 text-amber-400')} />
              </Button>
            </Tooltip>
            <Tooltip content={exercise.status === 'needs_review' ? t('solver.unmarkReview') : t('solver.markReview')}>
              <Button variant="ghost" size="icon-sm" onClick={() => review.mutate({ exerciseId: exercise.id, review: exercise.status !== 'needs_review' })}>
                <RotateCw className={cn(exercise.status === 'needs_review' && 'text-warning')} />
              </Button>
            </Tooltip>
            <div className="mx-1 h-5 w-px bg-border" />
            <Tooltip content={t('solver.prevExercise')}>
              <Button variant="ghost" size="icon-sm" disabled={!exercise.prevId} onClick={() => exercise.prevId && navigate(`/exercises/${exercise.prevId}`)}>
                <ChevronLeft />
              </Button>
            </Tooltip>
            <Tooltip content={t('solver.nextExercise')}>
              <Button variant="ghost" size="icon-sm" disabled={!exercise.nextId} onClick={() => exercise.nextId && navigate(`/exercises/${exercise.nextId}`)}>
                <ChevronRight />
              </Button>
            </Tooltip>
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1">
        <ResizablePanelGroup direction="horizontal" autoSaveId="solver-horizontal">
          <ResizablePanel defaultSize={38} minSize={22}>
            <LeftPanel key={exercise.id} exercise={exercise} schema={schema.data} testMode={testMode} />
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={62} minSize={35}>
            <ResizablePanelGroup direction="vertical" autoSaveId="solver-vertical">
              <ResizablePanel defaultSize={58} minSize={20}>
                <div className="flex h-full flex-col">
                  <div className="flex shrink-0 items-center gap-1 border-b px-2 py-1.5">
                    {isSql && (
                      <>
                        <Tooltip content={`${t('solver.format')} (Shift+Alt+F)`}>
                          <Button variant="ghost" size="xs" onClick={() => editorRef.current?.format()} disabled={disabled}>
                            <WandSparkles />
                            {t('solver.format')}
                          </Button>
                        </Tooltip>
                        <Button variant="ghost" size="xs" onClick={() => setConfirmReset(true)} disabled={disabled}>
                          <RotateCcw />
                          {t('solver.resetCode')}
                        </Button>
                      </>
                    )}
                    <div className="flex-1" />
                    {runnable && (
                      <Tooltip content={`${modKey}+Enter`}>
                        <Button variant="secondary" size="sm" onClick={doRun} loading={runMutation.isPending} disabled={!hasAnswer} data-testid="run-button">
                          {!runMutation.isPending && <Play />}
                          {t('solver.run')}
                        </Button>
                      </Tooltip>
                    )}
                    <Tooltip content={`${modKey}+Shift+Enter`}>
                      <Button size="sm" onClick={doSubmit} loading={submitMutation.isPending} disabled={!hasAnswer || locked} data-testid="submit-button">
                        {!submitMutation.isPending && <Send />}
                        {t('solver.submit')}
                      </Button>
                    </Tooltip>
                  </div>
                  <div className="min-h-0 flex-1">
                    <Workspace
                      key={`${exercise.id}:${resetKey}`}
                      exercise={exercise}
                      content={exercise.content}
                      onAnswer={onAnswer}
                      onRun={doRun}
                      onSubmit={doSubmit}
                      disabled={disabled}
                      editorRef={editorRef}
                      schema={schema.data}
                      initialSql={forcedSql}
                    />
                  </div>
                </div>
              </ResizablePanel>
              <ResizableHandle />
              <ResizablePanel defaultSize={42} minSize={15}>
                <ResultPanel
                  tab={tab}
                  onTabChange={setTab}
                  run={run}
                  submit={submitResult}
                  revealed={revealed}
                  runnable={runnable}
                  testMode={testMode}
                  nextId={exercise.nextId}
                  onNext={() => exercise.nextId && navigate(`/exercises/${exercise.nextId}`)}
                  onReveal={() => setConfirmReveal(true)}
                  revealPending={revealMutation.isPending}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title={t('solver.resetCode')}
        description={t('solver.resetConfirm')}
        onConfirm={() => void resetCode()}
      />
      <ConfirmDialog
        open={confirmReveal}
        onOpenChange={setConfirmReveal}
        title={t('solver.revealConfirmTitle')}
        description={exercise.progress.firstSolvedAt ? undefined : t('solver.revealConfirmText')}
        onConfirm={() => revealMutation.mutate({ exerciseId: exercise.id })}
      />
    </div>
  )
}
