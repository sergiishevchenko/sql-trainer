import crypto from 'node:crypto'
import { argon2id, argon2Verify } from 'hash-wasm'

const ARGON2_PARAMS = {
  parallelism: 1,
  iterations: 2,
  memorySize: 19456,
  hashLength: 32,
  outputType: 'encoded'
} as const

/**
 * Hashes a secret with Argon2id (OWASP recommended parameters) and returns a PHC-encoded string.
 */
export async function hashSecret(secret: string): Promise<string> {
  const salt = new Uint8Array(crypto.randomBytes(16))
  return argon2id({ password: secret, salt, ...ARGON2_PARAMS })
}

export async function verifySecret(secret: string, encodedHash: string): Promise<boolean> {
  try {
    return await argon2Verify({ password: secret, hash: encodedHash })
  } catch {
    return false
  }
}

const RECOVERY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateRecoveryCode(): string {
  const bytes = crypto.randomBytes(16)
  const chars = Array.from(bytes, (b) => RECOVERY_ALPHABET[b % RECOVERY_ALPHABET.length])
  return [0, 4, 8, 12].map((i) => chars.slice(i, i + 4).join('')).join('-')
}

export function normalizeRecoveryCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString('base64url')
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}
