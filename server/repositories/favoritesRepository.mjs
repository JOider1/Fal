import { getDb, persistDatabase } from '../database.mjs'
import { queryAll, queryGet, queryRun } from '../query.mjs'

function persistFavorites() {
  persistDatabase()
}

export function getFavoriteProductIds(userId) {
  const uid = Number.parseInt(String(userId), 10)
  if (!Number.isFinite(uid) || uid < 1) return []
  const db = getDb()
  const rows = queryAll(
    db,
    `SELECT product_id FROM user_favorites WHERE user_id = ? ORDER BY product_id`,
    [uid],
  )
  return rows.map((r) => Number(r.product_id)).filter((n) => n > 0)
}

export function isFavorite(userId, productId) {
  const uid = Number.parseInt(String(userId), 10)
  const pid = Number.parseInt(String(productId), 10)
  if (!Number.isFinite(uid) || uid < 1 || !Number.isFinite(pid) || pid < 1) return false
  const db = getDb()
  const row = queryGet(
    db,
    `SELECT 1 AS ok FROM user_favorites WHERE user_id = ? AND product_id = ?`,
    [uid, pid],
  )
  return Boolean(row?.ok)
}

export function addFavorite(userId, productId) {
  const uid = Number.parseInt(String(userId), 10)
  const pid = Number.parseInt(String(productId), 10)
  if (!Number.isFinite(uid) || uid < 1 || !Number.isFinite(pid) || pid < 1) return false
  const db = getDb()
  const product = queryGet(db, `SELECT id FROM products WHERE id = ?`, [pid])
  if (!product) return false
  queryRun(
    db,
    `INSERT OR IGNORE INTO user_favorites (user_id, product_id) VALUES (?, ?)`,
    [uid, pid],
  )
  persistFavorites()
  return true
}

export function removeFavorite(userId, productId) {
  const uid = Number.parseInt(String(userId), 10)
  const pid = Number.parseInt(String(productId), 10)
  if (!Number.isFinite(uid) || uid < 1 || !Number.isFinite(pid) || pid < 1) return false
  const db = getDb()
  queryRun(db, `DELETE FROM user_favorites WHERE user_id = ? AND product_id = ?`, [uid, pid])
  persistFavorites()
  return true
}

/** @returns {{ added: boolean, productIds: number[] }} */
export function toggleFavorite(userId, productId) {
  if (isFavorite(userId, productId)) {
    removeFavorite(userId, productId)
    return { added: false, productIds: getFavoriteProductIds(userId) }
  }
  addFavorite(userId, productId)
  return { added: true, productIds: getFavoriteProductIds(userId) }
}
