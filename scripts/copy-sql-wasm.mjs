import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const src = path.join(root, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm')
const dest = path.join(root, 'server', 'sql-wasm.wasm')

if (!fs.existsSync(src)) {
  console.warn('[postinstall] sql-wasm.wasm не знайдено в node_modules — пропускаємо копіювання')
  process.exit(0)
}

fs.copyFileSync(src, dest)
console.log('[postinstall] sql-wasm.wasm скопійовано в server/')
