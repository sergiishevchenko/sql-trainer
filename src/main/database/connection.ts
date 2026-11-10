import fs from 'node:fs'
import path from 'node:path'
import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js'
import { drizzle, type SQLJsDatabase } from 'drizzle-orm/sql-js'
import * as schema from './schema'

export type Orm = SQLJsDatabase<typeof schema>

export interface OpenOptions {
  filePath: string | null
  wasmPath?: string
}

const sqlJsCache = new Map<string, Promise<SqlJsStatic>>()

export function loadSqlJs(wasmPath?: string): Promise<SqlJsStatic> {
  const key = wasmPath ?? 'default'
  let pending = sqlJsCache.get(key)
  if (!pending) {
    pending = initSqlJs(wasmPath ? { locateFile: () => wasmPath } : undefined)
    sqlJsCache.set(key, pending)
  }
  return pending
}

/**
 * Application database (users, progress, settings). Backed by an in-memory SQLite
 * instance that is atomically flushed to disk after every committed write.
 */
export class AppDatabase {
  private transactionDepth = 0
  private dirty = false

  private constructor(
    readonly sqlite: Database,
    readonly orm: Orm,
    readonly filePath: string | null
  ) {
    this.applyPragmas()
  }

  static async open(options: OpenOptions): Promise<AppDatabase> {
    const SQL = await loadSqlJs(options.wasmPath)
    let sqlite: Database
    if (options.filePath && fs.existsSync(options.filePath)) {
      sqlite = new SQL.Database(fs.readFileSync(options.filePath))
    } else {
      sqlite = new SQL.Database()
    }
    const orm = drizzle(sqlite, { schema })
    return new AppDatabase(sqlite, orm, options.filePath)
  }

  get existsOnDisk(): boolean {
    return this.filePath !== null && fs.existsSync(this.filePath)
  }

  write<T>(fn: (orm: Orm) => T): T {
    if (this.transactionDepth > 0) {
      this.transactionDepth += 1
      try {
        return fn(this.orm)
      } finally {
        this.transactionDepth -= 1
      }
    }
    this.transactionDepth = 1
    this.sqlite.run('BEGIN IMMEDIATE')
    try {
      const result = fn(this.orm)
      this.sqlite.run('COMMIT')
      this.dirty = true
      return result
    } catch (error) {
      this.sqlite.run('ROLLBACK')
      throw error
    } finally {
      this.transactionDepth = 0
      if (this.dirty) this.persist()
    }
  }

  exec(sqlText: string): void {
    this.sqlite.exec(sqlText)
    if (this.transactionDepth === 0) {
      this.dirty = true
      this.persist()
    }
  }

  persist(): void {
    if (!this.filePath) {
      this.dirty = false
      return
    }
    const data = this.sqlite.export()
    this.applyPragmas()
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true })
    const tempPath = `${this.filePath}.tmp`
    const fd = fs.openSync(tempPath, 'w')
    try {
      fs.writeSync(fd, data)
      fs.fsyncSync(fd)
    } finally {
      fs.closeSync(fd)
    }
    fs.renameSync(tempPath, this.filePath)
    this.dirty = false
  }

  backup(suffix: string): string | null {
    if (!this.filePath || !fs.existsSync(this.filePath)) return null
    const target = `${this.filePath}.${suffix}.bak`
    fs.copyFileSync(this.filePath, target)
    return target
  }

  close(): void {
    if (this.dirty) this.persist()
    this.sqlite.close()
  }

  private applyPragmas(): void {
    this.sqlite.run('PRAGMA foreign_keys = ON')
  }
}
