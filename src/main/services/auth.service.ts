import crypto from 'node:crypto'
import { and, eq, gt, lt, or } from 'drizzle-orm'
import type { z } from 'zod'
import type {
  changePasswordSchema,
  loginSchema,
  recoverSchema,
  registerSchema,
  updateProfileSchema
} from '@shared/schemas/auth'
import type { AuthResult, UserProfile } from '@shared/types/user'
import type { AppDatabase } from '../database/connection'
import { sessions, users, userSettings } from '../database/schema'
import { AppError } from '../errors'
import {
  generateRecoveryCode,
  generateToken,
  hashSecret,
  hashToken,
  normalizeRecoveryCode,
  verifySecret
} from '../security/passwords'
import { RateLimiter } from '../security/rate-limiter'
import type { SessionManager, TokenStore } from './session'
import { toProfile, type UserRow, type UsersService } from './users.service'

const REMEMBER_MS = 30 * 24 * 3600 * 1000
const AVATAR_COLORS = ['#8b5cf6', '#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899']

const DUMMY_HASH_SOURCE = 'sql-mastery-timing-equalizer'

/**
 * Local multi-account authentication. Passwords and recovery codes are stored only as Argon2id hashes.
 */
export class AuthService {
  private readonly limiter: RateLimiter
  private dummyHash: Promise<string> | null = null

  constructor(
    private readonly db: AppDatabase,
    private readonly session: SessionManager,
    private readonly tokens: TokenStore,
    private readonly usersService: UsersService,
    private readonly now: () => number = Date.now,
    limiter?: RateLimiter
  ) {
    this.limiter = limiter ?? new RateLimiter(5, 15_000, now)
  }

  private findByIdentifier(identifier: string): UserRow | undefined {
    const normalized = identifier.trim().toLowerCase()
    return this.db.orm
      .select()
      .from(users)
      .where(or(eq(users.usernameNormalized, normalized), eq(users.emailNormalized, normalized)))
      .get()
  }

  private assertNotLimited(key: string): void {
    const retry = this.limiter.retryAfterMs(key)
    if (retry > 0) {
      throw new AppError('rate_limited', 'errors.rateLimited', { seconds: String(Math.ceil(retry / 1000)) })
    }
  }

  private async equalizeTiming(password: string): Promise<void> {
    this.dummyHash ??= hashSecret(DUMMY_HASH_SOURCE)
    await verifySecret(password, await this.dummyHash)
  }

  private assertUnique(username: string, email: string, exceptUserId?: string): void {
    const existing = this.db.orm
      .select({ id: users.id, usernameNormalized: users.usernameNormalized, emailNormalized: users.emailNormalized })
      .from(users)
      .where(or(eq(users.usernameNormalized, username.toLowerCase()), eq(users.emailNormalized, email.toLowerCase())))
      .all()
      .filter((u) => u.id !== exceptUserId)
    const fields: Record<string, string> = {}
    if (existing.some((u) => u.usernameNormalized === username.toLowerCase())) fields.username = 'errors.usernameTaken'
    if (existing.some((u) => u.emailNormalized === email.toLowerCase())) fields.email = 'errors.emailTaken'
    if (Object.keys(fields).length > 0) throw new AppError('conflict', 'errors.accountExists', fields)
  }

  async register(input: z.output<typeof registerSchema>): Promise<AuthResult> {
    this.assertUnique(input.username, input.email)
    const recoveryCode = generateRecoveryCode()
    const [passwordHash, recoveryHash] = await Promise.all([
      hashSecret(input.password),
      hashSecret(normalizeRecoveryCode(recoveryCode))
    ])
    const id = crypto.randomUUID()
    const now = this.now()
    this.db.write((orm) => {
      this.assertUnique(input.username, input.email)
      orm
        .insert(users)
        .values({
          id,
          username: input.username,
          usernameNormalized: input.username.toLowerCase(),
          email: input.email,
          emailNormalized: input.email.toLowerCase(),
          passwordHash,
          recoveryHash,
          avatarColor: AVATAR_COLORS[crypto.randomInt(AVATAR_COLORS.length)],
          createdAt: now,
          lastLoginAt: now
        })
        .run()
      orm.insert(userSettings).values({ userId: id, updatedAt: now }).run()
    })
    this.session.set(id)
    this.tokens.write(null)
    return { user: this.usersService.profile(id), recoveryCode }
  }

  async login(input: z.output<typeof loginSchema>): Promise<AuthResult> {
    const key = input.identifier.trim().toLowerCase()
    this.assertNotLimited(key)
    const user = this.findByIdentifier(input.identifier)
    if (!user) {
      await this.equalizeTiming(input.password)
      this.limiter.fail(key)
      throw new AppError('invalid_credentials', 'errors.invalidCredentials')
    }
    if (!(await verifySecret(input.password, user.passwordHash))) {
      this.limiter.fail(key)
      throw new AppError('invalid_credentials', 'errors.invalidCredentials')
    }
    this.limiter.reset(key)
    this.startSession(user.id, input.remember)
    return { user: this.usersService.profile(user.id) }
  }

