import { useQueryClient } from '@tanstack/react-query'
import { KeyRound, Settings2, ShieldAlert, ShieldCheck, Trash2, UserRound } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { changePasswordSchema, passwordConfirmSchema, updateProfileSchema } from '@shared/schemas/auth'
import { rankForLevel } from '@shared/constants/levels'
import type { UserSettingsDto } from '@shared/types/user'
import { Page, PageHeader } from '@/components/common/page'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { FieldError } from '@/features/auth/auth-layout'
import { useForm } from '@/features/auth/use-form'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useT } from '@/i18n'
import { formatDate, formatDuration, formatNumber } from '@/lib/format'
import { queryClient as globalClient, useApi, useApiMutation } from '@/lib/query'
import { useAuthStore } from '@/stores/auth'

function Section({ icon: Icon, title, description, children }: { icon: typeof UserRound; title: string; description?: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="size-4 text-primary" />
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function SettingRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm">{label}</span>
      {children}
    </div>
  )
}

function ProfileForm() {
  const t = useT()
  const user = useCurrentUser()
  const setUser = useAuthStore((s) => s.setUser)
  const form = useForm(updateProfileSchema, { username: user?.username ?? '', email: user?.email ?? '' })
  const update = useApiMutation('auth:updateProfile', {
    toastErrors: false,
    onSuccess: (profile) => {
      setUser(profile)
      globalClient.setQueryData(['auth:session'], profile)
      toast.success(t('common.saved'))
    },
    onError: (error) => form.applyServerError(error)
  })
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (form.validate()) update.mutate(form.values)
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="profile-username">{t('auth.username')}</Label>
          <Input id="profile-username" value={form.values.username} onChange={(e) => form.set('username', e.target.value)} />
          <FieldError message={form.errors.username} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="profile-email">{t('auth.email')}</Label>
          <Input id="profile-email" value={form.values.email} onChange={(e) => form.set('email', e.target.value)} />
          <FieldError message={form.errors.email} />
        </div>
      </div>
      <Button type="submit" size="sm" loading={update.isPending}>
        {t('common.save')}
      </Button>
    </form>
  )
}

function SettingsForm({ settings }: { settings: UserSettingsDto }) {
  const t = useT()
  const [goal, setGoal] = useState(String(settings.dailyGoal))
  const update = useApiMutation('settings:update', {
    onSuccess: (next) => globalClient.setQueryData(['settings:get'], next)
  })
  useEffect(() => setGoal(String(settings.dailyGoal)), [settings.dailyGoal])
  const save = (patch: Partial<UserSettingsDto>) => update.mutate(patch)

  return (
    <div className="divide-y divide-border/60">
      <SettingRow label={t('profile.dailyGoal')}>
        <Input
          type="number"
          min={10}
          max={1000}
          step={10}
          className="h-8 w-24 text-right"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          onBlur={() => {
            const value = Math.max(10, Math.min(1000, Math.round(Number(goal) || settings.dailyGoal)))
            setGoal(String(value))
            if (value !== settings.dailyGoal) save({ dailyGoal: value })
          }}
        />
      </SettingRow>
      <SettingRow label={t('profile.editorFontSize')}>
        <Select value={String(settings.editorFontSize)} onValueChange={(v) => save({ editorFontSize: Number(v) })}>
          <SelectTrigger className="h-8 w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[12, 13, 14, 15, 16, 18, 20].map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size} px
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingRow>
      <SettingRow label={t('profile.editorMinimap')}>
        <Switch checked={settings.editorMinimap} onCheckedChange={(v) => save({ editorMinimap: v })} />
      </SettingRow>
      <SettingRow label={t('profile.editorWordWrap')}>
        <Switch checked={settings.editorWordWrap} onCheckedChange={(v) => save({ editorWordWrap: v })} />
      </SettingRow>
      <SettingRow label={t('profile.autoSave')}>
        <Switch checked={settings.autoSaveDrafts} onCheckedChange={(v) => save({ autoSaveDrafts: v })} />
      </SettingRow>
      <SettingRow label={t('profile.reduceMotion')}>
        <Switch checked={settings.reduceMotion} onCheckedChange={(v) => save({ reduceMotion: v })} />
      </SettingRow>
    </div>
  )
}

function ChangePasswordForm() {
  const t = useT()
  const form = useForm(changePasswordSchema, { currentPassword: '', newPassword: '' })
  const change = useApiMutation('auth:changePassword', {
    toastErrors: false,
    onSuccess: () => {
      toast.success(t('profile.passwordChanged'))
      form.setValues({ currentPassword: '', newPassword: '' })
    },
    onError: (error) => form.applyServerError(error)
  })
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (form.validate()) change.mutate(form.values)
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="current-password">{t('profile.currentPassword')}</Label>
          <Input id="current-password" type="password" autoComplete="current-password" value={form.values.currentPassword} onChange={(e) => form.set('currentPassword', e.target.value)} />
          <FieldError message={form.errors.currentPassword} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-password">{t('auth.newPassword')}</Label>
          <Input id="new-password" type="password" autoComplete="new-password" value={form.values.newPassword} onChange={(e) => form.set('newPassword', e.target.value)} />
          <FieldError message={form.errors.newPassword} />
        </div>
      </div>
      <Button type="submit" size="sm" variant="secondary" loading={change.isPending}>
        {t('profile.changePassword')}
      </Button>
    </form>
  )
}

