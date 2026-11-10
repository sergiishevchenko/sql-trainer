import type { Database, SqlValue } from 'sql.js'
import type { EngineError, ExecutionResult, ResultSet, SqlCell, StatementOutcome } from '@shared/types/engine'

export function normalizeCell(value: SqlValue): SqlCell {
  if (value instanceof Uint8Array) return `[BLOB ${value.byteLength} байт]`
  if (typeof value === 'bigint') return Number(value)
  return value as SqlCell
}

export function classifyEngineError(error: unknown): EngineError {
  const message = error instanceof Error ? error.message : String(error)
  if (/syntax error|incomplete input|unrecognized token/i.test(message)) return { code: 'syntax', message }
  return { code: 'runtime', message }
}

/**
 * Executes every statement of the script on the given database, collecting result sets
 * and stopping row collection once the limit is reached.
 */
export function executeOnDatabase(db: Database, sql: string, maxRows: number): ExecutionResult {
  const started = performance.now()
  const statements: StatementOutcome[] = []
  try {
    for (const stmt of db.iterateStatements(sql)) {
      try {
        const text = stmt.getSQL().trim()
        const columns = stmt.getColumnNames()
        if (columns.length > 0) {
          const rows: SqlCell[][] = []
          let truncated = false
          while (stmt.step()) {
            if (rows.length >= maxRows) {
              truncated = true
              break
            }
            rows.push(stmt.get().map(normalizeCell))
          }
          statements.push({ sql: text, result: { columns, rows, truncated }, rowsAffected: 0 })
        } else {
          stmt.step()
          statements.push({ sql: text, result: null, rowsAffected: db.getRowsModified() })
        }
      } finally {
        stmt.free()
      }
    }
  } catch (error) {
    return { ok: false, error: classifyEngineError(error), durationMs: performance.now() - started, statements }
  }
  return { ok: true, statements, durationMs: performance.now() - started }
}

export function lastResultSet(execution: ExecutionResult): ResultSet | null {
  if (!execution.ok) return null
  for (let i = execution.statements.length - 1; i >= 0; i -= 1) {
    const result = execution.statements[i].result
    if (result) return result
  }
  return null
}

export function queryRows(db: Database, sql: string, params: SqlValue[] = []): SqlCell[][] {
  const stmt = db.prepare(sql)
  try {
    stmt.bind(params)
    const rows: SqlCell[][] = []
    while (stmt.step()) rows.push(stmt.get().map(normalizeCell))
    return rows
  } finally {
    stmt.free()
  }
}
