import { motion } from 'framer-motion'
import { Lock } from 'lucide-react'
import type { AchievementCategory } from '@shared/constants/achievements'
import type { AchievementDto } from '@shared/types/learning'
import { NamedIcon } from '@/components/common/icon'
import { Page, PageHeader } from '@/components/common/page'
import { ErrorState } from '@/components/common/states'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useT } from '@/i18n'
import { formatDate } from '@/lib/format'
import { useApi } from '@/lib/query'
import { cn } from '@/lib/utils'

const CATEGORY_ORDER: AchievementCategory[] = ['progress', 'mastery', 'habits', 'challenges', 'explorer']

function AchievementCard({ achievement, index }: { achievement: AchievementDto; index: number }) {
  const t = useT()
  const unlocked = achievement.unlockedAt !== null
  const progress = Math.min(1, achievement.current / Math.max(1, achievement.threshold))
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.02, 0.3) }}>
      <Card className={cn('relative h-full overflow-hidden p-4', unlocked ? 'border-primary/30' : 'opacity-80')} data-testid={`achievement-${achievement.id}`}>
        {unlocked && <div className="glow pointer-events-none absolute inset-0 opacity-60" />}
        <div className="relative flex items-start gap-3">
          <div
            className={cn(
              'flex size-11 shrink-0 items-center justify-center rounded-xl',
              unlocked ? 'bg-primary text-primary-foreground shadow-[0_0_24px_-6px_oklch(0.64_0.2_286/80%)]' : 'bg-muted text-muted-foreground'
            )}
          >
            {unlocked ? <NamedIcon name={achievement.icon} className="size-5" /> : <Lock className="size-4" />}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-semibold">{achievement.title}</p>
              <span className="shrink-0 text-[11px] font-medium text-primary">+{achievement.xpReward} XP</span>
            </div>
            <p className="text-xs text-muted-foreground">{achievement.description}</p>
            {unlocked ? (
              <p className="pt-1 text-[11px] text-success">{t('achievements.unlocked', { date: formatDate(achievement.unlockedAt!) })}</p>
            ) : (
              <div className="flex items-center gap-2 pt-1.5">
                <Progress value={progress * 100} className="h-1" />
                <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
                  {Math.min(achievement.current, achievement.threshold)}/{achievement.threshold}
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

export function AchievementsPage() {
  const t = useT()
  const achievements = useApi('achievements:list')
  const unlocked = achievements.data?.filter((a) => a.unlockedAt).length ?? 0
  return (
    <Page wide>
      <PageHeader
        title={t('achievements.title')}
        subtitle={achievements.data ? t('achievements.subtitle', { unlocked, total: achievements.data.length }) : ' '}
      />
      {achievements.isPending && (
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 9 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      )}
      {achievements.isError && <ErrorState error={achievements.error} onRetry={() => achievements.refetch()} />}
      {achievements.data && (
        <div className="space-y-6">
          {CATEGORY_ORDER.map((category) => {
            const items = achievements.data.filter((a) => a.category === category)
            if (items.length === 0) return null
            return (
              <section key={category}>
                <h2 className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">{t(`achievements.categories.${category}`)}</h2>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map((achievement, index) => (
                    <AchievementCard key={achievement.id} achievement={achievement} index={index} />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </Page>
  )
}
