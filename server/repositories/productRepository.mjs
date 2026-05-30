import { Product } from '../entities.mjs'
import { getDb, persistDatabase } from '../database.mjs'
import { queryAll, queryGet, queryRun } from '../query.mjs'
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

// ---- Операції запису (адмінпанель) ----

const FK = {
  brand_id: 'brands',
  color_id: 'colors',
  season_id: 'seasons',
  clothing_type_id: 'clothing_types',
}

function toPositiveInt(value) {
  const n = Number.parseInt(String(value), 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Перевіряє та нормалізує поля товару; кидає Error з .userMessage за потреби. */
function normalizeProductInput(input) {
  const name = String(input?.name ?? '').trim()
  if (name.length < 2) {
    const e = new Error('invalid_name')
    e.userMessage = 'Назва товару має містити щонайменше 2 символи.'
    throw e
  }
  const price = Number.parseFloat(String(input?.price))
  if (!Number.isFinite(price) || price < 0) {
    const e = new Error('invalid_price')
    e.userMessage = 'Ціна має бути невід’ємним числом.'
    throw e
  }
  const fields = {
    name,
    description: String(input?.description ?? '').trim(),
    price,
    brand_id: toPositiveInt(input?.brandId ?? input?.brand_id),
    color_id: toPositiveInt(input?.colorId ?? input?.color_id),
    season_id: toPositiveInt(input?.seasonId ?? input?.season_id),
    clothing_type_id: toPositiveInt(input?.clothingTypeId ?? input?.clothing_type_id),
  }
  const db = getDb()
  for (const [col, table] of Object.entries(FK)) {
    if (!fields[col]) {
      const e = new Error('missing_fk')
      e.userMessage = `Не вибрано значення для поля «${col}».`
      throw e
    }
    const ok = queryGet(db, `SELECT 1 AS ok FROM ${table} WHERE id = ?`, [fields[col]])
    if (!ok?.ok) {
      const e = new Error('bad_fk')
      e.userMessage = `Вибране значення для «${col}» не існує.`
      throw e
    }
  }
  return fields
}

/** Нормалізує залишки по розмірах: масив { sizeId, quantity } з валідними розмірами. */
function normalizeStocks(input) {
  const db = getDb()
  const raw = Array.isArray(input?.sizeStocks) ? input.sizeStocks : []
  const seen = new Set()
  const stocks = []
  for (const entry of raw) {
    const sizeId = toPositiveInt(entry?.sizeId ?? entry?.size_id)
    if (!sizeId || seen.has(sizeId)) continue
    const qty = Number.parseInt(String(entry?.quantity), 10)
    if (!Number.isFinite(qty) || qty < 0) continue
    const ok = queryGet(db, `SELECT 1 AS ok FROM sizes WHERE id = ?`, [sizeId])
    if (!ok?.ok) continue
    seen.add(sizeId)
    stocks.push({ sizeId, quantity: qty })
  }
  return stocks
}

/**
 * Визначає основний size_id товару (NOT NULL) та перелік залишків.
 * Розмір береться явний, інакше — найменший із розмірів, де кількість > 0.
 */
function resolveSizeAndStocks(input) {
  const stocks = normalizeStocks(input)
  let sizeId = toPositiveInt(input?.sizeId ?? input?.size_id)
  if (sizeId) {
    const ok = queryGet(getDb(), `SELECT 1 AS ok FROM sizes WHERE id = ?`, [sizeId])
    if (!ok?.ok) sizeId = null
  }
  if (!sizeId) {
    const positive = stocks.filter((s) => s.quantity > 0).sort((a, b) => a.sizeId - b.sizeId)
    sizeId = positive[0]?.sizeId ?? null
  }
  if (!sizeId) {
    const e = new Error('no_size')
    e.userMessage = 'Вкажіть кількість хоча б для одного розміру.'
    throw e
  }
  return { sizeId, stocks }
}

/** Перезаписує залишки товару по розмірах. */
function writeStocks(productId, stocks) {
  const db = getDb()
  queryRun(db, `DELETE FROM product_stock WHERE product_id = ?`, [productId])
  for (const s of stocks) {
    queryRun(
      db,
      `INSERT INTO product_stock (product_id, size_id, quantity) VALUES (?, ?, ?)`,
      [productId, s.sizeId, s.quantity],
    )
  }
}

export function createProduct(input) {
  const db = getDb()
  const f = normalizeProductInput(input)
  const { sizeId, stocks } = resolveSizeAndStocks(input)
  queryRun(
    db,
    `INSERT INTO products
       (name, description, price, brand_id, color_id, size_id, season_id, clothing_type_id)
     VALUES (?,?,?,?,?,?,?,?)`,
    [f.name, f.description, f.price, f.brand_id, f.color_id, sizeId, f.season_id, f.clothing_type_id],
  )
  const row = queryGet(db, `SELECT last_insert_rowid() AS id`)
  const id = Number(row?.id)
  queryRun(db, `UPDATE products SET image_url = ? WHERE id = ?`, [`/api/product-images/${id}`, id])
  writeStocks(id, stocks)
  persistDatabase()
  return findProductById(id)
}

export function updateProduct(id, input) {
  const db = getDb()
  const nid = toPositiveInt(id)
  if (!nid) return null
  const exists = queryGet(db, `SELECT 1 AS ok FROM products WHERE id = ?`, [nid])
  if (!exists?.ok) return null
  const f = normalizeProductInput(input)
  const { sizeId, stocks } = resolveSizeAndStocks(input)
  queryRun(
    db,
    `UPDATE products SET
       name = ?, description = ?, price = ?, brand_id = ?, color_id = ?,
       size_id = ?, season_id = ?, clothing_type_id = ?
     WHERE id = ?`,
    [f.name, f.description, f.price, f.brand_id, f.color_id, sizeId, f.season_id, f.clothing_type_id, nid],
  )
  writeStocks(nid, stocks)
  persistDatabase()
  return findProductById(nid)
}

export function deleteProduct(id) {
  const db = getDb()
  const nid = toPositiveInt(id)
  if (!nid) return false
  const exists = queryGet(db, `SELECT 1 AS ok FROM products WHERE id = ?`, [nid])
  if (!exists?.ok) return false
  queryRun(db, `DELETE FROM product_stock WHERE product_id = ?`, [nid])
  queryRun(db, `DELETE FROM user_favorites WHERE product_id = ?`, [nid])
  queryRun(db, `DELETE FROM products WHERE id = ?`, [nid])
  persistDatabase()
  return true
}

/** Зберігає завантажене зображення (data-URL) у БД. */
export function setProductImage(id, dataUrl) {
  const db = getDb()
  const nid = toPositiveInt(id)
  if (!nid) return null
  const exists = queryGet(db, `SELECT 1 AS ok FROM products WHERE id = ?`, [nid])
  if (!exists?.ok) return null
  queryRun(
    db,
    `UPDATE products SET image_data = ?, image_url = ? WHERE id = ?`,
    [dataUrl, `/api/product-images/${nid}`, nid],
  )
  persistDatabase()
  return findProductById(nid)
}

/** Повертає data-URL зображення з БД або null. */
export function getProductImageData(id) {
  const db = getDb()
  const nid = toPositiveInt(id)
  if (!nid) return null
  const row = queryGet(db, `SELECT image_data FROM products WHERE id = ?`, [nid])
  return row?.image_data || null
}
