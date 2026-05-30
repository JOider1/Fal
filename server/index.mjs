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
import { requireAdmin } from './auth/requireAuth.mjs'
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
app.use(express.json({ limit: '8mb' }))

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

// ---- Адмінпанель: керування товарами (лише роль admin) ----

function adminRoute(fn) {
  return (req, res) => {
    try {
      getDb()
    } catch (err) {
      return sendDbError(res, err)
    }
    const auth = requireAdmin(req, res)
    if (!auth) return
    try {
      fn(req, res)
    } catch (err) {
      if (err?.userMessage) {
        return res.status(400).json({ error: 'invalid_input', message: err.userMessage })
      }
      console.error('Помилка адмін-операції:', err)
      return res.status(500).json({ error: 'server_error', message: 'Внутрішня помилка сервера.' })
    }
  }
}

app.post(
  '/api/admin/products',
  adminRoute((req, res) => {
    const product = productRepository.createProduct(req.body)
    res.status(201).json(product)
  }),
)

app.put(
  '/api/admin/products/:id',
  adminRoute((req, res) => {
    const product = productRepository.updateProduct(req.params.id, req.body)
    if (!product) {
      return res.status(404).json({ error: 'not_found', message: 'Товар не знайдено' })
    }
    res.json(product)
  }),
)

app.delete(
  '/api/admin/products/:id',
  adminRoute((req, res) => {
    const ok = productRepository.deleteProduct(req.params.id)
    if (!ok) {
      return res.status(404).json({ error: 'not_found', message: 'Товар не знайдено' })
    }
    res.json({ deleted: true })
  }),
)

app.post(
  '/api/admin/products/:id/image',
  adminRoute((req, res) => {
    const dataUrl = String(req.body?.dataUrl ?? '')
    const m = /^data:(image\/(png|jpeg|jpg|webp|svg\+xml));base64,/.exec(dataUrl)
    if (!m) {
      return res
        .status(400)
        .json({ error: 'invalid_image', message: 'Підтримуються лише зображення PNG, JPEG, WEBP або SVG.' })
    }
    // обмеження розміру (~5 МБ після декодування)
    const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
    if (Buffer.byteLength(base64, 'base64') > 5 * 1024 * 1024) {
      return res
        .status(400)
        .json({ error: 'too_large', message: 'Розмір зображення не має перевищувати 5 МБ.' })
    }
    const product = productRepository.setProductImage(req.params.id, dataUrl)
    if (!product) {
      return res.status(404).json({ error: 'not_found', message: 'Товар не знайдено' })
    }
    res.json(product)
  }),
)

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
