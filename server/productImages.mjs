import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getProductImageData } from './repositories/productRepository.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

const EXT_ORDER = ['.jpg', '.jpeg', '.png', '.webp', '.svg']

const MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
}

function imageDirs() {
  const dirs = [
    path.join(rootDir, 'public', 'images', 'products'),
    path.join(rootDir, 'dist', 'images', 'products'),
  ]
  return dirs.filter((d) => fs.existsSync(d))
}

function safeImagePath(baseDir, id, ext) {
  const base = path.resolve(baseDir)
  const fp = path.resolve(baseDir, `${id}${ext}`)
  if (!fp.startsWith(base + path.sep) && fp !== base) return null
  return fp
}

function findImageFile(id) {
  for (const dir of imageDirs()) {
    for (const ext of EXT_ORDER) {
      const fp = safeImagePath(dir, id, ext)
      if (fp && fs.existsSync(fp)) return { fp, ext }
    }
  }
  return null
}

export function registerProductImageRoute(app) {
  app.get('/api/product-images/:id', (req, res) => {
    const id = String(req.params.id ?? '')
    if (!/^\d+$/.test(id) && id !== 'placeholder') {
      return res.status(400).end()
    }

    // 1) Зображення, завантажене через адмінпанель (зберігається в БД як data-URL)
    if (id !== 'placeholder') {
      try {
        const dataUrl = getProductImageData(id)
        const m = /^data:([^;,]+);base64,(.+)$/s.exec(dataUrl || '')
        if (m) {
          res.setHeader('Content-Type', m[1])
          res.setHeader('Cache-Control', 'no-cache')
          return res.end(Buffer.from(m[2], 'base64'))
        }
      } catch {
        /* БД може бути недоступна — переходимо до файлів */
      }
    }

    // 2) Файл із public/images/products
    const hit = findImageFile(id)
    if (hit) {
      res.setHeader('Content-Type', MIME[hit.ext] ?? 'application/octet-stream')
      // no-cache: браузер кешує, але щоразу ревалідує (ETag від sendFile),
      // тож оновлене фото показується одразу, а не за годину
      res.setHeader('Cache-Control', 'no-cache')
      return res.sendFile(hit.fp)
    }

    // 3) Зображення-заглушка за замовчуванням
    const fallback = findImageFile('placeholder')
    if (fallback) {
      res.setHeader('Content-Type', MIME[fallback.ext])
      return res.sendFile(fallback.fp)
    }
    return res.status(404).end()
  })
}