  private startSession(userId: string, remember: boolean): void {
    const now = this.now()
    this.db.write((orm) => {
      orm.update(users).set({ lastLoginAt: now }).where(eq(users.id, userId)).run()
      orm.delete(sessions).where(and(eq(sessions.userId, userId), lt(sessions.expiresAt, now))).run()
      if (remember) {
        const token = generateToken()
        orm
          .insert(sessions)
          .values({ id: crypto.randomUUID(), userId, tokenHash: hashToken(token), createdAt: now, expiresAt: now + REMEMBER_MS })
          .run()
        this.tokens.write(token)
      } else {
        this.tokens.write(null)
      }
    })
    this.session.set(userId)
  }

  restore(): UserProfile | null {
    const current = this.session.currentUserId
    if (current) return this.usersService.profile(current)
    const token = this.tokens.read()
    if (!token) return null
    const row = this.db.orm
      .select()
      .from(sessions)
      .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, this.now())))
      .get()
    if (!row) {
      this.tokens.write(null)
      return null
    }
    this.session.set(row.userId)
    this.db.write((orm) => orm.update(users).set({ lastLoginAt: this.now() }).where(eq(users.id, row.userId)).run())
    return this.usersService.profile(row.userId)
  }

  logout(): void {
    const token = this.tokens.read()
    if (token) {
      this.db.write((orm) => orm.delete(sessions).where(eq(sessions.tokenHash, hashToken(token))).run())
    }
    this.tokens.write(null)
    this.session.clear()
  }

  async changePassword(userId: string, input: z.output<typeof changePasswordSchema>): Promise<void> {
    const user = this.usersService.row(userId)
    if (!(await verifySecret(input.currentPassword, user.passwordHash))) {
      throw new AppError('invalid_credentials', 'errors.wrongPassword', { currentPassword: 'errors.wrongPassword' })
    }
    const passwordHash = await hashSecret(input.newPassword)
    this.db.write((orm) => {
      orm.update(users).set({ passwordHash }).where(eq(users.id, userId)).run()
      orm.delete(sessions).where(eq(sessions.userId, userId)).run()
    })
    this.tokens.write(null)
  }

  async recover(input: z.output<typeof recoverSchema>): Promise<AuthResult> {
    const key = `recover:${input.identifier.trim().toLowerCase()}`
    this.assertNotLimited(key)
    const user = this.findByIdentifier(input.identifier)
    const valid = user ? await verifySecret(normalizeRecoveryCode(input.recoveryCode), user.recoveryHash) : false
    if (!user || !valid) {
      this.limiter.fail(key)
      throw new AppError('invalid_credentials', 'errors.invalidRecovery')
    }
    this.limiter.reset(key)
    const recoveryCode = generateRecoveryCode()
    const [passwordHash, recoveryHash] = await Promise.all([
      hashSecret(input.newPassword),
      hashSecret(normalizeRecoveryCode(recoveryCode))
    ])
    this.db.write((orm) => {
      orm.update(users).set({ passwordHash, recoveryHash }).where(eq(users.id, user.id)).run()
      orm.delete(sessions).where(eq(sessions.userId, user.id)).run()
    })
    this.startSession(user.id, false)
    return { user: this.usersService.profile(user.id), recoveryCode }
  }

  async regenerateRecovery(userId: string, password: string): Promise<string> {
    const user = this.usersService.row(userId)
    if (!(await verifySecret(password, user.passwordHash))) {
      throw new AppError('invalid_credentials', 'errors.wrongPassword', { password: 'errors.wrongPassword' })
    }
    const recoveryCode = generateRecoveryCode()
    const recoveryHash = await hashSecret(normalizeRecoveryCode(recoveryCode))
    this.db.write((orm) => orm.update(users).set({ recoveryHash }).where(eq(users.id, userId)).run())
    return recoveryCode
  }

  updateProfile(userId: string, input: z.output<typeof updateProfileSchema>): UserProfile {
    this.assertUnique(input.username, input.email, userId)
    this.db.write((orm) =>
      orm
        .update(users)
        .set({
          username: input.username,
          usernameNormalized: input.username.toLowerCase(),
          email: input.email,
          emailNormalized: input.email.toLowerCase()
        })
        .where(eq(users.id, userId))
        .run()
    )
    return toProfile(this.usersService.row(userId), this.now())
  }

  async deleteAccount(userId: string, password: string): Promise<void> {
    const user = this.usersService.row(userId)
    if (!(await verifySecret(password, user.passwordHash))) {
      throw new AppError('invalid_credentials', 'errors.wrongPassword', { password: 'errors.wrongPassword' })
    }
    this.db.write((orm) => orm.delete(users).where(eq(users.id, userId)).run())
    this.tokens.write(null)
    this.session.clear()
  }
}
