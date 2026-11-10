import type { ExecutionResult } from './engine'

export interface PlaygroundRunResult {
  execution: ExecutionResult
  databaseReset: boolean
}

export interface QueryHistoryItem {
  id: number
  dataset: string
  sql: string
  executedAt: number
  success: boolean
  rowCount: number
  durationMs: number
  error: string | null
}
