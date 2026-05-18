import bcrypt from 'bcryptjs'
import { getDb, persistDatabase } from '../database.mjs'
import { queryGet, queryRun } from '../query.mjs'

export function findUserByUsername(username) {
  const db = getDb()
  const u = String(username || '').trim().toLowerCase()
  if (!u) return null
  return queryGet(
    db,
    `SELECT id, username, password_hash AS password_hash, role FROM users WHERE lower(username) = ?`,
    [u],
  )
}

export function countUsers() {
  const db = getDb()
  const row = queryGet(db, `SELECT COUNT(*) AS c FROM users`)
  return Number(row?.c) || 0
}

/** @returns {{ id: number, username: string, role: string } | null} */
export function createUser(username, password, role = 'user') {
  const u = String(username || '').trim().toLowerCase()
  const p = String(password ?? '')
  if (!u || p.length < 6) return null
  if (role !== 'user' && role !== 'admin') role = 'user'
  if (findUserByUsername(u)) return null

  const db = getDb()
  const hash = bcrypt.hashSync(p, 10)
  queryRun(
    db,
    `INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)`,
    [u, hash, role],
  )
  const row = queryGet(
    db,
    `SELECT id, username, role FROM users WHERE lower(username) = ?`,
    [u],
  )
  persistDatabase()
  if (!row) return null
  return { id: row.id, username: row.username, role: row.role }
}
