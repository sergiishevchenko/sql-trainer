import { Copy, KeyRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useT } from '@/i18n'
import { useAuthStore } from '@/stores/auth'

export function RecoveryCodeDialog() {
  const t = useT()
  const { pendingRecoveryCode, setRecoveryCode } = useAuthStore()
  const [acknowledged, setAcknowledged] = useState(false)
  const [visibleCode, setVisibleCode] = useState<string | null>(null)

  useEffect(() => {
    if (pendingRecoveryCode) setVisibleCode(pendingRecoveryCode)
  }, [pendingRecoveryCode])

  const close = () => {
    setRecoveryCode(null)
    setAcknowledged(false)
  }

  return (
    <Dialog open={!!pendingRecoveryCode} onOpenChange={(open) => !open && acknowledged && close()}>
      <DialogContent hideClose onEscapeKeyDown={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <KeyRound className="size-5" />
          </div>
          <DialogTitle>{t('auth.recoveryDialogTitle')}</DialogTitle>
          <DialogDescription>{t('auth.recoveryDialogText')}</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 rounded-lg border bg-sidebar p-3">
          <code className="flex-1 text-center font-mono text-lg tracking-widest text-primary" data-testid="recovery-code">
            {visibleCode}
          </code>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => {
              void navigator.clipboard.writeText(visibleCode ?? '')
              toast.success(t('common.copied'))
            }}
            aria-label={t('common.copy')}
          >
            <Copy />
          </Button>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm select-none">
          <input type="checkbox" className="size-4 accent-[oklch(0.64_0.2_286)]" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} />
          {t('auth.recoveryConfirm')}
        </label>
        <DialogFooter>
          <Button disabled={!acknowledged} onClick={close}>
            {t('common.continue')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
