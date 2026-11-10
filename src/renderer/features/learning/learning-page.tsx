import { motion } from 'framer-motion'
import { Award, CheckCircle2, ChevronRight, GraduationCap, Lock } from 'lucide-react'
import { Link } from 'react-router'
import type { LevelDto } from '@shared/types/learning'
import { Page, PageHeader } from '@/components/common/page'
import { ErrorState } from '@/components/common/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useT } from '@/i18n'
import { formatPercent } from '@/lib/format'
import { useApi } from '@/lib/query'
import { cn } from '@/lib/utils'
import { useStartAssessment } from '@/features/practice/use-start-assessment'

const LEVEL_ACCENTS = ['from-emerald-500/20', 'from-sky-500/20', 'from-violet-500/20', 'from-amber-500/20', 'from-rose-500/20']

export function LearningPage() {
  const t = useT()
  const levels = useApi('learning:levels')
  return (
    <Page>
      <PageHeader title={t('learning.title')} subtitle={t('learning.subtitle')} />
      {levels.isPending && (
        <div className="space-y-4">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      )}
      {levels.isError && <ErrorState error={levels.error} onRetry={() => levels.refetch()} />}
      <div className="space-y-5">
        {levels.data?.map((level, index) => <LevelSection key={level.id} level={level} index={index} />)}
      </div>
    </Page>
  )
}

function LevelSection({ level, index }: { level: LevelDto; index: number }) {
  const t = useT()
  const startExam = useStartAssessment()
  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
      <Card className="overflow-hidden">
        <div className={cn('flex items-center gap-5 bg-gradient-to-r to-transparent p-5', LEVEL_ACCENTS[index % LEVEL_ACCENTS.length])}>
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border bg-background/60 text-lg font-semibold">
            {level.completed ? <CheckCircle2 className="size-6 text-success" /> : index + 1}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold tracking-tight">{level.title}</h2>
              {level.completed && <Badge variant="success">{t('learning.completed')}</Badge>}
              {level.examPassed && (
                <Badge variant="default">
                  <Award />
                  {t('learning.examPassed')}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{level.description}</p>
            <div className="flex items-center gap-3 pt-1">
              <Progress value={level.progress * 100} className="max-w-xs" />
              <span className="text-xs text-muted-foreground tabular-nums">
                {level.solved}/{level.total} · {formatPercent(level.progress)}
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={level.total === 0}
            loading={startExam.isPending && startExam.variables?.scopeId === level.id}
            onClick={() => startExam.mutate({ kind: 'level_exam', scopeId: level.id })}
          >
            <GraduationCap />
            {t('learning.startExam')}
          </Button>
        </div>
        <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {level.modules.map((module) => {
            const empty = module.total === 0
            return (
              <Link
                key={module.id}
                to={`/learn/${module.id}`}
                className="group flex flex-col gap-2 rounded-lg border bg-background/30 p-3 transition-colors hover:border-primary/40 hover:bg-accent/40"
                data-testid={`module-${module.id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium">{module.title}</span>
                  {module.progress >= 1 ? (
                    <CheckCircle2 className="size-4 shrink-0 text-success" />
                  ) : empty ? (
                    <Lock className="size-3.5 shrink-0 text-muted-foreground/50" />
                  ) : (
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  )}
                </div>
                <p className="line-clamp-2 text-xs text-muted-foreground">{module.description}</p>
                <div className="mt-auto flex items-center gap-2 pt-1">
                  <Progress value={module.progress * 100} className="h-1" indicatorClassName={module.progress >= 1 ? 'bg-success' : undefined} />
                  <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                    {module.solved}/{module.total}
                  </span>
                  {module.testPassed && <Award className="size-3.5 shrink-0 text-primary" />}
                </div>
              </Link>
            )
          })}
        </div>
      </Card>
    </motion.section>
  )
}
