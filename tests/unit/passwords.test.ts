import { describe, expect, it } from 'vitest'
import {
  generateRecoveryCode,
  generateToken,
  hashSecret,
  hashToken,
  normalizeRecoveryCode,
  verifySecret
} from '../../src/main/security/passwords'

describe('password hashing', () => {
  it('produces salted Argon2id hashes that verify only the original secret', async () => {
    const a = await hashSecret('correct horse')
    const b = await hashSecret('correct horse')
    expect(a.startsWith('$argon2id$')).toBe(true)
    expect(a).not.toBe(b)
    expect(await verifySecret('correct horse', a)).toBe(true)
    expect(await verifySecret('wrong horse', a)).toBe(false)
  })

  it('returns false for malformed hashes instead of throwing', async () => {
    expect(await verifySecret('x', 'not-a-hash')).toBe(false)
  })
})

describe('recovery codes and tokens', () => {
  it('generates readable recovery codes that normalise case and separators', () => {
    const code = generateRecoveryCode()
    expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/)
    expect(normalizeRecoveryCode(code.toLowerCase().replace(/-/g, ' '))).toBe(code.replace(/-/g, ''))
  })

  it('generates unique tokens and stores only their digest', () => {
    const token = generateToken()
    expect(token).not.toBe(generateToken())
    expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/)
    expect(hashToken(token)).toBe(hashToken(token))
  })
})
