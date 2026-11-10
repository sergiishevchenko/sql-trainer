import { and, desc, eq, lt } from 'drizzle-orm'
import type { DatasetSchema, DatasetSummary } from '@shared/types/engine'
import type { PlaygroundRunResult, QueryHistoryItem } from '@shared/types/playground'
import type { AppDatabase } from '../database/connection'
import { queryHistory } from '../database/schema'
import { notFound } from '../errors'
import type { SqlEngine } from '../engine/sql-engine'

const HISTORY_LIMIT_PER_USER = 500

/**
 * Free-form SQL sandbox on demo datasets. Each user gets a private in-memory copy per dataset.
 */
export class PlaygroundService {
  constructor(
    private readonly db: AppDatabase,
    private readonly engine: SqlEngine,
    private readonly now: () => number = Date.now
  ) {}

  private key(userId: string, dataset: string): string {
    return `${userId}:${dataset}`
  }

  private assertDataset(dataset: string): void {
    if (!this.engine.datasets.has(dataset)) throw notFound('dataset')
  }

  datasets(): DatasetSummary[] {
    return this.engine.datasets.ids().map((id) => this.engine.datasets.summary(id))
  }

  schema(dataset: string): DatasetSchema {
    this.assertDataset(dataset)
    return this.engine.datasets.describe(dataset)
  }

  async run(userId: string, dataset: string, sql: string): Promise<PlaygroundRunResult> {
    this.assertDataset(dataset)
    const { execution, databaseReset } = await this.engine.playground(this.key(userId, dataset), dataset, sql)
    const last = execution.ok ? [...execution.statements].reverse().find((s) => s.result) : undefined
    this.db.write((orm) => {
      orm
        .insert(queryHistory)
        .values({
          userId,
          dataset,
          sql: sql.slice(0, 20000),
          executedAt: this.now(),
          success: execution.ok,
          rowCount: last?.result?.rows.length ?? 0,
          durationMs: Math.round(execution.durationMs),
          error: execution.ok ? null : execution.error.message
        })
        .run()
      const overflow = orm
        .select({ id: queryHistory.id })
        .from(queryHistory)
        .where(eq(queryHistory.userId, userId))
        .orderBy(desc(queryHistory.id))
        .limit(1)
        .offset(HISTORY_LIMIT_PER_USER)
        .get()
      if (overflow) orm.delete(queryHistory).where(and(eq(queryHistory.userId, userId), lt(queryHistory.id, overflow.id))).run()
    })
    return { execution, databaseReset }
  }

  async reset(userId: string, dataset: string): Promise<void> {
    this.assertDataset(dataset)
    await this.engine.resetPlayground(this.key(userId, dataset))
  }

  history(userId: string, dataset: string | undefined, limit: number): QueryHistoryItem[] {
    const where = dataset
      ? and(eq(queryHistory.userId, userId), eq(queryHistory.dataset, dataset))
      : eq(queryHistory.userId, userId)
    return this.db.orm
      .select()
      .from(queryHistory)
      .where(where)
      .orderBy(desc(queryHistory.id))
      .limit(limit)
      .all()
  }

  clearHistory(userId: string): void {
    this.db.write((orm) => orm.delete(queryHistory).where(eq(queryHistory.userId, userId)).run())
  }
}
