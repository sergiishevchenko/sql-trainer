import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'

export function contentDir(): string {
  if (process.env.SQL_MASTERY_CONTENT_DIR) return process.env.SQL_MASTERY_CONTENT_DIR
  if (app.isPackaged) return path.join(process.resourcesPath, 'data')
  let dir = app.getAppPath()
  for (let depth = 0; depth < 4; depth += 1) {
    const candidate = path.join(dir, 'data')
    if (fs.existsSync(path.join(candidate, 'curriculum.json'))) return candidate
    dir = path.dirname(dir)
  }
  return path.join(app.getAppPath(), 'data')
}

export function databasePath(): string {
  return path.join(app.getPath('userData'), 'sql-mastery.db')
}

export function userContentDir(): string {
  return path.join(app.getPath('userData'), 'content', 'exercises')
}

export function sqlWasmPath(): string {
  const resolved = require.resolve('sql.js/dist/sql-wasm.wasm')
  const unpacked = resolved.replace(`app.asar${path.sep}`, `app.asar.unpacked${path.sep}`)
  return fs.existsSync(unpacked) ? unpacked : resolved
}

export function workerScriptPath(): string {
  return path.join(__dirname, 'engine-worker.js')
}
