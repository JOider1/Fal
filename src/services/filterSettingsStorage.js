const KEY = 'clothing-catalog-filters-v1'

export function digitsOnly(value) {
  return String(value).replace(/\D/g, '')
}

const defaultState = () => ({
  brandIds: [],
  colorIds: [],
  sizeIds: [],
  seasonIds: [],
  clothingTypeIds: [],
  minPrice: '',
  maxPrice: '',
  search: '',
  pageSize: 12,
  page: 1,
})

export function loadFilterSettings() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaultState()
    const o = JSON.parse(raw)
    const base = defaultState()
    return {
      ...base,
      brandIds: sanitizeIdArray(o.brandIds),
      colorIds: sanitizeIdArray(o.colorIds),
      sizeIds: sanitizeIdArray(o.sizeIds),
      seasonIds: sanitizeIdArray(o.seasonIds),
      clothingTypeIds: sanitizeIdArray(o.clothingTypeIds),
      minPrice: digitsOnly(String(o.minPrice ?? '')),
      maxPrice: digitsOnly(String(o.maxPrice ?? '')),
      search: String(o.search ?? ''),
      pageSize: clampPageSize(o.pageSize),
      page: Math.max(1, Number.parseInt(String(o.page), 10) || 1),
    }
  } catch {
    return defaultState()
  }
}

export function saveFilterSettings(state) {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        brandIds: state.brandIds,
        colorIds: state.colorIds,
        sizeIds: state.sizeIds,
        seasonIds: state.seasonIds,
        clothingTypeIds: state.clothingTypeIds,
        minPrice: state.minPrice,
        maxPrice: state.maxPrice,
        search: state.search,
        pageSize: state.pageSize,
        page: state.page,
      }),
    )
  } catch {
    /* ігноруємо quota / приватний режим */
  }
}

function sanitizeIdArray(v) {
  if (!Array.isArray(v)) return []
  return v
    .map((x) => Number.parseInt(String(x), 10))
    .filter((n) => Number.isFinite(n) && n > 0)
}

function clampPageSize(n) {
  const p = Number.parseInt(String(n), 10)
  if (!Number.isFinite(p)) return 12
  return Math.min(50, Math.max(4, p))
}