function PasswordPrompt({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive,
  pending,
  onConfirm,
  error
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel: string
  destructive?: boolean
  pending: boolean
  onConfirm: (password: string) => void
  error?: string
}) {
  const t = useT()
  const [password, setPassword] = useState('')
  useEffect(() => {
    if (!open) setPassword('')
  }, [open])
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (passwordConfirmSchema.safeParse({ password }).success) onConfirm(password)
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">{t('profile.deleteConfirm')}</Label>
            <Input id="confirm-password" type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
            <FieldError message={error} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant={destructive ? 'destructive' : 'default'} loading={pending} disabled={!password}>
              {confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function ProfilePage() {
  const t = useT()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useCurrentUser()
  const settings = useApi('settings:get')
  const info = useApi('app:info', undefined, { staleTime: Infinity })
  const { setUser, setRecoveryCode } = useAuthStore()
  const [promptRecovery, setPromptRecovery] = useState(false)
  const [promptDelete, setPromptDelete] = useState(false)
  const [promptError, setPromptError] = useState<string | undefined>()

  const regenerate = useApiMutation('auth:regenerateRecovery', {
    toastErrors: false,
    onSuccess: ({ recoveryCode }) => {
      setPromptRecovery(false)
      setRecoveryCode(recoveryCode)
    },
    onError: () => setPromptError(t('errors.wrongPassword'))
  })
  const remove = useApiMutation('auth:deleteAccount', {
    toastErrors: false,
    onSuccess: () => {
      setPromptDelete(false)
      queryClient.clear()
      setUser(null)
      navigate('/login')
    },
    onError: () => setPromptError(t('errors.wrongPassword'))
  })

  if (!user) return null

  return (
    <Page>
      <PageHeader title={t('profile.title')} subtitle={t('profile.subtitle')} />
      <Card className="mb-4 flex items-center gap-5 p-5">
        <div className="flex size-16 items-center justify-center rounded-2xl text-2xl font-semibold text-white" style={{ background: user.avatarColor }}>
          {user.username.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold">{user.username}</h2>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t('profile.memberSince', { date: formatDate(user.createdAt) })}</p>
        </div>
        <div className="grid grid-cols-4 gap-6 text-center">
          <div>
            <p className="text-xl font-semibold">{user.level}</p>
            <p className="text-[11px] text-muted-foreground">{t(`ranks.${rankForLevel(user.level)}`)}</p>
          </div>
          <div>
            <p className="text-xl font-semibold">{formatNumber(user.xp)}</p>
            <p className="text-[11px] text-muted-foreground">XP</p>
          </div>
          <div>
            <p className="text-xl font-semibold">{user.completedCount}</p>
            <p className="text-[11px] text-muted-foreground">{t('dashboard.solved')}</p>
          </div>
          <div>
            <p className="text-xl font-semibold">{formatDuration(user.learningSeconds)}</p>
            <p className="text-[11px] text-muted-foreground">{t('dashboard.learningTime')}</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Section icon={UserRound} title={t('profile.editProfile')}>
            <ProfileForm key={user.id} />
          </Section>
          <Section icon={Settings2} title={t('profile.settings')}>
            {settings.data && <SettingsForm settings={settings.data} />}
          </Section>
        </div>
        <div className="space-y-4">
          <Section icon={ShieldCheck} title={t('profile.security')}>
            <ChangePasswordForm />
          </Section>
          <Section icon={KeyRound} title={t('profile.recovery')} description={t('profile.recoveryText')}>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setPromptError(undefined)
                setPromptRecovery(true)
              }}
            >
              {t('profile.regenerate')}
            </Button>
          </Section>
          <Section icon={ShieldAlert} title={t('profile.danger')} description={t('profile.deleteText')}>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                setPromptError(undefined)
                setPromptDelete(true)
              }}
            >
              <Trash2 />
              {t('profile.deleteAccount')}
            </Button>
          </Section>
          {info.data && (
            <div className="space-y-1 px-1 text-[11px] text-muted-foreground">
              <p>{t('profile.version', { version: info.data.version })}</p>
              <p>
                {info.data.exerciseCount} заданий · {info.data.datasetCount} учебных баз данных
              </p>
              <p className="break-all">{t('profile.storage', { path: info.data.userDataPath })}</p>
            </div>
          )}
        </div>
      </div>

      <PasswordPrompt
        open={promptRecovery}
        onOpenChange={setPromptRecovery}
        title={t('profile.regenerate')}
        description={t('profile.recoveryText')}
        confirmLabel={t('profile.regenerate')}
        pending={regenerate.isPending}
        error={promptError}
        onConfirm={(password) => regenerate.mutate({ password })}
      />
      <PasswordPrompt
        open={promptDelete}
        onOpenChange={setPromptDelete}
        title={t('profile.deleteAccount')}
        description={t('profile.deleteText')}
        confirmLabel={t('common.delete')}
        destructive
        pending={remove.isPending}
        error={promptError}
        onConfirm={(password) => remove.mutate({ password })}
      />
    </Page>
  )
}
