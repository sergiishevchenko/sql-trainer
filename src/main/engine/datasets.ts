import fs from 'node:fs'
import path from 'node:path'
import type { Database, SqlJsStatic } from 'sql.js'
import { datasetMetaSchema, type DatasetMeta } from '@shared/schemas/content'
import type { ColumnInfo, DatasetSchema, DatasetSummary, TableInfo } from '@shared/types/engine'
import { queryRows } from './core'

interface DatasetFiles {
  meta: DatasetMeta
  schemaSql: string
  seedSql: string
  hiddenSql: string | null
}

const SAMPLE_ROWS = 5

/**
 * Loads training datasets from disk (data/datasets/<id>/) and serves isolated
 * in-memory copies built from a cached binary image.
 */
export class DatasetStore {
  private readonly files = new Map<string, DatasetFiles>()
  private readonly images = new Map<string, Uint8Array>()
  private readonly schemas = new Map<string, DatasetSchema>()

  constructor(
    private readonly SQL: SqlJsStatic,
    private readonly datasetsDir: string
  ) {
    this.scan()
  }

  private scan(): void {
    if (!fs.existsSync(this.datasetsDir)) return
    for (const entry of fs.readdirSync(this.datasetsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const dir = path.join(this.datasetsDir, entry.name)
      const metaPath = path.join(dir, 'meta.json')
      if (!fs.existsSync(metaPath)) continue
      const meta = datasetMetaSchema.parse(JSON.parse(fs.readFileSync(metaPath, 'utf8')))
      const read = (name: string) => {
        const p = path.join(dir, name)
        return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null
      }
      this.files.set(meta.id, {
        meta,
        schemaSql: read('schema.sql') ?? '',
        seedSql: read('seed.sql') ?? '',
        hiddenSql: read('hidden.sql')
      })
    }
  }

  ids(): string[] {
    return [...this.files.keys()].sort()
  }

  has(id: string): boolean {
    return this.files.has(id)
  }

  meta(id: string): DatasetMeta {
    const files = this.files.get(id)
    if (!files) throw new Error(`Unknown dataset: ${id}`)
    return files.meta
  }

  hiddenSetup(id: string): string | null {
    return this.files.get(id)?.hiddenSql ?? null
  }

  image(id: string): Uint8Array {
    let image = this.images.get(id)
    if (!image) {
      const files = this.files.get(id)
      if (!files) throw new Error(`Unknown dataset: ${id}`)
      const db = new this.SQL.Database()
      try {
        db.exec(files.schemaSql)
        db.exec(files.seedSql)
        image = db.export()
      } finally {
        db.close()
      }
      this.images.set(id, image)
    }
    return image
  }

  open(id: string, setup: string[] = []): Database {
    const db = new this.SQL.Database(this.image(id))
    db.run('PRAGMA foreign_keys = ON')
    for (const script of setup) db.exec(script)
    return db
  }

  summary(id: string): DatasetSummary {
    const meta = this.meta(id)
    return {
      id: meta.id,
      title: meta.title,
      description: meta.description,
      icon: meta.icon,
      tableCount: this.describe(id).tables.length
    }
  }

  describe(id: string): DatasetSchema {
    const cached = this.schemas.get(id)
    if (cached) return cached
    const meta = this.meta(id)
    const db = this.open(id)
    try {
      const tableNames = queryRows(
        db,
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY rowid"
      ).map((r) => String(r[0]))
      const tables: TableInfo[] = tableNames.map((name) => {
        const quoted = `"${name.replace(/"/g, '""')}"`
        const fks = new Map<string, string>()
        for (const fk of queryRows(db, `SELECT "from", "table", "to" FROM pragma_foreign_key_list(?)`, [name])) {
          fks.set(String(fk[0]), `${fk[1]}.${fk[2]}`)
        }
        const columns: ColumnInfo[] = queryRows(db, 'SELECT name, type, "notnull", pk FROM pragma_table_info(?)', [name]).map(
          (c) => ({
            name: String(c[0]),
            type: String(c[1] || 'ANY'),
            notNull: Number(c[2]) === 1,
            primaryKey: Number(c[3]) > 0,
            references: fks.get(String(c[0])) ?? null
          })
        )
        const rowCount = Number(queryRows(db, `SELECT COUNT(*) FROM ${quoted}`)[0][0])
        const sampleRows = queryRows(db, `SELECT * FROM ${quoted} LIMIT ${SAMPLE_ROWS}`)
        return {
          name,
          description: meta.tables[name] ?? '',
          rowCount,
          columns,
          sample: { columns: columns.map((c) => c.name), rows: sampleRows, truncated: rowCount > SAMPLE_ROWS }
        }
      })
      const schema: DatasetSchema = {
        id: meta.id,
        title: meta.title,
        description: meta.description,
        icon: meta.icon,
        tableCount: tables.length,
        tables
      }
      this.schemas.set(id, schema)
      return schema
    } finally {
      db.close()
    }
  }
}
