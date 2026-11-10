import fs from 'node:fs'
import path from 'node:path'
import { safeStorage } from 'electron'
import type { TokenStore } from '../services/session'

/**
 * Persists the "remember me" token in userData, encrypted with the OS keychain when available.
 */
export class FileTokenStore implements TokenStore {
  constructor(private readonly filePath: string) {}

  read(): string | null {
    try {
      if (!fs.existsSync(this.filePath)) return null
      const raw = fs.readFileSync(this.filePath)
      const payload = JSON.parse(raw.toString('utf8')) as { encrypted: boolean; data: string }
      if (payload.encrypted) {
        if (!safeStorage.isEncryptionAvailable()) return null
        return safeStorage.decryptString(Buffer.from(payload.data, 'base64'))
      }
      return payload.data
    } catch {
      return null
    }
  }

  write(token: string | null): void {
    if (token === null) {
      fs.rmSync(this.filePath, { force: true })
      return
    }
    const encrypted = safeStorage.isEncryptionAvailable()
    const data = encrypted ? safeStorage.encryptString(token).toString('base64') : token
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true })
    fs.writeFileSync(this.filePath, JSON.stringify({ encrypted, data }), { mode: 0o600 })
  }
}
