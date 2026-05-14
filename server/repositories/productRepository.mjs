import { Product } from '../entities.mjs'
import { getDb } from '../database.mjs'
import { queryAll, queryGet } from '../query.mjs'
import { getStockByProductIds } from './stockRepository.mjs'

const BASE_SELECT = `
  SELECT
    p.id,
    p.name,
    p.description,
    p.price,
    p.image_url AS image_url,
    p.brand_id,
    b.name AS brand_name,
    p.color_id,
    c.name AS color_name,
    p.size_id,
    s.code AS size_code,
    p.season_id,
    se.name AS season_name,
    p.clothing_type_id,
    ct.name AS clothing_type_name
  FROM products p
  INNER JOIN brands b ON b.id = p.brand_id
  INNER JOIN colors c ON c.id = p.color_id
  INNER JOIN sizes s ON s.id = p.size_id
  INNER JOIN seasons se ON se.id = p.season_id
  INNER JOIN clothing_types ct ON ct.id = p.clothing_type_id
`

function parseIdList(value) {
  if (value == null || value === '') return []
  const raw = Array.isArray(value) ? value : String(value).split(',')
  return raw
    .map((x) => Number.parseInt(String(x).trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0)
}

function buildFilterClause({
  search,
  brandIds,
  colorIds,
  sizeIds,
  seasonIds,
  clothingTypeIds,
  minPrice,
  maxPrice,
}) {
  const where = ['1=1']
  const params = []

  if (search?.trim()) {
    where.push('p.name LIKE ? COLLATE NOCASE')
    params.push(`%${search.trim()}%`)
  }
  if (brandIds.length) {
    where.push(`p.brand_id IN (${brandIds.map(() => '?').join(',')})`)
    params.push(...brandIds)
  }
  if (colorIds.length) {
    where.push(`p.color_id IN (${colorIds.map(() => '?').join(',')})`)
    params.push(...colorIds)
  }
  if (sizeIds.length) {
    const ph = sizeIds.map(() => '?').join(',')
    where.push(
      `EXISTS (SELECT 1 FROM product_stock psz WHERE psz.product_id = p.id AND psz.size_id IN (${ph}) AND psz.quantity > 0)`,
    )
    params.push(...sizeIds)
  }
  if (seasonIds.length) {
    where.push(`p.season_id IN (${seasonIds.map(() => '?').join(',')})`)
    params.push(...seasonIds)
  }
  if (clothingTypeIds.length) {
    where.push(`p.clothing_type_id IN (${clothingTypeIds.map(() => '?').join(',')})`)
    params.push(...clothingTypeIds)
  }
  if (minPrice != null && Number.isFinite(minPrice)) {
    where.push('p.price >= ?')
    params.push(minPrice)
  }
  if (maxPrice != null && Number.isFinite(maxPrice)) {
    where.push('p.price <= ?')
    params.push(maxPrice)
  }

  return { whereSql: where.join(' AND '), params }
}

function attachStocks(rows) {
  const ids = rows.map((r) => r.id)
  const stockMap = getStockByProductIds(ids)
  return rows.map((r) => {
    const p = Product.fromRow(r)
    p.sizeStocks = stockMap.get(r.id) ?? []
    return p.toJSON()
  })
}

/**
 * Пагінований список товарів лише для поточної сторінки.
 * @param {object} query — параметри з HTTP
 */
export function findProductsPage(query) {
  const db = getDb()
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1)
  const pageSize = Math.min(50, Math.max(1, Number.parseInt(query.pageSize, 10) || 12))

  const brandIds = parseIdList(query.brandIds)
  const colorIds = parseIdList(query.colorIds)
  const sizeIds = parseIdList(query.sizeIds)
  const seasonIds = parseIdList(query.seasonIds)
  const clothingTypeIds = parseIdList(query.clothingTypeIds)

  const minRaw = query.minPrice
  const maxRaw = query.maxPrice
  const minPrice =
    minRaw === '' || minRaw == null ? null : Number.parseFloat(String(minRaw))
  const maxPrice =
    maxRaw === '' || maxRaw == null ? null : Number.parseFloat(String(maxRaw))

  const { whereSql, params } = buildFilterClause({
    search: query.search,
    brandIds,
    colorIds,
    sizeIds,
    seasonIds,
    clothingTypeIds,
    minPrice: Number.isFinite(minPrice) ? minPrice : null,
    maxPrice: Number.isFinite(maxPrice) ? maxPrice : null,
  })

  const totalRow = queryGet(
    db,
    `SELECT COUNT(*) AS c FROM products p WHERE ${whereSql}`,
    params,
  )
  const total = Number(totalRow?.c) || 0

  const offset = (page - 1) * pageSize
  const rows = queryAll(
    db,
    `${BASE_SELECT} WHERE ${whereSql} ORDER BY p.id LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  )
  const items = attachStocks(rows)

  return { items, total, page, pageSize }
}

/** Товари за списком id (наприклад обране) — окремий запит, без пагінації каталогу */
export function findProductsByIds(ids) {
  const idList = parseIdList(ids)
  if (!idList.length) return []
  const db = getDb()
  const ph = idList.map(() => '?').join(',')
  const rows = queryAll(
    db,
    `${BASE_SELECT} WHERE p.id IN (${ph}) ORDER BY p.id`,
    idList,
  )
  const byId = new Map(attachStocks(rows).map((j) => [j.id, j]))
  return idList.map((id) => byId.get(id)).filter(Boolean)
}

export function findProductById(id) {
  const db = getDb()
  const nid = Number.parseInt(String(id), 10)
  if (!Number.isFinite(nid) || nid < 1) return null
  const row = queryGet(db, `${BASE_SELECT} WHERE p.id = ?`, [nid])
  if (!row) return null
  const [json] = attachStocks([row])
  return json
}
