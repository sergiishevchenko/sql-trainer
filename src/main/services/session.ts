import { AppError } from '../errors'

export interface TokenStore {
  read(): string | null
  write(token: string | null): void
}

export class MemoryTokenStore implements TokenStore {
  private token: string | null = null
  read(): string | null {
    return this.token
  }
  write(token: string | null): void {
    this.token = token
  }
}

/**
 * Holds the authenticated user for the lifetime of the main process.
 * The renderer never receives credentials or session tokens.
 */
export class SessionManager {
  private userId: string | null = null

  get currentUserId(): string | null {
    return this.userId
  }

  require(): string {
    if (!this.userId) throw new AppError('unauthorized', 'errors.unauthorized')
    return this.userId
  }

  set(userId: string): void {
    this.userId = userId
  }

  clear(): void {
    this.userId = null
  }
}
