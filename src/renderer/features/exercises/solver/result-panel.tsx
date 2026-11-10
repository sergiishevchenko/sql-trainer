import { motion } from 'framer-motion'
import { AlertCircle, ArrowRight, CheckCircle2, CircleCheck, CircleX, Eye, EyeOff, Play, Timer, XCircle } from 'lucide-react'
import type { ComparisonIssue, EngineError, ResultSet } from '@shared/types/engine'
import type { RevealedSolution, RunResult, SubmitResult } from '@shared/types/exercise'
import { Markdown } from '@/components/common/markdown'
import { ResultTable } from '@/components/common/result-table'
import { SqlCode } from '@/components/common/sql-code'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useT } from '@/i18n'
import { formatMs } from '@/lib/format'
import { cn } from '@/lib/utils'

export type ResultTab = 'result' | 'expected' | 'check'

function useIssueText() {
  const t = useT()
  return (issue: ComparisonIssue): string => {
    switch (issue.code) {
      case 'column_count':
      case 'row_count':
        return t(`solver.issues.${issue.code}`, { expected: issue.expected, actual: issue.actual })
      case 'column_names':
        return t('solver.issues.column_names', { expected: issue.expected.join(', ') })
      case 'values':
        return t('solver.issues.values', { row: issue.row + 1 })
      default:
        return t(`solver.issues.${issue.code}`)
    }
  }
}

function EngineErrorBox({ error }: { error: EngineError }) {
  return (
    <div className="m-3 flex gap-2.5 rounded-lg border border-destructive/30 bg-destructive/8 p-3" data-testid="engine-error">
      {error.code === 'timeout' ? <Timer className="mt-0.5 size-4 shrink-0 text-destructive" /> : <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />}
      <div className="min-w-0 space-y-0.5">
        <p className="text-xs font-medium text-destructive uppercase">{error.code}</p>
        <p className="font-mono text-xs break-words whitespace-pre-wrap text-foreground/90">{error.message}</p>
      </div>
    </div>
  )
}

function Placeholder({ icon: Icon, text }: { icon: typeof Play; text: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
      <Icon className="size-5 opacity-50" />
      <p className="text-xs">{text}</p>
    </div>
  )
}

