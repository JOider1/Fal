import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CatalogApiError, fetchProductById } from '../services/catalogApi'
import { useFavorites } from '../context/FavoritesContext'
import { useAuth } from '../context/AuthContext'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import './ProductDetailPage.css'

function sortedStocks(sizeStocks) {
  const arr = Array.isArray(sizeStocks) ? [...sizeStocks] : []
  arr.sort((a, b) => (a.sizeId ?? 0) - (b.sizeId ?? 0))
  return arr
}

export function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isFavorite, toggle: toggleFavorite } = useFavorites()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [favError, setFavError] = useState(null)

  const fav = isFavorite(id)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchProductById(id)
      .then((p) => {
        if (cancelled) return
        setProduct(p)
      })
      .catch((e) => {
        if (cancelled) return
        const msg =
          e instanceof CatalogApiError && e.status === 404
            ? 'Товар не знайдено.'
            : e instanceof CatalogApiError
              ? e.message
              : 'Не вдалося завантажити товар.'
        setError(msg)
        setProduct(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  useDocumentTitle(
    product ? `${product.name} — деталі товару` : 'Деталі товару',
  )

  const onToggleFav = async () => {
    setFavError(null)
    if (!user) {
      navigate('/login', { state: { from: { pathname: `/product/${id}` } } })
      return
    }
    try {
      await toggleFavorite(id)
    } catch (e) {
      const msg =
        e instanceof CatalogApiError
          ? e.message
          : 'Не вдалося оновити обране.'
      setFavError(msg)
    }
  }

  const imageBase = product?.imageUrl || `/api/product-images/${product?.id ?? id}`
  const imageSrc = imageBase.includes('?') ? imageBase : `${imageBase}?v=1`

  return (
    <div className="detail-page">
      <header className="detail-header">
        <div className="detail-header__row">
          <button type="button" className="btn" onClick={() => navigate(-1)}>
            Повернутись назад
          </button>
          <Link className="nav-link" to="/">
            До каталогу
          </Link>
        </div>
      </header>

      {error ? (
        <div className="banner banner--error" role="alert">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="detail-loading" role="status">
          Завантаження…
        </p>
      ) : null}

      {product ? (
        <article className="detail-card panel">
          <div className="detail-layout">
            <div className="detail-hero">
              <img
                className="detail-hero__img"
                src={imageSrc}
                alt={`${product.name} — ${product.brandName}, ${product.colorName}`}
                onError={(e) => {
                  if (!e.currentTarget.dataset.fallback) {
                    e.currentTarget.dataset.fallback = '1'
                    e.currentTarget.src = '/api/product-images/placeholder'
                  }
                }}
              />
            </div>

            <div className="detail-info">
              <h1 className="detail-info__title">{product.name}</h1>
              <p className="detail-info__brand">{product.brandName}</p>
              <p className="detail-info__attrs">
                {product.colorName} • {product.clothingTypeName} • {product.seasonName}
              </p>
              <p className="detail-price">{product.price} ₴</p>

              <div className="detail-info__actions">
                <button
                  type="button"
                  className={fav ? 'btn btn--accent' : 'btn'}
                  aria-pressed={fav}
                  onClick={onToggleFav}
                >
                  {fav ? '★ У обраному' : '☆ Додати до обраного'}
                </button>
                <Link className="nav-link" to="/favorites">
                  Перейти до обраного
                </Link>
              </div>

              {favError ? (
                <div className="banner banner--error detail-info__fav-err" role="alert">
                  {favError}
                </div>
              ) : null}

              <section className="detail-section">
                <h2 className="detail-section__title">Опис</h2>
                <p className="detail-section__text">{product.description}</p>
              </section>

              <section className="detail-section">
                <h2 className="detail-section__title">Розміри та залишок</h2>
                {product.sizeStocks?.length ? (
                  <ul className="detail-stock-list">
                    {sortedStocks(product.sizeStocks).map((x) => (
                      <li
                        key={x.sizeId}
                        className={
                          x.quantity > 0 ? undefined : 'detail-stock-list__row--zero'
                        }
                      >
                        <span className="detail-stock-list__size">{x.sizeCode}</span>
                        <span className="detail-stock-list__qty">{x.quantity} шт.</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="detail-section__text">—</p>
                )}
              </section>
            </div>
          </div>
        </article>
      ) : null}
    </div>
  )
}
