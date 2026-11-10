import path from 'node:path'
import { AppDatabase, loadSqlJs } from './database/connection'
import { runMigrations, type MigrationReport } from './database/migrate'
import { loadCatalog, type Catalog } from './content/loader'
import { DatasetStore } from './engine/datasets'
import { InProcessExecutor, type SqlExecutor } from './engine/executor'
import { JobProcessor } from './engine/jobs'
import { SqlEngine } from './engine/sql-engine'
import { AchievementsService } from './services/achievements.service'
import { AssessmentService } from './services/assessment.service'
import { AuthService } from './services/auth.service'
import { CatalogService } from './services/catalog.service'
import { GradingService } from './services/grading.service'
import { PlaygroundService } from './services/playground.service'
import { ProgressService } from './services/progress.service'
import { MemoryTokenStore, SessionManager, type TokenStore } from './services/session'
import { StatsService } from './services/stats.service'
import { UsersService } from './services/users.service'

export interface AppContextOptions {
  databasePath: string | null
  contentDir: string
  extraExerciseDirs?: string[]
  wasmPath?: string
  executorFactory?: (datasetsDir: string) => SqlExecutor
  tokenStore?: TokenStore
  now?: () => number
}

export interface AppContext {
  db: AppDatabase
  engine: SqlEngine
  catalog: Catalog
  migration: MigrationReport
  session: SessionManager
  users: UsersService
  auth: AuthService
  catalogService: CatalogService
  grading: GradingService
  progress: ProgressService
  achievements: AchievementsService
  assessments: AssessmentService
  stats: StatsService
  playground: PlaygroundService
  close(): Promise<void>
}

/**
 * Composition root: opens the application database, applies migrations, loads and imports
 * the content catalog and wires up all services.
 */
export async function createAppContext(options: AppContextOptions): Promise<AppContext> {
  const now = options.now ?? Date.now
  const SQL = await loadSqlJs(options.wasmPath)
  const db = await AppDatabase.open({ filePath: options.databasePath, wasmPath: options.wasmPath })
  const migration = runMigrations(db)

  const datasetsDir = path.join(options.contentDir, 'datasets')
  const datasets = new DatasetStore(SQL, datasetsDir)
  const executor = options.executorFactory
    ? options.executorFactory(datasetsDir)
    : new InProcessExecutor(new JobProcessor(new DatasetStore(SQL, datasetsDir)))
  const engine = new SqlEngine(executor, datasets)

  const datasetTables = new Map(datasets.ids().map((id) => [id, new Set(datasets.describe(id).tables.map((t) => t.name))]))
  const catalog = loadCatalog(
    { contentDir: options.contentDir, datasetIds: datasets.ids(), extraExerciseDirs: options.extraExerciseDirs },
    datasetTables
  )

  const session = new SessionManager()
  const users = new UsersService(db, now)
  const auth = new AuthService(db, session, options.tokenStore ?? new MemoryTokenStore(), users, now)
  const grading = new GradingService(engine)
  const catalogService = new CatalogService(db, catalog, datasets, (ex) => grading.hiddenTestCount(ex), now)
  catalogService.importToDatabase()
  const achievements = new AchievementsService(db, catalog, now)
  const progress = new ProgressService(db, catalogService, grading, achievements, users, now)
  const assessments = new AssessmentService(db, catalogService, progress, achievements, now)
  const stats = new StatsService(db, catalogService, users, progress, achievements, assessments, now)
  const playground = new PlaygroundService(db, engine, now)

  return {
    db,
    engine,
    catalog,
    migration,
    session,
    users,
    auth,
    catalogService,
    grading,
    progress,
    achievements,
    assessments,
    stats,
    playground,
    async close() {
      await engine.dispose()
      db.close()
    }
  }
}
