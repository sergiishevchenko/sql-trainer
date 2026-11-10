import path from 'node:path'
import initSqlJs from 'sql.js'
import { DatasetStore } from '../../src/main/engine/datasets'
import { InProcessExecutor } from '../../src/main/engine/executor'
import { JobProcessor } from '../../src/main/engine/jobs'
import { SqlEngine } from '../../src/main/engine/sql-engine'
import { loadCatalog, type Catalog } from '../../src/main/content/loader'
import { GradingService } from '../../src/main/services/grading.service'

export const CONTENT_DIR = path.resolve(__dirname, '../../data')

export interface ContentFixture {
  store: DatasetStore
  engine: SqlEngine
  grading: GradingService
  catalog: Catalog
}

export async function loadContentFixture(): Promise<ContentFixture> {
  const SQL = await initSqlJs()
  const datasetsDir = path.join(CONTENT_DIR, 'datasets')
  const store = new DatasetStore(SQL, datasetsDir)
  const engine = new SqlEngine(new InProcessExecutor(new JobProcessor(new DatasetStore(SQL, datasetsDir))), store)
  const tables = new Map(store.ids().map((id) => [id, new Set(store.describe(id).tables.map((t) => t.name))]))
  const catalog = loadCatalog({ contentDir: CONTENT_DIR, datasetIds: store.ids() }, tables)
  return { store, engine, grading: new GradingService(engine), catalog }
}
