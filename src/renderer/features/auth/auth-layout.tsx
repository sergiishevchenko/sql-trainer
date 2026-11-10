import { motion } from 'framer-motion'
import { CheckCircle2, Database, Lock, Trophy } from 'lucide-react'
import type { ReactNode } from 'react'
import { LanguageSwitcher } from '@/components/common/language-switcher'
import { useT } from '@/i18n'
import { useApi } from '@/lib/query'

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const t = useT()
  const info = useApi('app:info')
  const features = [
    {
      icon: Database,
      text: info.data
        ? t('auth.features.exercises', { exercises: info.data.exerciseCount, datasets: info.data.datasetCount })
        : t('auth.features.exercisesFallback')
    },
    { icon: CheckCircle2, text: t('auth.features.grading') },
    { icon: Trophy, text: t('auth.features.gamification') },
    { icon: Lock, text: t('auth.localNotice') }
  ]

  return (
    <div className="flex h-full">
      <div className="drag-region fixed inset-x-0 top-0 z-10 h-8" />
      <LanguageSwitcher className="fixed top-10 right-6 z-20" />
      <aside className="relative hidden w-[46%] max-w-[640px] flex-col justify-between overflow-hidden border-r bg-sidebar p-10 lg:flex">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-60" />
        <div className="glow pointer-events-none absolute inset-0" />
        <div className="relative flex items-center gap-2.5 pt-4">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[0_0_24px_-4px_oklch(0.64_0.2_286/70%)]">
            <Database className="size-4" />
          </div>
          <span className="font-semibold tracking-tight">{t('common.appName')}</span>
        </div>
        <div className="relative space-y-8">
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight text-balance">{t('auth.welcomeTitle')}</h1>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{t('auth.welcomeSubtitle')}</p>
          </div>
          <ul className="space-y-3">
            {features.map(({ icon: Icon, text }, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.06 }}
                className="flex items-start gap-3 text-sm text-foreground/85"
              >
                <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{text}</span>
              </motion.li>
            ))}
          </ul>
        </div>
        <pre className="relative rounded-lg border bg-background/60 p-4 font-mono text-xs leading-relaxed text-muted-foreground">
          <span className="text-primary">SELECT</span> name, <span className="text-primary">COUNT</span>(*) <span className="text-primary">AS</span> solved{'\n'}
          <span className="text-primary">FROM</span> learners{'\n'}
          <span className="text-primary">WHERE</span> skill = <span className="text-emerald-300">'SQL'</span>{'\n'}
          <span className="text-primary">ORDER BY</span> solved <span className="text-primary">DESC</span>;
        </pre>
      </aside>
      <main className="flex flex-1 items-center justify-center overflow-y-auto p-8">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm space-y-6">
          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
          {children}
        </motion.div>
      </main>
    </div>
  )
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-destructive">{message}</p>
}
