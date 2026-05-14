/**
 * Доступ до даних каталогу через HTTP API.
 * UI-компоненти звертаються лише до цього сервісу, а не до БД напряму.
 */

import { getAuthToken } from './authStorage'

async function parseJsonSafe(res) {
  try {
    return await res.json()
  } catch {
    return {}
  }
}

export class CatalogApiError extends Error {
  constructor(message, { code, status } = {}) {
    super(message)
    this.name = 'CatalogApiError'
    this.code = code
    this.status = status
  }
}

function authHeaders() {
  const t = getAuthToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}

export async function apiGet(path, extraHeaders = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { ...authHeaders(), ...extraHeaders },
  })
  const body = await parseJsonSafe(res)
  if (!res.ok) {
    throw new CatalogApiError(body.message || res.statusText, {
      code: body.error,
      status: res.status,
    })
  }
  return body
}

export async function apiPost(path, body, { withAuth = false } = {}) {
  const res = await fetch(`/api${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(withAuth ? authHeaders() : {}),
    },
    body: JSON.stringify(body ?? {}),
  })
  const data = await parseJsonSafe(res)
  if (!res.ok) {
    throw new CatalogApiError(data.message || res.statusText, {
      code: data.error,
      status: res.status,
    })
  }
  return data
}

export async function loginRequest(username, password) {
  return apiPost(
    '/auth/login',
    { username, password },
    { withAuth: false },
  )
}

export function fetchMe() {
  return apiGet('/auth/me')
}

export function fetchAdminSummary() {
  return apiGet('/admin/summary')
}

export function fetchBrands() {
  return apiGet('/brands')
}

export function fetchColors() {
  return apiGet('/colors')
}

export function fetchSizes() {
  return apiGet('/sizes')
}

export function fetchSeasons() {
  return apiGet('/seasons')
}

export function fetchClothingTypes() {
  return apiGet('/clothing-types')
}

/** Пагінований список товарів за фільтром (лише одна сторінка) */
export function fetchProductsPage(query) {
  const q = new URLSearchParams()
  if (query.page) q.set('page', String(query.page))
  if (query.pageSize) q.set('pageSize', String(query.pageSize))
  if (query.search?.trim()) q.set('search', query.search.trim())
  if (query.minPrice !== '' && query.minPrice != null)
    q.set('minPrice', String(query.minPrice))
  if (query.maxPrice !== '' && query.maxPrice != null)
    q.set('maxPrice', String(query.maxPrice))
  const joinIds = (key, arr) => {
    if (arr?.length) q.set(key, arr.join(','))
  }
  joinIds('brandIds', query.brandIds)
  joinIds('colorIds', query.colorIds)
  joinIds('sizeIds', query.sizeIds)
  joinIds('seasonIds', query.seasonIds)
  joinIds('clothingTypeIds', query.clothingTypeIds)
  return apiGet(`/products?${q.toString()}`)
}

export function fetchProductById(id) {
  return apiGet(`/products/${encodeURIComponent(String(id))}`)
}

/** Окреме завантаження кількох товарів за id (наприклад обране) */
export function fetchProductsByIds(ids) {
  if (!ids?.length) return Promise.resolve({ items: [] })
  const q = new URLSearchParams()
  q.set('ids', ids.join(','))
  return apiGet(`/products/by-ids?${q.toString()}`)
}
