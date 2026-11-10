import { eq } from 'drizzle-orm'
import { DEFAULT_LOCALE, isLocale, type Locale } from '@shared/constants/locale'
import type { AppDatabase } from '../database/connection'
import { appMeta } from '../database/schema'
import { getLocale, setLocale } from '../i18n'

const LOCALE_KEY = 'locale'

/**
 * Application-wide interface language. It is shared by all local accounts so the sign-in
 * screen is already shown in the chosen language, and it is persisted in `app_meta`.
 */
export class LocaleService {
  constructor(
    private readonly db: AppDatabase,
    private readonly now: () => number = Date.now
  ) {
    const stored = this.db.orm.select({ value: appMeta.value }).from(appMeta).where(eq(appMeta.key, LOCALE_KEY)).get()?.value
    setLocale(isLocale(stored) ? stored : DEFAULT_LOCALE)
  }

  get(): Locale {
    return getLocale()
  }

  set(locale: Locale): Locale {
    const row = { key: LOCALE_KEY, value: locale, updatedAt: this.now() }
    this.db.write((orm) => orm.insert(appMeta).values(row).onConflictDoUpdate({ target: appMeta.key, set: row }).run())
    setLocale(locale)
    return locale
  }
}
