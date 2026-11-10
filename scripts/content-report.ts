/**
 * Prints the real size of the bundled content catalog: exercises per level, module and type,
 * plus every validation issue. Exits with code 1 when the catalog has issues.
 */
import path from 'node:path'
import initSqlJs from 'sql.js'
import { EXERCISE_TYPES, LEVEL_IDS } from '@shared/constants/domain'
import { loadCatalog } from '../src/main/content/loader'
import { DatasetStore } from '../src/main/engine/datasets'

const LEVEL_TARGETS: Record<string, number> = {
  beginner: 120,
  fundamentals: 120,
  intermediate: 120,
  advanced: 100,
  expert: 40
}

async function main(): Promise<void> {
  const contentDir = path.resolve(__dirname, '../data')
  const SQL = await initSqlJs()
  const store = new DatasetStore(SQL, path.join(contentDir, 'datasets'))
  const tables = new Map(store.ids().map((id) => [id, new Set(store.describe(id).tables.map((t) => t.name))]))
  const catalog = loadCatalog({ contentDir, datasetIds: store.ids() }, tables)

  const total = catalog.exercises.length
  const target = Object.values(LEVEL_TARGETS).reduce((a, b) => a + b, 0)
  console.log(`Exercises: ${total} / ${target}`)

  for (const level of catalog.levels) {
    const count = catalog.exercises.filter((e) => e.level === level.id).length
    console.log(`\n${level.id}: ${count} / ${LEVEL_TARGETS[level.id] ?? '?'}`)
    for (const module of level.modules) {
      const n = catalog.exercises.filter((e) => e.module === module.id).length
      console.log(`  ${module.id.padEnd(32)} ${String(n).padStart(3)}`)
    }
  }

  console.log('\nBy type:')
  for (const type of EXERCISE_TYPES) {
    console.log(`  ${type.padEnd(16)} ${catalog.exercises.filter((e) => e.type === type).length}`)
  }
  console.log(`\nProjects: ${catalog.projects.length}`)
  console.log(`Datasets: ${store.ids().join(', ')}`)

  const missingLevels = LEVEL_IDS.filter((l) => !catalog.exercises.some((e) => e.level === l))
  if (missingLevels.length > 0) console.log(`\nLevels without exercises: ${missingLevels.join(', ')}`)

  if (catalog.issues.length > 0) {
    console.log(`\nIssues (${catalog.issues.length}):`)
    for (const issue of catalog.issues) {
      console.log(`  ${issue.file}${issue.exerciseId ? ` [${issue.exerciseId}]` : ''}: ${issue.message}`)
    }
    process.exitCode = 1
  }
}

void main()
