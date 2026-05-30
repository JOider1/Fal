import { getBearerToken, verifyToken } from './token.mjs'

export function requireAuth(req, res) {
  const auth = verifyToken(getBearerToken(req))
  if (!auth?.userId) {
    res.status(401).json({ error: 'unauthorized', message: 'Потрібен вхід' })
    return null
  }
  return auth
}

export function requireAdmin(req, res) {
  const auth = verifyToken(getBearerToken(req))
  if (!auth?.userId) {
    res.status(401).json({ error: 'unauthorized', message: 'Потрібен вхід' })
    return null
  }
  if (auth.role !== 'admin') {
    res.status(403).json({ error: 'forbidden', message: 'Доступ лише для адміністратора' })
    return null
  }
  return auth
}
