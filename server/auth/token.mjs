import crypto from 'node:crypto'

const SECRET = process.env.AUTH_SECRET || 'clothing-catalog-local-dev-secret'

export function signToken({ userId, username, role }) {
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000
  const payload = Buffer.from(
    JSON.stringify({ sub: userId, username, role, exp }),
  ).toString('base64url')
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string') return null
  const dot = token.indexOf('.')
  if (dot < 1) return null
  const payload = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const expect = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url')
  const a = Buffer.from(expect, 'utf8')
  const b = Buffer.from(sig, 'utf8')
  if (a.length !== b.length) return null
  try {
    if (!crypto.timingSafeEqual(a, b)) return null
  } catch {
    return null
  }
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (typeof data.exp !== 'number' || data.exp < Date.now()) return null
    if (!data.sub || !data.role) return null
    return { userId: data.sub, username: data.username, role: data.role }
  } catch {
    return null
  }
}

export function getBearerToken(req) {
  const h = req.headers.authorization
  if (!h || typeof h !== 'string') return null
  const m = /^Bearer\s+(.+)$/i.exec(h.trim())
  return m ? m[1].trim() : null
}
