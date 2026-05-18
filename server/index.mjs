import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { initDatabase, getDb, getInitError } from './database.mjs'
import { runMigrations } from './migrate.mjs'
import * as lookupRepository from './repositories/lookupRepository.mjs'
import * as productRepository from './repositories/productRepository.mjs'
import * as favoritesRepository from './repositories/favoritesRepository.mjs'
import { registerAuthRoutes } from './auth/authRoutes.mjs'
import { requireAuth } from './auth/requireAuth.mjs'
import { ensureSeedUsers } from './seedAuth.mjs'
import { registerProductImageRoute } from './productImages.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const distDir = path.join(rootDir, 'dist')
const publicDir = path.join(rootDir, 'public')

const port = Number.parseInt(process.env.PORT || '3001', 10)
const isProduction = process.env.NODE_ENV === 'production'

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

app.get('/api/favorites', (req, res) => {
  try {
    getDb()
  } catch (err) {
    return sendDbError(res, err)
  }
  const auth = requireAuth(req, res)
  if (!auth) return
  const productIds = favoritesRepository.getFavoriteProductIds(auth.userId)
  res.json({ productIds })
})

app.post('/api/favorites/:productId/toggle', (req, res) => {
  try {
    getDb()
  } catch (err) {
    return sendDbError(res, err)
  }
  const auth = requireAuth(req, res)
  if (!auth) return
  const result = favoritesRepository.toggleFavorite(auth.userId, req.params.productId)
  res.json(result)
})

function registerFrontend() {
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir, { index: false }))
    const indexHtml = path.join(distDir, 'index.html')
    app.use((req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next()
      if (req.path.startsWith('/api')) return next()
      if (path.extname(req.path)) return next()
      res.sendFile(indexHtml, (err) => {
        if (err) next(err)
      })
    })
    return
  }

  if (!isProduction && fs.existsSync(publicDir)) {
    app.use(express.static(publicDir))
    console.warn(
      'Папка dist/ відсутня — для продакшену виконайте npm run build. Зараз лише public/.',
    )
    return
  }

  console.warn(
    'Папка dist/ відсутня. Зберіть фронтенд: npm run build (обов’язково для Render).',
  )
}

registerFrontend()

async function start() {
  try {
    await initDatabase()
    runMigrations()
    ensureSeedUsers()
    console.log('База даних готова.')
  } catch (e) {
    console.error('Не вдалося ініціалізувати БД:', e)
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Сервер: http://0.0.0.0:${port} (${isProduction ? 'production' : 'development'})`)
  })
}

start()
