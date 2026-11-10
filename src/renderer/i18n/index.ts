import { create } from 'zustand'
import { en } from './en'
import { ru, type Dictionary } from './ru'

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] }

type Paths<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Paths<T[K], `${P}${K}.`>
}[keyof T & string]

export type TranslationKey = Paths<Dictionary>
export type Locale = 'ru' | 'en'

const dictionaries: Record<Locale, DeepPartial<Dictionary>> = { ru, en }

function lookup(dict: unknown, key: string): string | undefined {
  let node: unknown = dict
  for (const part of key.split('.')) {
    if (node && typeof node === 'object' && part in node) node = (node as Record<string, unknown>)[part]
    else return undefined
  }
  return typeof node === 'string' ? node : undefined
}

export function translate(locale: Locale, key: string, params?: Record<string, string | number>): string {
  const template = lookup(dictionaries[locale], key) ?? lookup(ru, key) ?? key
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (_, name: string) => (name in params ? String(params[name]) : `{${name}}`))
}

interface LocaleState {
  locale: Locale
  setLocale: (locale: Locale) => void
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: 'ru',
  setLocale: (locale) => set({ locale })
}))

export function useT() {
  const locale = useLocaleStore((s) => s.locale)
  return (key: TranslationKey, params?: Record<string, string | number>) => translate(locale, key, params)
}

export function tMessage(key: string, params?: Record<string, string | number>): string {
  return translate(useLocaleStore.getState().locale, key, params)
}
