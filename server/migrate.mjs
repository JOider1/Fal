import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getDb, persistDatabase } from './database.mjs'
import { queryGet, queryRun } from './query.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const migrationsDir = path.join(__dirname, 'migrations')

function listMigrationFiles() {
  return fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
}

function migrationApplied(db, filename) {
  try {
    const row = queryGet(
      db,
      `SELECT 1 AS ok FROM schema_migrations WHERE filename = ?`,
      [filename],
    )
    return Boolean(row?.ok)
  } catch {
    return false
  }
}

export function runMigrations() {
  const db = getDb()
  const files = listMigrationFiles()
  for (const file of files) {
    if (migrationApplied(db, file)) continue
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
    db.exec(sql)
    queryRun(db, `INSERT INTO schema_migrations (filename) VALUES (?)`, [file])
    persistDatabase()
  }
}
