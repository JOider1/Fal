import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

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
    const hit = findImageFile(id)
    if (hit) {
      res.setHeader('Content-Type', MIME[hit.ext] ?? 'application/octet-stream')
      res.setHeader('Cache-Control', 'public, max-age=3600')
      return res.sendFile(hit.fp)
    }
    const fallback = findImageFile('placeholder')
    if (fallback) {
      res.setHeader('Content-Type', MIME[fallback.ext])
      return res.sendFile(fallback.fp)
    }
    return res.status(404).end()
  })
}
