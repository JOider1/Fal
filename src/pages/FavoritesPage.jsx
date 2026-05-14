import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FavoritesList } from '../components/FavoritesList'
import { CatalogApiError, fetchProductsByIds } from '../services/catalogApi'
import { getFavoriteIds, toggleFavorite } from '../services/favoritesStorage'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import './FavoritesPage.css'

export function FavoritesPage() {
  useDocumentTitle('Обрані товари')

  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [favoriteIds, setFavoriteIds] = useState(() => getFavoriteIds())

  useEffect(() => {
    const ids = getFavoriteIds()
    setFavoriteIds(ids)
    if (!ids.length) {
      setItems([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchProductsByIds(ids)
      .then((data) => {
        if (cancelled) return
        setItems(data.items ?? [])
      })
      .catch((e) => {
        if (cancelled) return
        const msg =
          e instanceof CatalogApiError
            ? e.message
            : 'Не вдалося завантажити обране.'
        setError(msg)
        setItems([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const onToggleFavorite = (id) => {
    const next = toggleFavorite(id)
    setFavoriteIds(next)
    setItems((prev) => prev.filter((p) => next.includes(p.id)))
  }

  return (
    <div className="favorites-page">
      <header className="favorites-header">
        <div>
          <h1 className="favorites-header__title">Список обраного</h1>
          <p className="favorites-header__sub">
            Тут лише збережені товари. Фільтри каталогу на цьому екрані не відображаються.
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
