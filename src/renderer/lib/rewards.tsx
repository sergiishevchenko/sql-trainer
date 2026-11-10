import { toast } from 'sonner'
import type { UnlockedAchievement } from '@shared/types/exercise'
import { NamedIcon } from '@/components/common/icon'
import { tMessage } from '@/i18n'
import { useCelebrationStore } from '@/stores/celebration'

export function announceAchievements(achievements: UnlockedAchievement[]): void {
  for (const achievement of achievements) {
    toast.custom(
      () => (
        <div className="flex w-[356px] items-center gap-3 rounded-xl border border-primary/30 bg-popover p-3 shadow-2xl">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <NamedIcon name={achievement.icon} className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-muted-foreground">{tMessage('achievements.newAchievement')}</p>
            <p className="truncate text-sm font-semibold">{achievement.title}</p>
            <p className="truncate text-xs text-muted-foreground">{achievement.description}</p>
          </div>
          {achievement.xpReward > 0 && <span className="text-xs font-semibold text-primary">+{achievement.xpReward} XP</span>}
        </div>
      ),
      { duration: 5000 }
    )
  }
}

export function announceRewards(result: {
  xpAwarded?: number
  levelUp?: { from: number; to: number } | null
  unlockedAchievements?: UnlockedAchievement[]
  dailyGoalReached?: boolean
}): void {
  if (result.unlockedAchievements?.length) announceAchievements(result.unlockedAchievements)
  if (result.dailyGoalReached) toast.success(tMessage('dashboard.goalReached'))
  if (result.levelUp) useCelebrationStore.getState().showLevelUp(result.levelUp)
}
