import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const productImagesDir = path.resolve(__dirname, '..', 'public', 'images', 'products')

const EXT_ORDER = ['.jpg', '.jpeg', '.png', '.webp', '.svg']

const MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
}

function safeImagePath(id, ext) {
  const base = path.resolve(productImagesDir)
  const fp = path.resolve(productImagesDir, `${id}${ext}`)
  if (!fp.startsWith(base + path.sep) && fp !== base) return null
  return fp
}

export function registerProductImageRoute(app) {
  app.get('/api/product-images/:id', (req, res) => {
    const id = String(req.params.id ?? '')
    if (!/^\d+$/.test(id)) {
      return res.status(400).end()
    }
    for (const ext of EXT_ORDER) {
      const fp = safeImagePath(id, ext)
      if (fp && fs.existsSync(fp)) {
        res.setHeader('Content-Type', MIME[ext] ?? 'application/octet-stream')
        res.setHeader('Cache-Control', 'public, max-age=3600')
        return res.sendFile(fp)
      }
    }
    const fallback = safeImagePath('placeholder', '.svg')
    if (fallback && fs.existsSync(fallback)) {
      res.setHeader('Content-Type', MIME['.svg'])
      return res.sendFile(fallback)
    }
    return res.status(404).end()
  })
}
