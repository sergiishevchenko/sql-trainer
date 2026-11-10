import { useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { registerSchema } from '@shared/schemas/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useT } from '@/i18n'
import { useApiMutation } from '@/lib/query'
import { useAuthStore } from '@/stores/auth'
import { AuthLayout, FieldError } from './auth-layout'
import { useForm } from './use-form'

export function RegisterPage() {
  const t = useT()
  const queryClient = useQueryClient()
  const { setUser, setRecoveryCode } = useAuthStore()
  const form = useForm(registerSchema, { username: '', email: '', password: '', confirmPassword: '' })
  const register = useApiMutation('auth:register', { toastErrors: false })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.validate()) return
    register.mutate(form.values, {
      onSuccess: (result) => {
        queryClient.clear()
        if (result.recoveryCode) setRecoveryCode(result.recoveryCode)
        setUser(result.user)
        toast.success(t('auth.welcomeToast', { name: result.user.username }))
      },
      onError: (error) => form.applyServerError(error)
    })
  }

  const field = (key: 'username' | 'email' | 'password' | 'confirmPassword', label: string, type = 'text', autoComplete?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={key}>{label}</Label>
      <Input
        id={key}
        type={type}
        autoComplete={autoComplete}
        value={form.values[key]}
        onChange={(e) => form.set(key, e.target.value)}
        aria-invalid={!!form.errors[key]}
      />
      <FieldError message={form.errors[key]} />
    </div>
  )

  return (
    <AuthLayout title={t('auth.registerTitle')} subtitle={t('auth.registerSubtitle')}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {field('username', t('auth.username'), 'text', 'username')}
        {field('email', t('auth.email'), 'email', 'email')}
        {field('password', t('auth.password'), 'password', 'new-password')}
        {!form.errors.password && <p className="-mt-2 text-[11px] text-muted-foreground">{t('auth.passwordHint')}</p>}
        {field('confirmPassword', t('auth.confirmPassword'), 'password', 'new-password')}
        <Button type="submit" className="w-full" loading={register.isPending}>
          {t('auth.signUp')}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        {t('auth.haveAccount')}{' '}
        <Link to="/login" className="font-medium text-primary hover:underline">
          {t('auth.signIn')}
        </Link>
      </p>
    </AuthLayout>
  )
}
