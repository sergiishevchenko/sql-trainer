import { DEFAULT_LOCALE, type Locale } from '@shared/constants/locale'
import { enMessages, ruMessages, type MessageKey } from './messages'

export type { MessageKey } from './messages'

const CATALOGS: Record<Locale, Record<MessageKey, string>> = { en: enMessages, ru: ruMessages }

let current: Locale = DEFAULT_LOCALE

/** Returns the interface language used for messages produced by the main process. */
export function getLocale(): Locale {
  return current
}

/** Switches the language of main-process messages for all subsequent requests. */
export function setLocale(locale: Locale): void {
  current = locale
}

/** Resolves a message in the current locale and substitutes `{name}` placeholders. */
export function tr(key: MessageKey, params: Record<string, string | number> = {}): string {
  const template = CATALOGS[current][key] ?? enMessages[key]
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match))
}
