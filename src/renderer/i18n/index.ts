import { create } from 'zustand'
import { DEFAULT_LOCALE, type Locale } from '@shared/constants/locale'
import { en } from './en'
import { ru, type Dictionary } from './ru'

export type { Locale } from '@shared/constants/locale'

type Paths<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Paths<T[K], `${P}${K}.`>
}[keyof T & string]

export type TranslationKey = Paths<Dictionary>

export const dictionaries: Record<Locale, Dictionary> = { en, ru }

const INTL_TAGS: Record<Locale, string> = { en: 'en-US', ru: 'ru-RU' }

const PLURAL_ORDER: Record<Locale, Intl.LDMLPluralRule[]> = {
  en: ['one', 'other'],
  ru: ['one', 'few', 'many']
}

function lookup(dict: unknown, key: string): string | undefined {
  let node: unknown = dict
  for (const part of key.split('.')) {
    if (node && typeof node === 'object' && part in node) node = (node as Record<string, unknown>)[part]
    else return undefined
  }
  return typeof node === 'string' ? node : undefined
}

function pluralForm(locale: Locale, count: number, forms: string[]): string {
  const category = new Intl.PluralRules(INTL_TAGS[locale]).select(count)
  const index = PLURAL_ORDER[locale].indexOf(category)
  return forms[index >= 0 ? index : forms.length - 1] ?? forms[forms.length - 1]
}

/**
 * Resolves a dictionary key. `{name}` is replaced with a parameter and `{n:one|other}`
 * picks a plural form for the numeric parameter `n` using the locale's plural rules.
 */
export function translate(locale: Locale, key: string, params?: Record<string, string | number>): string {
  const template = lookup(dictionaries[locale], key) ?? lookup(dictionaries[DEFAULT_LOCALE], key) ?? key
  if (!params) return template
  return template
    .replace(/\{(\w+):([^}]+)\}/g, (match, name: string, forms: string) =>
      name in params ? pluralForm(locale, Number(params[name]), forms.split('|')) : match
    )
    .replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match))
}

interface LocaleState {
  locale: Locale
  setLocale: (locale: Locale) => void
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: DEFAULT_LOCALE,
  setLocale: (locale) => {
    document.documentElement.lang = locale
    set({ locale })
  }
}))

export function useT() {
  const locale = useLocaleStore((s) => s.locale)
  return (key: TranslationKey, params?: Record<string, string | number>) => translate(locale, key, params)
}

export function tMessage(key: string, params?: Record<string, string | number>): string {
  return translate(useLocaleStore.getState().locale, key, params)
}

export function intlLocale(): string {
  return INTL_TAGS[useLocaleStore.getState().locale]
}
