import { Link } from 'react-router-dom'
import { Product } from '../domain/entities'
import './ProductList.css'

function sortedStocks(sizeStocks) {
  const arr = Array.isArray(sizeStocks) ? [...sizeStocks] : []
  arr.sort((a, b) => (a.sizeId ?? 0) - (b.sizeId ?? 0))
  return arr
}

export function ProductList({
  products,
  loading,
  emptyMessage = 'Нічого не знайдено за вашими критеріями.',
  showFavoriteToggle = false,
  favoriteIds = [],
  onToggleFavorite,
}) {
  if (loading) {
    return (
      <div className="product-list product-list--loading" role="status">
        Завантаження…
      </div>
    )
  }
  if (!products?.length) {
    return (
      <div className="product-list product-list--empty" role="status">
        {emptyMessage}
      </div>
    )
  }

  return (
    <ul className="product-list">
      {products.map((raw) => {
        const p = raw instanceof Product ? raw : Product.fromApi(raw)
        const fav = favoriteIds.includes(p.id)
        const stocks = sortedStocks(p.sizeStocks)
        return (
          <li key={p.id} className="product-card">
            <Link className="product-card__main" to={`/product/${p.id}`}>
              <div className="product-card__thumb-wrap">
                <img
                  className="product-card__img"
                  src={p.imageUrl}
                  alt=""
                  loading="lazy"
                />
              </div>
              <div className="product-card__title">{p.name}</div>
              <div className="product-card__meta">
                <span>{p.brandName}</span>
                <span>{p.colorName}</span>
                <span>{p.clothingTypeName}</span>
              </div>
              {stocks.length ? (
                <div className="product-card__sizes" aria-label="Розміри та залишок">
                  {stocks.map((x) => (
                    <span
                      key={x.sizeId}
                      className={
                        x.quantity > 0
                          ? 'product-card__size-pill'
                          : 'product-card__size-pill product-card__size-pill--zero'
                      }
                    >
                      {x.sizeCode}: <strong>{x.quantity}</strong> шт.
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="product-card__price">{p.price} ₴</div>
            </Link>
            {showFavoriteToggle ? (
              <button
                type="button"
                className={
                  fav ? 'product-card__fav product-card__fav--on' : 'product-card__fav'
                }
                aria-pressed={fav}
                aria-label={fav ? 'Прибрати з обраного' : 'Додати до обраного'}
                onClick={() => onToggleFavorite?.(p.id)}
              >
                ★
              </button>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
