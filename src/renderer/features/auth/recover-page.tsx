import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router'
import { recoverSchema } from '@shared/schemas/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useT } from '@/i18n'
import { errorMessage } from '@/lib/errors'
import { useApiMutation } from '@/lib/query'
import { useAuthStore } from '@/stores/auth'
import { AuthLayout, FieldError } from './auth-layout'
import { useForm } from './use-form'

export function RecoverPage() {
  const t = useT()
  const queryClient = useQueryClient()
  const { setUser, setRecoveryCode } = useAuthStore()
  const form = useForm(recoverSchema, { identifier: '', recoveryCode: '', newPassword: '' })
  const [formError, setFormError] = useState<string | null>(null)
  const recover = useApiMutation('auth:recover', { toastErrors: false })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!form.validate()) return
    recover.mutate(form.values, {
      onSuccess: (result) => {
        queryClient.clear()
        if (result.recoveryCode) setRecoveryCode(result.recoveryCode)
        setUser(result.user)
      },
      onError: (error) => {
        form.applyServerError(error)
        setFormError(errorMessage(error))
      }
    })
  }

  return (
    <AuthLayout title={t('auth.recoverTitle')} subtitle={t('auth.recoverSubtitle')}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="identifier">{t('auth.identifier')}</Label>
          <Input id="identifier" value={form.values.identifier} onChange={(e) => form.set('identifier', e.target.value)} />
          <FieldError message={form.errors.identifier} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="recoveryCode">{t('auth.recoveryCode')}</Label>
          <Input
            id="recoveryCode"
            className="font-mono tracking-wider uppercase"
            placeholder="XXXX-XXXX-XXXX-XXXX"
            value={form.values.recoveryCode}
            onChange={(e) => form.set('recoveryCode', e.target.value)}
          />
          <FieldError message={form.errors.recoveryCode} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="newPassword">{t('auth.newPassword')}</Label>
          <Input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            value={form.values.newPassword}
            onChange={(e) => form.set('newPassword', e.target.value)}
          />
          <FieldError message={form.errors.newPassword} />
        </div>
        {formError && <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{formError}</p>}
        <Button type="submit" className="w-full" loading={recover.isPending}>
          {t('auth.recover')}
        </Button>
      </form>
      <p className="text-center text-sm">
        <Link to="/login" className="text-muted-foreground hover:text-primary">
          {t('auth.backToLogin')}
        </Link>
      </p>
    </AuthLayout>
  )
}
