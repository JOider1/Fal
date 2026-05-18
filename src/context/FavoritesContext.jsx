import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { CatalogApiError, fetchFavoriteIds, toggleFavoriteProduct } from '../services/catalogApi'
import { useAuth } from './AuthContext'

const FavoritesContext = createContext(null)

export function FavoritesProvider({ children }) {
  const { user, ready } = useAuth()
  const [favoriteIds, setFavoriteIds] = useState([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!user) {
      setFavoriteIds([])
      return []
    }
    setLoading(true)
    try {
      const ids = await fetchFavoriteIds()
      setFavoriteIds(ids)
      return ids
    } catch {
      setFavoriteIds([])
      return []
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!ready) return
    refresh()
  }, [ready, user, refresh])

  const toggle = useCallback(
    async (productId) => {
      if (!user) {
        throw new CatalogApiError('Потрібен вхід', { code: 'unauthorized', status: 401 })
      }
      const { productIds } = await toggleFavoriteProduct(productId)
      setFavoriteIds(productIds)
      return productIds
    },
    [user],
  )

  const value = useMemo(
    () => ({
      favoriteIds,
      loading,
      refresh,
      toggle,
      isFavorite: (id) => favoriteIds.includes(Number.parseInt(String(id), 10)),
    }),
    [favoriteIds, loading, refresh, toggle],
  )

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFavorites() {
  const ctx = useContext(FavoritesContext)
  if (!ctx) throw new Error('useFavorites поза FavoritesProvider')
  return ctx
}
