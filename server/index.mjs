import express from 'express'
import cors from 'cors'
import { initDatabase, getDb, getInitError } from './database.mjs'
import { runMigrations } from './migrate.mjs'
import * as lookupRepository from './repositories/lookupRepository.mjs'
import * as productRepository from './repositories/productRepository.mjs'
import { registerAuthRoutes } from './auth/authRoutes.mjs'
import { ensureSeedUsers } from './seedAuth.mjs'
import { registerProductImageRoute } from './productImages.mjs'

/* У підпроцесах (npm/concurrently на Windows) stdin часто «закритий»; без resume
   Node інколи завершує процес після старту HTTP, хоча сервер уже слухає порт. */
if (process.stdin.isTTY === false) {
  try {
    process.stdin.resume()
  } catch {
    /* ignore */
  }
}

const port = Number.parseInt(process.env.PORT || '3001', 10)
const app = express()

app.use(cors({ origin: true }))
app.use(express.json())

registerAuthRoutes(app)
registerProductImageRoute(app)

function sendDbError(res, err) {
  const message =
    err?.message === 'Database_not_initialized'
      ? 'База даних не ініціалізована. Перезапустіть сервер.'
      : err?.message || 'Немає доступу до бази даних'
  return res.status(503).json({
    error: 'database_unavailable',
    message,
  })
}

function routeJson(fn) {
  return (req, res) => {
    try {
      getDb()
      fn(req, res)
    } catch (err) {
      sendDbError(res, err)
    }
  }
}

app.get('/api/health', (req, res) => {
  const err = getInitError()
  if (err) {
    return sendDbError(res, err)
  }
  try {
    getDb()
    res.json({ ok: true })
  } catch (e) {
    sendDbError(res, e)
  }
})

app.get(
  '/api/brands',
  routeJson((req, res) => {
    const rows = lookupRepository.getAllBrands()
    res.json(rows.map((b) => ({ id: b.id, name: b.name })))
  }),
)

app.get(
  '/api/colors',
  routeJson((req, res) => {
    const rows = lookupRepository.getAllColors()
    res.json(rows.map((c) => ({ id: c.id, name: c.name })))
  }),
)

app.get(
  '/api/sizes',
  routeJson((req, res) => {
    const rows = lookupRepository.getAllSizes()
    res.json(rows.map((s) => ({ id: s.id, code: s.code })))
  }),
)

app.get(
  '/api/seasons',
  routeJson((req, res) => {
    const rows = lookupRepository.getAllSeasons()
    res.json(rows.map((s) => ({ id: s.id, name: s.name })))
  }),
)

app.get(
  '/api/clothing-types',
  routeJson((req, res) => {
    const rows = lookupRepository.getAllClothingTypes()
    res.json(rows.map((t) => ({ id: t.id, name: t.name })))
  }),
)

/** Окремий маршрут перед /api/products/:id, щоб не сплутати з id */
app.get(
  '/api/products/by-ids',
  routeJson((req, res) => {
    const items = productRepository.findProductsByIds(req.query.ids)
    res.json({ items })
  }),
)

app.get(
  '/api/products',
  routeJson((req, res) => {
    const data = productRepository.findProductsPage(req.query)
    res.json(data)
  }),
)

app.get(
  '/api/products/:id',
  routeJson((req, res) => {
    const product = productRepository.findProductById(req.params.id)
    if (!product) {
      return res.status(404).json({ error: 'not_found', message: 'Товар не знайдено' })
    }
    res.json(product)
  }),
)

async function start() {
  try {
    await initDatabase()
    runMigrations()
    ensureSeedUsers()
    app.listen(port, () => {
      console.log(`Catalog API: http://localhost:${port}`)
    })
  } catch (e) {
    console.error('Не вдалося ініціалізувати БД:', e)
    app.listen(port, () => {
      console.log(
        `Catalog API: http://localhost:${port} (БД недоступна — /api повертатиме 503)`,
      )
    })
  }
}

start()
