import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { IpcEnvelope } from '@shared/ipc/contract'
import { createAppContext, type AppContext } from '../../src/main/app-context'
import { createDispatcher, type Dispatch } from '../../src/main/ipc/dispatcher'
import { createHandlers } from '../../src/main/ipc/handlers'
import { MemoryTokenStore } from '../../src/main/services/session'
import { CONTENT_DIR } from '../helpers/content'

const PASSWORD = 'secret123'

let dir: string
let tokens: MemoryTokenStore
let app: AppContext
let dispatch: Dispatch

async function open(extraExerciseDirs: string[] = []): Promise<void> {
  app = await createAppContext({
    databasePath: path.join(dir, 'app.db'),
    contentDir: CONTENT_DIR,
    extraExerciseDirs,
    tokenStore: tokens
  })
  dispatch = createDispatcher(createHandlers(app, { version: 'test', platform: 'test', userDataPath: dir }), app.session, () => {})
}

async function call<T = unknown>(channel: string, payload?: unknown): Promise<T> {
  const envelope = (await dispatch(channel, payload)) as IpcEnvelope<T>
  if (!envelope.ok) throw new Error(`${channel}: ${envelope.error.code} ${envelope.error.message}`)
  return envelope.data
}

async function failure(channel: string, payload?: unknown) {
  const envelope = await dispatch(channel, payload)
  if (envelope.ok) throw new Error(`${channel} unexpectedly succeeded`)
  return envelope.error
}

async function register(username = 'alice') {
  return call<{ user: { id: string; username: string }; recoveryCode: string }>('auth:register', {
    username,
    email: `${username}@example.com`,
    password: PASSWORD,
    confirmPassword: PASSWORD
  })
}

function queryRow(sql: string, params: string[]): Record<string, unknown> | undefined {
  const statement = app.db.sqlite.prepare(sql)
  try {
    statement.bind(params)
    return statement.step() ? statement.getAsObject() : undefined
  } finally {
    statement.free()
  }
}

type PlaygroundRun = {
  execution: { ok: boolean; error?: { code: string }; statements?: { result: { rows: unknown[][] } | null }[] }
}

async function playgroundScalar(sql: string): Promise<unknown> {
  const run = await call<PlaygroundRun>('playground:run', { dataset: 'ecommerce', sql })
  return run.execution.statements?.[0]?.result?.rows[0]?.[0]
}

function solutionOf(exerciseId: string): string {
  const ex = app.catalog.exercises.find((e) => e.id === exerciseId)
  if (!ex || !('solution' in ex)) throw new Error(`no SQL exercise ${exerciseId}`)
  return ex.solution
}

beforeEach(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sql-mastery-test-'))
  tokens = new MemoryTokenStore()
  await open()
})

afterEach(async () => {
  await app.close()
  fs.rmSync(dir, { recursive: true, force: true })
})

describe('IPC dispatcher', () => {
  it('rejects unknown channels, unauthenticated calls and invalid payloads', async () => {
    expect((await failure('fs:readFile', { path: '/etc/passwd' })).code).toBe('forbidden')
    expect((await failure('exercises:list', {})).code).toBe('unauthorized')
    await register()
    const invalid = await failure('exercises:submit', { exerciseId: 'b-intro-01', answer: { kind: 'shell', cmd: 'rm' }, durationMs: 1 })
    expect(invalid.code).toBe('validation')
  })

  it('reports the real number of exercises', async () => {
    const info = await call<{ exerciseCount: number; invalidExercises: number }>('app:info')
    expect(info.exerciseCount).toBe(app.catalog.exercises.length)
    expect(info.exerciseCount).toBeGreaterThan(0)
    expect(info.invalidExercises).toBe(0)
  })
})

