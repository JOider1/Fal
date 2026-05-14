const KEY = 'clothing-catalog-favorites'

function readRaw() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

export function getFavoriteIds() {
  return readRaw()
    .map((x) => Number.parseInt(String(x), 10))
    .filter((n) => Number.isFinite(n) && n > 0)
}

export function setFavoriteIds(ids) {
  const unique = [...new Set(ids)]
  localStorage.setItem(KEY, JSON.stringify(unique))
}

export function isFavorite(id) {
  return getFavoriteIds().includes(Number(id))
}

export function toggleFavorite(id) {
  const n = Number.parseInt(String(id), 10)
  if (!Number.isFinite(n) || n < 1) return getFavoriteIds()
  const cur = getFavoriteIds()
  const next = cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n]
  setFavoriteIds(next)
  return next
}
