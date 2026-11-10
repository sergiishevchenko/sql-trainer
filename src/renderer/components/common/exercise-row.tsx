import { Clock, Star } from 'lucide-react'
import { Link } from 'react-router'
import type { ExerciseSummary } from '@shared/types/exercise'
import { DifficultyBadge, StatusIcon, TypeBadge } from './exercise-badges'
import { cn } from '@/lib/utils'

export function ExerciseRow({ exercise, compact, className, to }: { exercise: ExerciseSummary; compact?: boolean; className?: string; to?: string }) {
  return (
    <Link
      to={to ?? `/exercises/${exercise.id}`}
      className={cn('group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-accent/50', className)}
      data-testid={`exercise-row-${exercise.id}`}
    >
      <StatusIcon status={exercise.status} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium group-hover:text-foreground">{exercise.title}</span>
          {exercise.isFavorite && <Star className="size-3 shrink-0 fill-amber-400 text-amber-400" />}
        </div>
        {!compact && <p className="truncate text-xs text-muted-foreground">{exercise.snippet}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {!compact && <TypeBadge type={exercise.type} />}
        <DifficultyBadge difficulty={exercise.difficulty} />
        <span className="flex w-14 items-center justify-end gap-1 text-[11px] text-muted-foreground tabular-nums">
          <Clock className="size-3" />
          {exercise.minutes}′
        </span>
        <span className="w-12 text-right text-xs font-medium text-primary tabular-nums">+{exercise.xp}</span>
      </div>
    </Link>
  )
}