describe('authentication', () => {
  it('registers with a hashed password and logs in by username or email', async () => {
    const { user, recoveryCode } = await register()
    expect(recoveryCode).toMatch(/^[A-Z0-9]{4}(-[A-Z0-9]{4}){3}$/)
    const hash = String(queryRow('SELECT password_hash FROM users WHERE id = ?', [user.id])?.password_hash)
    expect(hash.startsWith('$argon2id$')).toBe(true)
    expect(hash).not.toContain(PASSWORD)

    await call('auth:logout')
    expect(await call('auth:session')).toBeNull()
    expect((await failure('auth:login', { identifier: 'alice', password: 'wrong-password' })).code).toBe('invalid_credentials')
    await call('auth:login', { identifier: 'ALICE@example.com', password: PASSWORD })
    expect((await call<{ username: string }>('auth:session')).username).toBe('alice')
  })

  it('rejects duplicate accounts and weak passwords', async () => {
    await register()
    await call('auth:logout')
    const duplicate = await failure('auth:register', {
      username: 'Alice',
      email: 'other@example.com',
      password: PASSWORD,
      confirmPassword: PASSWORD
    })
    expect(duplicate.code).toBe('conflict')
    const weak = await failure('auth:register', { username: 'bob', email: 'bob@example.com', password: '123', confirmPassword: '123' })
    expect(weak.code).toBe('validation')
    expect(weak.fields?.password).toBeDefined()
  })

  it('locks out repeated failed logins', async () => {
    await register()
    await call('auth:logout')
    let lastCode = ''
    for (let i = 0; i < 6; i += 1) {
      lastCode = (await failure('auth:login', { identifier: 'alice', password: 'wrong-password' })).code
    }
    expect(lastCode).toBe('rate_limited')
  })

  it('recovers access with the recovery code and rotates it', async () => {
    const { recoveryCode } = await register()
    await call('auth:logout')
    const result = await call<{ recoveryCode: string }>('auth:recover', {
      identifier: 'alice',
      recoveryCode: recoveryCode.toLowerCase(),
      newPassword: 'another-pass1'
    })
    expect(result.recoveryCode).not.toBe(recoveryCode)
    await call('auth:logout')
    expect((await failure('auth:recover', { identifier: 'alice', recoveryCode, newPassword: 'third-pass1' })).code).toBe(
      'invalid_credentials'
    )
    await call('auth:login', { identifier: 'alice', password: 'another-pass1' })
  })

  it('changes password and deletes the account with its data', async () => {
    const { user } = await register()
    expect((await failure('auth:changePassword', { currentPassword: 'nope', newPassword: 'newsecret1' })).code).toBe(
      'invalid_credentials'
    )
    await call('auth:changePassword', { currentPassword: PASSWORD, newPassword: 'newsecret1' })
    await call('exercises:saveNote', { exerciseId: 'b-intro-01', content: 'note' })
    await call('auth:deleteAccount', { password: 'newsecret1' })
    expect(await call('auth:session')).toBeNull()
    expect(queryRow('SELECT id FROM users WHERE id = ?', [user.id])).toBeUndefined()
    expect(queryRow('SELECT 1 AS x FROM user_notes WHERE user_id = ?', [user.id])).toBeUndefined()
  })

  it('keeps accounts isolated from each other', async () => {
    await register('alice')
    await call('exercises:toggleFavorite', { exerciseId: 'b-intro-01' })
    await call('auth:logout')
    await register('bob')
    const page = await call<{ items: { id: string; isFavorite: boolean }[] }>('exercises:list', { favoritesOnly: true })
    expect(page.items).toHaveLength(0)
  })
})

