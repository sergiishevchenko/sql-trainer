import { Languages } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { LOCALES, LOCALE_LABELS, type Locale } from '@shared/constants/locale'
import { tMessage, useLocaleStore, useT } from '@/i18n'
import { errorMessage } from '@/lib/errors'
import { invoke, queryClient } from '@/lib/query'
import { cn } from '@/lib/utils'

/**
 * Persists the interface language in the main process, then refetches every query so
 * server-provided content and messages arrive in the new language.
 */
export async function changeLocale(locale: Locale): Promise<void> {
  const result = await invoke('app:setLocale', { locale })
  useLocaleStore.getState().setLocale(result.locale)
  await queryClient.invalidateQueries()
}

export function LanguageSwitcher({ className, compact = false }: { className?: string; compact?: boolean }) {
  const t = useT()
  const current = useLocaleStore((s) => s.locale)
  const [pending, setPending] = useState(false)

  const select = async (locale: Locale) => {
    if (locale === current || pending) return
    setPending(true)
    try {
      await changeLocale(locale)
    } catch (error) {
      toast.error(errorMessage(error) || tMessage('common.somethingWrong'))
    } finally {
      setPending(false)
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label={t('common.language')}
      className={cn('no-drag inline-flex items-center gap-1 rounded-md border bg-background/40 p-0.5', className)}
    >
      <Languages className="mx-1 size-3.5 text-muted-foreground" aria-hidden />
      {LOCALES.map((locale) => (
        <button
          key={locale}
          type="button"
          role="radio"
          aria-checked={locale === current}
          aria-label={LOCALE_LABELS[locale]}
          disabled={pending}
          onClick={() => void select(locale)}
          className={cn(
            'h-6 rounded px-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60',
            locale === current && 'bg-accent text-foreground'
          )}
        >
          {compact ? locale.toUpperCase() : LOCALE_LABELS[locale]}
        </button>
      ))}
    </div>
  )
}
