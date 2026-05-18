import { getBearerToken, verifyToken } from './token.mjs'

export function requireAuth(req, res) {
  const auth = verifyToken(getBearerToken(req))
  if (!auth?.userId) {
    res.status(401).json({ error: 'unauthorized', message: 'Потрібен вхід' })
    return null
  }
  return auth
}
