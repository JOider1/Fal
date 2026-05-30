import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { FavoritesList } from '../components/FavoritesList'
import { CatalogApiError, fetchProductsByIds } from '../services/catalogApi'
import { useFavorites } from '../context/FavoritesContext'
import { useAuth } from '../context/AuthContext'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import './FavoritesPage.css'

export function FavoritesPage() {
  useDocumentTitle('Обрані товари')

  const navigate = useNavigate()
  const { user, ready } = useAuth()
  const { favoriteIds, toggle: toggleFavorite } = useFavorites()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadProducts = useCallback(async (ids) => {
    if (!ids.length) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await fetchProductsByIds(ids)
      setItems(data.items ?? [])
    } catch (e) {
      const msg =
        e instanceof CatalogApiError
          ? e.message
          : 'Не вдалося завантажити обране.'
      setError(msg)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProducts(favoriteIds)
  }, [favoriteIds, loadProducts])

  const onToggleFavorite = async (id) => {
    try {
      await toggleFavorite(id)
    } catch {
      /* ignore */
    }
  }

  if (ready && !user) {
    return <Navigate to="/login" replace state={{ from: { pathname: '/favorites' } }} />
  }

  return (
    <div className="favorites-page">
      <header className="favorites-header">
        <div>
          <h1 className="favorites-header__title">Список обраного</h1>
          <p className="favorites-header__sub">
            Збережені товари вашого облікового запису ({favoriteIds.length}).
          </p>
        </div>
        <nav className="favorites-header__actions" aria-label="Дії">
          <button type="button" className="btn" onClick={() => navigate(-1)}>
            Повернутись назад
          </button>
          <Link className="nav-link" to="/">
            До каталогу
          </Link>
        </nav>
      </header>

      {error ? (
        <div className="banner banner--error" role="alert">
          {error}
        </div>
      ) : null}

      <section aria-label="Обрані товари">
        <FavoritesList
          products={items}
          loading={loading}
          showFavoriteToggle
          favoriteIds={favoriteIds}
          onToggleFavorite={onToggleFavorite}
        />
      </section>
    </div>
  )
}
