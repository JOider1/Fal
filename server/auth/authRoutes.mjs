import bcrypt from 'bcryptjs'
import { getDb } from '../database.mjs'
import { queryGet } from '../query.mjs'
import { createUser, findUserByUsername } from '../repositories/userRepository.mjs'
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
  app.post('/api/auth/register', (req, res) => {
    try {
      getDb()
    } catch (err) {
      return sendDbError(res, err)
    }
    const username = String(req.body?.username ?? '').trim()
    const password = String(req.body?.password ?? '')
    if (username.length < 3) {
      return res.status(400).json({
        error: 'invalid_username',
        message: 'Логін має містити щонайменше 3 символи',
      })
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
      return res.status(400).json({
        error: 'invalid_username',
        message: 'Логін може містити лише літери, цифри, ".", "_" та "-"',
      })
    }
    if (password.length < 6) {
      return res.status(400).json({
        error: 'invalid_password',
        message: 'Пароль має містити щонайменше 6 символів',
      })
    }
    if (findUserByUsername(username)) {
      return res.status(409).json({
        error: 'username_taken',
        message: 'Користувач з таким логіном уже існує',
      })
    }
    const created = createUser(username, password, 'user')
    if (!created) {
      return res.status(400).json({
        error: 'registration_failed',
        message: 'Не вдалося створити обліковий запис',
      })
    }
    const token = signToken({
      userId: created.id,
      username: created.username,
      role: created.role,
    })
    return res.status(201).json({
      token,
      user: { id: created.id, username: created.username, role: created.role },
    })
  })

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
