import { afterEach, describe, expect, it } from 'vitest'
import { setLocale, tr } from '../../src/main/i18n'
import { enMessages, ruMessages, type MessageKey } from '../../src/main/i18n/messages'

function placeholders(template: string): string[] {
  return [...new Set([...template.matchAll(/\{(\w+)(?::[^}]+)?\}/g)].map((m) => m[1]))].sort()
}

afterEach(() => setLocale('en'))

describe('main process messages', () => {
  it('are translated with matching placeholders', () => {
    for (const key of Object.keys(enMessages) as MessageKey[]) {
      expect(ruMessages[key].trim(), key).not.toBe('')
      expect(placeholders(ruMessages[key]), key).toEqual(placeholders(enMessages[key]))
    }
  })

  it('follow the active locale', () => {
    expect(tr('guard.tooManyStatements', { max: 25 })).toBe('Too many statements in a single run (maximum 25)')
    setLocale('ru')
    expect(tr('guard.tooManyStatements', { max: 25 })).toBe('Слишком много команд в одном запуске (максимум 25)')
  })
})
