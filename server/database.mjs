import initSqlJs from 'sql.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, '..')
export const dataDir = path.join(rootDir, 'data')
export const dbPath = path.join(dataDir, 'catalog.db')
const wasmPath = path.join(rootDir, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm')

let dbInstance = null
let initError = null

export function getInitError() {
  return initError
}

export async function initDatabase() {
  if (dbInstance) return dbInstance
  if (initError) throw initError
  try {
    const wasmBinary = fs.readFileSync(wasmPath)
    const SQL = await initSqlJs({ wasmBinary })
    if (fs.existsSync(dbPath)) {
      const buf = fs.readFileSync(dbPath)
      dbInstance = new SQL.Database(new Uint8Array(buf))
    } else {
      dbInstance = new SQL.Database()
    }
    return dbInstance
  } catch (e) {
    initError = e
    throw e
  }
}

export function getDb() {
  if (!dbInstance) throw new Error('Database_not_initialized')
  return dbInstance
}

export function persistDatabase() {
  if (!dbInstance) return
  const data = dbInstance.export()
  fs.mkdirSync(dataDir, { recursive: true })
  fs.writeFileSync(dbPath, Buffer.from(data))
}
