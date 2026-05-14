import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CatalogApiError, fetchProductById } from '../services/catalogApi'
import { isFavorite, toggleFavorite } from '../services/favoritesStorage'
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
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [fav, setFav] = useState(() => isFavorite(id))

  useEffect(() => {
    setFav(isFavorite(id))
  }, [id])

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

  const onToggleFav = () => {
    toggleFavorite(id)
    setFav(isFavorite(id))
  }

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
        <h1 className="detail-header__title">
          {loading ? 'Завантаження…' : product?.name ?? 'Товар'}
        </h1>
      </header>

      {error ? (
        <div className="banner banner--error" role="alert">
          {error}
        </div>
      ) : null}

      {product ? (
        <article className="detail-card panel">
          <div className="detail-hero">
            <img
              className="detail-hero__img"
              src={product.imageUrl || `/api/product-images/${product.id}`}
              alt=""
            />
          </div>
          <div className="detail-grid">
            <dl className="detail-dl">
              <div>
                <dt>Назва</dt>
                <dd>{product.name}</dd>
              </div>
              <div>
                <dt>Опис</dt>
                <dd>{product.description}</dd>
              </div>
              <div>
                <dt>Бренд</dt>
                <dd>{product.brandName}</dd>
              </div>
              <div>
                <dt>Колір</dt>
                <dd>{product.colorName}</dd>
              </div>
              <div>
                <dt>Розміри та залишок</dt>
                <dd>
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
                    '—'
                  )}
                </dd>
              </div>
              <div>
                <dt>Сезон</dt>
                <dd>{product.seasonName}</dd>
              </div>
              <div>
                <dt>Тип одягу</dt>
                <dd>{product.clothingTypeName}</dd>
              </div>
              <div>
                <dt>Ціна</dt>
                <dd className="detail-price">{product.price} ₴</dd>
              </div>
            </dl>
            <div className="detail-side">
              <button
                type="button"
                className={fav ? 'btn btn--accent' : 'btn'}
                aria-pressed={fav}
                onClick={onToggleFav}
              >
                {fav ? 'У обраному' : 'Додати до обраного'}
              </button>
            </div>
          </div>
        </article>
      ) : null}
    </div>
  )
}
