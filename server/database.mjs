import initSqlJs from 'sql.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Коренева папка проєкту
const rootDir = path.resolve(__dirname, '..')

// Шлях до папки з базою даних
export const dataDir = path.join(rootDir, 'data')
export const dbPath = path.join(dataDir, 'catalog.db')

// ШЛЯХ ОНОВЛЕНО: Тепер беремо файл безпосередньо з папки server/
const wasmPath = path.join(__dirname, 'sql-wasm.wasm')

let dbInstance = null
let initError = null

export function getInitError() {
  return initError
}

export async function initDatabase() {
  if (dbInstance) return dbInstance
  if (initError) throw initError
  try {
    // Автоматично створюємо папку data, якщо вона відсутня
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }

    // Перевіряємо наявність WASM файлу
    if (!fs.existsSync(wasmPath)) {
      throw new Error(`Файл sql-wasm.wasm не знайдено за шляхом: ${wasmPath}`)
    }

    const wasmBinary = fs.readFileSync(wasmPath)
    const SQL = await initSqlJs({ wasmBinary })

    if (fs.existsSync(dbPath)) {
      const buf = fs.readFileSync(dbPath)
      dbInstance = new SQL.Database(new Uint8Array(buf))
    } else {
      // Якщо файлу бази немає, створюємо новий пустий екземпляр
      dbInstance = new SQL.Database()
    }
    return dbInstance
  } catch (e) {
    initError = e
    console.error('Помилка ініціалізації бази даних у файлі database.mjs:', e)
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