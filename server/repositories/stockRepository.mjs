import { getDb } from '../database.mjs'
import { queryAll } from '../query.mjs'

/**
 * Залишки по розмірах для списку product_id.
 * @returns {Map<number, Array<{ sizeId: number, sizeCode: string, quantity: number }>>}
 */
export function getStockByProductIds(ids) {
  const idList = [...new Set(ids.map((x) => Number.parseInt(String(x), 10)).filter((n) => n > 0))]
  if (!idList.length) return new Map()
  const db = getDb()
  const ph = idList.map(() => '?').join(',')
  try {
    const rows = queryAll(
      db,
      `
    SELECT
      ps.product_id AS product_id,
      ps.size_id AS size_id,
      s.code AS size_code,
      ps.quantity AS quantity
    FROM product_stock ps
    INNER JOIN sizes s ON s.id = ps.size_id
    WHERE ps.product_id IN (${ph})
    ORDER BY ps.product_id, s.id
  `,
      idList,
    )
    const map = new Map()
    for (const r of rows) {
      const pid = r.product_id
      if (!map.has(pid)) map.set(pid, [])
      map.get(pid).push({
        sizeId: r.size_id,
        sizeCode: r.size_code,
        quantity: Number(r.quantity) || 0,
      })
    }
    return map
  } catch {
    return new Map()
  }
}
