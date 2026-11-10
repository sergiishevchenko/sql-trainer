import { CheckCircle2, Circle, CircleDashed, RotateCcw } from 'lucide-react'
import type { Difficulty, ExerciseType, ProgressStatus } from '@shared/constants/domain'
import { Badge } from '@/components/ui/badge'
import { useT } from '@/i18n'
import { cn } from '@/lib/utils'

const DIFFICULTY_STYLE: Record<Difficulty, 'success' | 'info' | 'warning' | 'destructive'> = {
  easy: 'success',
  medium: 'info',
  hard: 'warning',
  expert: 'destructive'
}

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const t = useT()
  return <Badge variant={DIFFICULTY_STYLE[difficulty]}>{t(`exercises.difficulties.${difficulty}`)}</Badge>
}

export function TypeBadge({ type }: { type: ExerciseType }) {
  const t = useT()
  return <Badge variant="secondary">{t(`exercises.types.${type}`)}</Badge>
}

export function StatusIcon({ status, className }: { status: ProgressStatus; className?: string }) {
  const t = useT()
  const label = t(`exercises.statuses.${status}`)
  const base = cn('size-4 shrink-0', className)
  switch (status) {
    case 'solved':
      return <CheckCircle2 aria-label={label} className={cn(base, 'text-success')} />
    case 'in_progress':
      return <CircleDashed aria-label={label} className={cn(base, 'text-info')} />
    case 'needs_review':
      return <RotateCcw aria-label={label} className={cn(base, 'text-warning')} />
    default:
      return <Circle aria-label={label} className={cn(base, 'text-muted-foreground/40')} />
  }
}

export function StatusBadge({ status }: { status: ProgressStatus }) {
  const t = useT()
  const variant = status === 'solved' ? 'success' : status === 'needs_review' ? 'warning' : status === 'in_progress' ? 'info' : 'outline'
  return (
    <Badge variant={variant}>
      <StatusIcon status={status} className="size-3 text-current" />
      {t(`exercises.statuses.${status}`)}
    </Badge>
  )
}
