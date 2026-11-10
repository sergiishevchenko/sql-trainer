import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { rankForLevel } from '@shared/constants/levels'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useT } from '@/i18n'
import { useCelebrationStore } from '@/stores/celebration'

export function LevelUpDialog() {
  const t = useT()
  const { levelUp, dismiss } = useCelebrationStore()
  return (
    <Dialog open={!!levelUp} onOpenChange={(open) => !open && dismiss()}>
      <DialogContent className="max-w-sm overflow-hidden text-center" hideClose>
        <div className="glow pointer-events-none absolute inset-0" />
        <motion.div
          initial={{ scale: 0.4, rotate: -20, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 16 }}
          className="relative mx-auto flex size-20 items-center justify-center rounded-2xl bg-primary text-3xl font-bold text-primary-foreground shadow-[0_0_48px_-6px_oklch(0.64_0.2_286/80%)]"
        >
          {levelUp?.to}
        </motion.div>
        <div className="relative space-y-1">
          <DialogTitle className="flex items-center justify-center gap-2 text-lg">
            <Sparkles className="size-4 text-primary" />
            {t('levelUp.title')}
          </DialogTitle>
          <DialogDescription>
            {t('levelUp.text', { level: levelUp?.to ?? '' })} · {levelUp ? t(`ranks.${rankForLevel(levelUp.to)}`) : ''}
          </DialogDescription>
        </div>
        <Button className="relative" onClick={dismiss}>
          {t('common.continue')}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