describe('progress', () => {
  it('grades by execution, awards XP once and survives a restart', async () => {
    await register()
    const wrong = await call<{ grade: { correct: boolean }; xpAwarded: number }>('exercises:submit', {
      exerciseId: 'b-intro-01',
      answer: { kind: 'sql', sql: 'SELECT id FROM customers' },
      durationMs: 1000
    })
    expect(wrong.grade.correct).toBe(false)
    expect(wrong.xpAwarded).toBe(0)

    const blocked = await call<{ grade: { correct: boolean; error?: { code: string } } }>('exercises:submit', {
      exerciseId: 'b-intro-01',
      answer: { kind: 'sql', sql: 'DROP TABLE customers' },
      durationMs: 1000
    })
    expect(blocked.grade.error?.code).toBe('forbidden')

    const right = await call<{ grade: { correct: boolean }; xpAwarded: number; progress: { status: string } }>(
      'exercises:submit',
      { exerciseId: 'b-intro-01', answer: { kind: 'sql', sql: solutionOf('b-intro-01') }, durationMs: 4000 }
    )
    expect(right.grade.correct).toBe(true)
    expect(right.xpAwarded).toBeGreaterThan(0)
    expect(right.progress.status).toBe('solved')

    const again = await call<{ xpAwarded: number }>('exercises:submit', {
      exerciseId: 'b-intro-01',
      answer: { kind: 'sql', sql: 'select * from customers;' },
      durationMs: 2000
    })
    expect(again.xpAwarded).toBe(0)

    await call('exercises:saveDraft', { exerciseId: 'b-intro-02', draft: 'SELECT name' })
    const xpBefore = (await call<{ xp: number }>('auth:session')).xp
    await app.close()

    await open()
    expect(await call('auth:session')).toBeNull()
    await call('auth:login', { identifier: 'alice', password: PASSWORD, remember: true })
    const profile = await call<{ xp: number }>('auth:session')
    expect(profile.xp).toBe(xpBefore)
    const exercise = await call<{ progress: { status: string; attempts: number } }>('exercises:get', { exerciseId: 'b-intro-01' })
    expect(exercise.progress.status).toBe('solved')
    expect(exercise.progress.attempts).toBe(4)
    const draft = await call<{ progress: { draft: string | null } }>('exercises:get', { exerciseId: 'b-intro-02' })
    expect(draft.progress.draft).toBe('SELECT name')
    await app.close()

    await open()
    expect((await call<{ username: string }>('auth:session')).username).toBe('alice')
  })

  it('never mutates the shared dataset when the playground modifies data', async () => {
    await register()
    await call('playground:run', { dataset: 'ecommerce', sql: "UPDATE customers SET first_name = 'X'" })
    expect(await playgroundScalar("SELECT COUNT(*) FROM customers WHERE first_name <> 'X'")).toBe(0)
    const graded = await call<{ grade: { correct: boolean } }>('exercises:submit', {
      exerciseId: 'b-intro-01',
      answer: { kind: 'sql', sql: solutionOf('b-intro-01') },
      durationMs: 1000
    })
    expect(graded.grade.correct).toBe(true)
    await call('playground:reset', { dataset: 'ecommerce' })
    expect(Number(await playgroundScalar("SELECT COUNT(*) FROM customers WHERE first_name <> 'X'"))).toBeGreaterThan(0)
  })

  it('blocks ATTACH and PRAGMA in the playground', async () => {
    await register()
    for (const sql of ["ATTACH DATABASE '/tmp/x.db' AS x", 'PRAGMA table_info(customers)']) {
      const result = await call<PlaygroundRun>('playground:run', { dataset: 'ecommerce', sql })
      expect(result.execution.ok).toBe(false)
      expect(result.execution.error?.code).toBe('forbidden')
    }
  })
})

describe('catalog import', () => {
  it('imports user exercise files and keeps progress when the catalog is re-imported', async () => {
    await register()
    await call('exercises:submit', {
      exerciseId: 'b-intro-01',
      answer: { kind: 'sql', sql: solutionOf('b-intro-01') },
      durationMs: 1000
    })
    const baseCount = app.catalog.exercises.length
    await app.close()

    const userDir = path.join(dir, 'content')
    fs.mkdirSync(userDir)
    fs.writeFileSync(
      path.join(userDir, 'custom.json'),
      JSON.stringify({
        module: 'beginner.intro',
        dataset: 'ecommerce',
        exercises: [
          {
            id: 'user-custom-01',
            type: 'write_query',
            title: 'Пользовательское задание',
            description: 'Выведите имена всех клиентов.',
            difficulty: 'easy',
            solution: 'SELECT first_name FROM customers',
            hints: ['Используйте SELECT.'],
            explanation: 'Простая выборка.'
          }
        ]
      })
    )

    await open([userDir])
    expect(app.catalog.issues.filter((i) => i.file.includes('custom.json'))).toEqual([])
    expect(app.catalog.exercises.length).toBe(baseCount + 1)
    await call('auth:login', { identifier: 'alice', password: PASSWORD })
    const custom = await call<{ id: string }>('exercises:get', { exerciseId: 'user-custom-01' })
    expect(custom.id).toBe('user-custom-01')
    const solved = await call<{ progress: { status: string } }>('exercises:get', { exerciseId: 'b-intro-01' })
    expect(solved.progress.status).toBe('solved')
  })

  it('reports invalid user exercises instead of loading them', async () => {
    await app.close()
    const userDir = path.join(dir, 'content')
    fs.mkdirSync(userDir)
    fs.writeFileSync(
      path.join(userDir, 'broken.json'),
      JSON.stringify({
        module: 'beginner.intro',
        dataset: 'ecommerce',
        exercises: [{ id: 'user-broken-01', type: 'write_query', title: 'x', solution: 'SELECT * FROM no_such_table' }]
      })
    )
    await open([userDir])
    expect(app.catalog.exercises.some((e) => e.id === 'user-broken-01')).toBe(false)
    expect(app.catalog.issues.some((i) => i.file.includes('broken.json'))).toBe(true)
  })
})
