import { getDb } from '../database.mjs'
import { queryGet } from '../query.mjs'

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
