import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router'
import { loginSchema } from '@shared/schemas/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useT } from '@/i18n'
import { errorMessage } from '@/lib/errors'
import { useApi, useApiMutation } from '@/lib/query'
import { useAuthStore } from '@/stores/auth'
import { AuthLayout, FieldError } from './auth-layout'
import { useForm } from './use-form'

export function LoginPage() {
  const t = useT()
  const setUser = useAuthStore((s) => s.setUser)
  const queryClient = useQueryClient()
  const accounts = useApi('auth:accounts')
  const form = useForm(loginSchema, { identifier: '', password: '', remember: true })
  const [formError, setFormError] = useState<string | null>(null)
  const login = useApiMutation('auth:login', { toastErrors: false })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!form.validate()) return
    login.mutate(form.values, {
      onSuccess: (result) => {
        queryClient.clear()
        setUser(result.user)
      },
      onError: (error) => {
        form.applyServerError(error)
        setFormError(errorMessage(error))
      }
    })
  }

  return (
    <AuthLayout title={t('auth.loginTitle')} subtitle={t('auth.loginSubtitle')}>
      {accounts.data && accounts.data.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{t('auth.localAccounts')}</p>
          <div className="flex flex-wrap gap-2">
            {accounts.data.map((account) => (
              <button
                key={account.id}
                type="button"
                onClick={() => {
                  form.set('identifier', account.username)
                  document.getElementById('password')?.focus()
                }}
                className="flex items-center gap-2 rounded-full border bg-card py-1 pr-3 pl-1 text-xs transition-colors hover:border-primary/50 hover:bg-accent"
              >
                <span className="flex size-6 items-center justify-center rounded-full text-[11px] font-semibold text-white" style={{ background: account.avatarColor }}>
                  {account.username.slice(0, 1).toUpperCase()}
                </span>
                {account.username}
                <span className="text-muted-foreground">· {account.level}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="identifier">{t('auth.identifier')}</Label>
          <Input
            id="identifier"
            autoFocus
            autoComplete="username"
            value={form.values.identifier}
            onChange={(e) => form.set('identifier', e.target.value)}
            aria-invalid={!!form.errors.identifier}
          />
          <FieldError message={form.errors.identifier} />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t('auth.password')}</Label>
            <Link to="/recover" className="text-xs text-muted-foreground hover:text-primary">
              {t('auth.forgot')}
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={form.values.password}
            onChange={(e) => form.set('password', e.target.value)}
            aria-invalid={!!form.errors.password}
          />
          <FieldError message={form.errors.password} />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground select-none">
          <input
            type="checkbox"
            className="size-3.5 accent-[oklch(0.64_0.2_286)]"
            checked={form.values.remember}
            onChange={(e) => form.set('remember', e.target.checked)}
          />
          {t('auth.remember')}
        </label>
        {formError && <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{formError}</p>}
        <Button type="submit" className="w-full" loading={login.isPending}>
          {t('auth.signIn')}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        {t('auth.noAccount')}{' '}
        <Link to="/register" className="font-medium text-primary hover:underline">
          {t('auth.signUp')}
        </Link>
      </p>
    </AuthLayout>
  )
}
