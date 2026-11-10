import { describe, expect, it } from 'vitest'
import { LOCALES } from '@shared/constants/locale'
import { dictionaries, translate } from '@/i18n'

function flatten(node: unknown, prefix = ''): Map<string, string> {
  const out = new Map<string, string>()
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'string') out.set(path, value)
    else for (const [k, v] of flatten(value, path)) out.set(k, v)
  }
  return out
}

function placeholders(template: string): string[] {
  return [...new Set([...template.matchAll(/\{(\w+)(?::[^}]+)?\}/g)].map((m) => m[1]))].sort()
}

describe('interface dictionaries', () => {
  it('define the same keys with the same placeholders in every language', () => {
    const reference = flatten(dictionaries.en)
    for (const locale of LOCALES) {
      const dict = flatten(dictionaries[locale])
      expect([...dict.keys()].sort(), locale).toEqual([...reference.keys()].sort())
      for (const [key, value] of dict) {
        expect(value.trim(), `${locale}:${key}`).not.toBe('')
        expect(placeholders(value), `${locale}:${key}`).toEqual(placeholders(reference.get(key)!))
      }
    }
  })

  it('substitutes parameters and picks plural forms per language', () => {
    expect(translate('en', 'learning.exercisesCount', { n: 1 })).toBe('1 exercise')
    expect(translate('en', 'learning.exercisesCount', { n: 12 })).toBe('12 exercises')
    expect(translate('ru', 'learning.exercisesCount', { n: 1 })).toBe('1 задание')
    expect(translate('ru', 'learning.exercisesCount', { n: 3 })).toBe('3 задания')
    expect(translate('ru', 'learning.exercisesCount', { n: 11 })).toBe('11 заданий')
    expect(translate('en', 'errors.rateLimited', { seconds: 30 })).toBe('Too many attempts. Try again in 30 s.')
    expect(translate('en', 'missing.key')).toBe('missing.key')
  })
})