export function ResultPanel({
  tab,
  onTabChange,
  run,
  submit,
  revealed,
  runnable,
  testMode,
  nextId,
  onNext,
  onReveal,
  revealPending
}: {
  tab: ResultTab
  onTabChange: (tab: ResultTab) => void
  run: RunResult | null
  submit: SubmitResult | null
  revealed: RevealedSolution | null
  runnable: boolean
  testMode: boolean
  nextId: string | null
  onNext: () => void
  onReveal: () => void
  revealPending: boolean
}) {
  const t = useT()
  const issueText = useIssueText()
  const userResult: ResultSet | null | undefined = run ? run.result : submit?.grade.userResult
  const userError = run?.error
  const expected = run?.expectedResult ?? submit?.grade.expectedResult ?? null
  const grade = submit?.grade

  return (
    <Tabs value={tab} onValueChange={(v) => onTabChange(v as ResultTab)} className="flex h-full flex-col bg-surface">
      <div className="flex shrink-0 items-center justify-between border-b px-3 py-1.5">
        <TabsList className="h-8">
          {runnable && <TabsTrigger value="result">{t('solver.result')}</TabsTrigger>}
          {runnable && !testMode && <TabsTrigger value="expected">{t('solver.expected')}</TabsTrigger>}
          <TabsTrigger value="check" data-testid="check-tab">
            {t('solver.check')}
            {grade && (grade.correct ? <CircleCheck className="text-success" /> : <CircleX className="text-destructive" />)}
          </TabsTrigger>
        </TabsList>
        {run && !run.error && (
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {formatMs(run.durationMs)}
            {run.rowsAffected > 0 && ` · ${t('solver.rowsAffected', { n: run.rowsAffected })}`}
          </span>
        )}
      </div>

      <TabsContent value="result" className="min-h-0 flex-1">
        {userError ? (
          <EngineErrorBox error={userError} />
        ) : userResult ? (
          <ResultTable result={userResult} className="h-full" />
        ) : run ? (
          <Placeholder icon={CheckCircle2} text={run.rowsAffected > 0 ? t('solver.rowsAffected', { n: run.rowsAffected }) : t('solver.noRows')} />
        ) : (
          <Placeholder icon={Play} text={t('solver.runHint')} />
        )}
      </TabsContent>

      <TabsContent value="expected" className="min-h-0 flex-1">
        {expected ? <ResultTable result={expected} className="h-full" /> : <Placeholder icon={EyeOff} text={t('solver.runHint')} />}
      </TabsContent>

      <TabsContent value="check" className="min-h-0 flex-1 overflow-y-auto">
        {!grade && !revealed && <Placeholder icon={CheckCircle2} text={t('solver.shortcuts', { mod: navigator.platform.includes('Mac') ? '⌘' : 'Ctrl' })} />}
        {grade && (
          <motion.div key={submit?.progress.attempts} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 p-4">
            <div
              className={cn(
                'flex items-center gap-3 rounded-lg border p-3',
                grade.correct ? 'border-success/30 bg-success/8' : 'border-destructive/30 bg-destructive/8'
              )}
              data-testid={grade.correct ? 'grade-correct' : 'grade-incorrect'}
            >
              {grade.correct ? <CheckCircle2 className="size-5 text-success" /> : <XCircle className="size-5 text-destructive" />}
              <div className="flex-1">
                <p className="text-sm font-semibold">{grade.correct ? t('solver.correct') : t('solver.incorrect')}</p>
                {!grade.correct && grade.issue && <p className="text-xs text-foreground/80">{issueText(grade.issue)}</p>}
              </div>
              {submit && submit.xpAwarded > 0 && (
                <motion.span initial={{ scale: 0.6 }} animate={{ scale: 1 }} className="rounded-md bg-primary/15 px-2 py-1 text-sm font-semibold text-primary">
                  {t('solver.xpEarned', { n: submit.xpAwarded })}
                </motion.span>
              )}
            </div>
            {grade.error && <EngineErrorBox error={grade.error} />}
            {grade.scenarios.length > 1 && (
              <ul className="grid gap-1 sm:grid-cols-2">
                {grade.scenarios.map((s) => (
                  <li key={s.name} className="flex items-center gap-2 rounded-md border bg-card px-2.5 py-1.5 text-xs">
                    {s.passed ? <CircleCheck className="size-3.5 text-success" /> : <CircleX className="size-3.5 text-destructive" />}
                    <span className="flex-1">{s.name}</span>
                    <span className="text-muted-foreground">{s.passed ? t('solver.scenarioPassed') : t('solver.scenarioFailed')}</span>
                  </li>
                ))}
              </ul>
            )}
            {grade.correct && submit?.explanation && (
              <div className="rounded-lg border bg-card p-3">
                <p className="mb-1 text-[11px] font-medium text-muted-foreground uppercase">{t('solver.explanation')}</p>
                <Markdown className="text-[13px]">{submit.explanation}</Markdown>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {grade.correct && nextId && !testMode && (
                <Button size="sm" onClick={onNext} data-testid="next-exercise">
                  {t('solver.nextExercise')}
                  <ArrowRight />
                </Button>
              )}
              {!grade.correct && !testMode && !revealed && (
                <Button size="sm" variant="outline" onClick={onReveal} loading={revealPending}>
                  <Eye />
                  {t('solver.revealSolution')}
                </Button>
              )}
            </div>
          </motion.div>
        )}
        {revealed && (
          <div className="space-y-3 p-4 pt-0 first:pt-4">
            <p className="text-[11px] font-medium text-muted-foreground uppercase">{t('solver.solution')}</p>
            <SqlCode code={revealed.solution} />
            <Markdown className="text-[13px]">{revealed.explanation}</Markdown>
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}
