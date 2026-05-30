// Приводить текст бренду та aria-label у SVG-зображеннях товарів у відповідність
// до фактичного бренду товару в БД. Запуск одноразовий: node scripts/fix-product-svgs.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { initDatabase, getDb } from '../server/database.mjs'
import { runMigrations } from '../server/migrate.mjs'
import { queryAll } from '../server/query.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const productsDir = path.join(__dirname, '..', 'public', 'images', 'products')

const escapeXml = (s) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

async function main() {
  await initDatabase()
  runMigrations()
  const rows = queryAll(
    getDb(),
    'SELECT p.id, p.name, b.name AS brand FROM products p JOIN brands b ON b.id = p.brand_id ORDER BY p.id',
  )

  let changed = 0
  for (const { id, name, brand } of rows) {
    const fp = path.join(productsDir, `${id}.svg`)
    if (!fs.existsSync(fp)) continue
    const original = fs.readFileSync(fp, 'utf8')
    const updated = original
      .replace(/aria-label="[^"]*"/, `aria-label="${escapeXml(name)}"`)
      .replace(/(letter-spacing="1">)[^<]*(<\/text>)/, `$1${escapeXml(brand)}$2`)
    if (updated !== original) {
      fs.writeFileSync(fp, updated)
      changed += 1
    }
    console.log(`${id}\t${brand}\t${name}`)
  }
  console.log(`Оновлено SVG: ${changed} з ${rows.length}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
