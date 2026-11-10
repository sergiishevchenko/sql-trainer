export type SqlCell = string | number | null

export interface ResultSet {
  columns: string[]
  rows: SqlCell[][]
  truncated: boolean
}

export interface StatementOutcome {
  sql: string
  result: ResultSet | null
  rowsAffected: number
}

export type EngineErrorCode = 'syntax' | 'forbidden' | 'timeout' | 'runtime' | 'limit' | 'internal'

export interface EngineError {
  code: EngineErrorCode
  message: string
}

export type ExecutionResult =
  | { ok: true; statements: StatementOutcome[]; durationMs: number }
  | { ok: false; error: EngineError; durationMs: number; statements?: StatementOutcome[] }

export interface ColumnInfo {
  name: string
  type: string
  primaryKey: boolean
  notNull: boolean
  references: string | null
}

export interface TableInfo {
  name: string
  description: string
  rowCount: number
  columns: ColumnInfo[]
  sample: ResultSet
}

export interface DatasetSummary {
  id: string
  title: string
  description: string
  icon: string
  tableCount: number
}

export interface DatasetSchema extends DatasetSummary {
  tables: TableInfo[]
}

export type ComparisonIssue =
  | { code: 'column_count'; expected: number; actual: number }
  | { code: 'column_names'; expected: string[]; actual: string[] }
  | { code: 'row_count'; expected: number; actual: number }
  | { code: 'values'; row: number }
  | { code: 'order' }
  | { code: 'no_result' }
  | { code: 'state_mismatch' }

export interface ComparisonResult {
  equal: boolean
  issue?: ComparisonIssue
}
