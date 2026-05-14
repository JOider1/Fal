import bcrypt from 'bcryptjs'
import { getDb } from '../database.mjs'
import { queryGet } from '../query.mjs'
import { findUserByUsername } from '../repositories/userRepository.mjs'
import { getBearerToken, signToken, verifyToken } from './token.mjs'

function sendDbError(res, err) {
  const message =
    err?.message === 'Database_not_initialized'
      ? 'База даних не ініціалізована.'
      : err?.message || 'Немає доступу до бази даних'
  return res.status(503).json({
    error: 'database_unavailable',
    message,
  })
}

export function registerAuthRoutes(app) {
  app.post('/api/auth/login', (req, res) => {
    try {
      getDb()
    } catch (err) {
      return sendDbError(res, err)
    }
    const username = req.body?.username
    const password = req.body?.password
    const row = findUserByUsername(username)
    if (!row || !bcrypt.compareSync(String(password ?? ''), row.password_hash)) {
      return res.status(401).json({
        error: 'invalid_credentials',
        message: 'Невірний логін або пароль',
      })
    }
    const token = signToken({
      userId: row.id,
      username: row.username,
      role: row.role,
    })
    return res.json({
      token,
      user: { id: row.id, username: row.username, role: row.role },
    })
  })

  app.get('/api/auth/me', (req, res) => {
    try {
      getDb()
    } catch (err) {
      return sendDbError(res, err)
    }
    const raw = getBearerToken(req)
    const auth = verifyToken(raw)
    if (!auth) {
      return res.status(401).json({ error: 'unauthorized', message: 'Потрібен вхід' })
    }
    return res.json({
      user: { id: auth.userId, username: auth.username, role: auth.role },
    })
  })

  app.get('/api/admin/summary', (req, res) => {
    try {
      getDb()
    } catch (err) {
      return sendDbError(res, err)
    }
    const auth = verifyToken(getBearerToken(req))
    if (!auth || auth.role !== 'admin') {
      return res.status(403).json({
        error: 'forbidden',
        message: 'Доступ лише для адміністратора',
      })
    }
    const db = getDb()
    const pc = queryGet(db, `SELECT COUNT(*) AS c FROM products`)
    const bc = queryGet(db, `SELECT COUNT(*) AS c FROM brands`)
    const uc = queryGet(db, `SELECT COUNT(*) AS c FROM users`)
    return res.json({
      productCount: Number(pc?.c) || 0,
      brandCount: Number(bc?.c) || 0,
      userCount: Number(uc?.c) || 0,
    })
  })
}
