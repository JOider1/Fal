/**
 * Обгортки над sql.js (немає .get() / .all() як у better-sqlite3).
 */

export function queryGet(db, sql, params = []) {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const has = stmt.step()
  const row = has ? stmt.getAsObject() : null
  stmt.free()
  return row
}

export function queryAll(db, sql, params = []) {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const rows = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject())
  }
  stmt.free()
  return rows
}

export function queryRun(db, sql, params = []) {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  stmt.step()
  stmt.free()
}
