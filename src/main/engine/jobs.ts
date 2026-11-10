import type { Database } from 'sql.js'
import type { EngineError, ExecutionResult, ResultSet } from '@shared/types/engine'
import { executeOnDatabase, lastResultSet } from './core'
import type { DatasetStore } from './datasets'

export interface EvaluateProgram {
  sql: string
  check?: string
}

export interface ProgramOutcome {
  execution: ExecutionResult
  result: ResultSet | null
  rowsAffected: number
}

export type EngineJob =
  | { type: 'execute'; dataset: string; setup: string[]; sql: string; maxRows: number }
  | { type: 'evaluate'; dataset: string; scenarios: string[][]; programs: EvaluateProgram[]; maxRows: number }
  | { type: 'playground'; key: string; dataset: string; sql: string; maxRows: number }
  | { type: 'playground_reset'; key: string }
  | { type: 'ping' }

export interface EngineJobResults {
  execute: ProgramOutcome
  evaluate: ProgramOutcome[][]
  playground: ExecutionResult
  playground_reset: null
  ping: 'pong'
}

export type JobResponse<T> = { ok: true; result: T } | { ok: false; error: EngineError }

const MAX_PLAYGROUND_SESSIONS = 12

/**
 * Executes engine jobs against isolated in-memory databases.
 * Runs inside a worker thread in production; can also run in-process for tests.
 */
export class JobProcessor {
  private readonly playgrounds = new Map<string, Database>()

  constructor(private readonly store: DatasetStore) {}

  process(job: EngineJob): EngineJobResults[EngineJob['type']] {
    switch (job.type) {
      case 'execute':
        return this.runProgram(job.dataset, job.setup, { sql: job.sql }, job.maxRows)
      case 'evaluate':
        return job.scenarios.map((setup) => job.programs.map((p) => this.runProgram(job.dataset, setup, p, job.maxRows)))
      case 'playground':
        return this.runPlayground(job.key, job.dataset, job.sql, job.maxRows)
      case 'playground_reset': {
        this.playgrounds.get(job.key)?.close()
        this.playgrounds.delete(job.key)
        return null
      }
      case 'ping':
        return 'pong'
    }
  }

  private runProgram(dataset: string, setup: string[], program: EvaluateProgram, maxRows: number): ProgramOutcome {
    const db = this.store.open(dataset, setup)
    try {
      const execution = executeOnDatabase(db, program.sql, maxRows)
      const rowsAffected = execution.ok ? execution.statements.reduce((sum, s) => sum + s.rowsAffected, 0) : 0
      if (!execution.ok || !program.check) {
        return { execution, result: lastResultSet(execution), rowsAffected }
      }
      const check = executeOnDatabase(db, program.check, maxRows)
      return { execution: check.ok ? execution : check, result: lastResultSet(check), rowsAffected }
    } finally {
      db.close()
    }
  }

  private runPlayground(key: string, dataset: string, sql: string, maxRows: number): ExecutionResult {
    let db = this.playgrounds.get(key)
    if (!db) {
      db = this.store.open(dataset)
      this.playgrounds.set(key, db)
      if (this.playgrounds.size > MAX_PLAYGROUND_SESSIONS) {
        const oldest = this.playgrounds.keys().next().value as string
        this.playgrounds.get(oldest)?.close()
        this.playgrounds.delete(oldest)
      }
    } else {
      this.playgrounds.delete(key)
      this.playgrounds.set(key, db)
    }
    return executeOnDatabase(db, sql, maxRows)
  }
}
