import { ENGINE_LIMITS } from '@shared/constants/domain'
import type { ExecutionResult } from '@shared/types/engine'
import type { DatasetStore } from './datasets'
import type { SqlExecutor } from './executor'
import { guardSql, PLAYGROUND_POLICY, type SqlPolicy } from './guard'
import type { EvaluateProgram, JobResponse, ProgramOutcome } from './jobs'

/**
 * Facade over the isolated training SQL engine. Never touches the application database.
 */
export class SqlEngine {
  private readonly playgroundGenerations = new Map<string, number>()

  constructor(
    private readonly executor: SqlExecutor,
    readonly datasets: DatasetStore
  ) {}

  async execute(
    dataset: string,
    sql: string,
    policy: SqlPolicy,
    setup: string[] = []
  ): Promise<JobResponse<ProgramOutcome>> {
    const guard = guardSql(sql, policy)
    if (!guard.ok) return { ok: false, error: guard.error }
    return this.executor.run(
      { type: 'execute', dataset, setup, sql, maxRows: ENGINE_LIMITS.maxRows },
      ENGINE_LIMITS.queryTimeoutMs
    )
  }

  async evaluate(dataset: string, scenarios: string[][], programs: EvaluateProgram[]): Promise<JobResponse<ProgramOutcome[][]>> {
    const budget = Math.min(
      ENGINE_LIMITS.evaluateTimeoutMs * 2,
      ENGINE_LIMITS.evaluateTimeoutMs + scenarios.length * programs.length * 250
    )
    return this.executor.run(
      { type: 'evaluate', dataset, scenarios, programs, maxRows: ENGINE_LIMITS.maxRows },
      budget
    )
  }

  async playground(key: string, dataset: string, sql: string): Promise<{ execution: ExecutionResult; databaseReset: boolean }> {
    const guard = guardSql(sql, PLAYGROUND_POLICY)
    if (!guard.ok) return { execution: { ok: false, error: guard.error, durationMs: 0 }, databaseReset: false }
    const known = this.playgroundGenerations.get(key)
    const databaseReset = known !== undefined && known !== this.executor.generation
    const response = await this.executor.run(
      { type: 'playground', key, dataset, sql, maxRows: ENGINE_LIMITS.maxRows },
      ENGINE_LIMITS.queryTimeoutMs
    )
    if (!response.ok) {
      this.playgroundGenerations.delete(key)
      return { execution: { ok: false, error: response.error, durationMs: ENGINE_LIMITS.queryTimeoutMs }, databaseReset }
    }
    this.playgroundGenerations.set(key, this.executor.generation)
    return { execution: response.result, databaseReset }
  }

  async resetPlayground(key: string): Promise<void> {
    this.playgroundGenerations.delete(key)
    await this.executor.run({ type: 'playground_reset', key }, ENGINE_LIMITS.queryTimeoutMs)
  }

  dispose(): Promise<void> {
    return this.executor.dispose()
  }
}
