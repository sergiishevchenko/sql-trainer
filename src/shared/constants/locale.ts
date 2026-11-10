export const LOCALES = ['en', 'ru'] as const

export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'en'

export const CONTENT_SOURCE_LOCALE: Locale = 'ru'

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  ru: 'Русский'
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}
