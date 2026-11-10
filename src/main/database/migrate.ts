import type { AppDatabase } from './connection'

const migrationFiles = import.meta.glob('./migrations/*.sql', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>

export interface Migration {
  version: number
  name: string
  statements: string[]
}

export function listMigrations(): Migration[] {
  return Object.entries(migrationFiles)
    .map(([file, content]) => {
      const name = file.split('/').pop()!.replace(/\.sql$/, '')
      const version = Number.parseInt(name.split('_')[0], 10) + 1
      const statements = content
        .split('--> statement-breakpoint')
        .map((s) => s.trim())
        .filter(Boolean)
      return { version, name, statements }
    })
    .sort((a, b) => a.version - b.version)
}

export function currentSchemaVersion(db: AppDatabase): number {
  const result = db.sqlite.exec('PRAGMA user_version')
  return Number(result[0]?.values[0]?.[0] ?? 0)
}

export interface MigrationReport {
  fromVersion: number
  toVersion: number
  applied: string[]
  backupPath: string | null
}

/**
 * Applies pending migrations in order inside individual transactions.
 * A file backup is taken before upgrading an existing database.
 */
export function runMigrations(db: AppDatabase): MigrationReport {
  db.sqlite.run(`CREATE TABLE IF NOT EXISTS __schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at INTEGER NOT NULL
  )`)
  const appliedRows = db.sqlite.exec('SELECT version FROM __schema_migrations')
  const applied = new Set((appliedRows[0]?.values ?? []).map((r) => Number(r[0])))
  const fromVersion = currentSchemaVersion(db)
  const pending = listMigrations().filter((m) => !applied.has(m.version))

  let backupPath: string | null = null
  if (pending.length > 0 && applied.size > 0) {
    backupPath = db.backup(`v${fromVersion}`)
  }

  const appliedNames: string[] = []
  for (const migration of pending) {
    db.sqlite.run('BEGIN IMMEDIATE')
    try {
      for (const statement of migration.statements) db.sqlite.run(statement)
      db.sqlite.run('INSERT INTO __schema_migrations (version, name, applied_at) VALUES (?, ?, ?)', [
        migration.version,
        migration.name,
        Date.now()
      ])
      db.sqlite.run(`PRAGMA user_version = ${migration.version}`)
      db.sqlite.run('COMMIT')
      appliedNames.push(migration.name)
    } catch (error) {
      db.sqlite.run('ROLLBACK')
      throw new Error(`Migration ${migration.name} failed: ${(error as Error).message}`)
    }
  }

  if (appliedNames.length > 0 || !db.existsOnDisk) db.persist()

  return { fromVersion, toVersion: currentSchemaVersion(db), applied: appliedNames, backupPath }
}
