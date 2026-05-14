import { ProductList } from './ProductList'

/** Окремий блок UI для списку обраного (без фільтрів на сторінці обраного). */
export function FavoritesList(props) {
  return (
    <ProductList
      {...props}
      emptyMessage="У обраному ще нічого немає. Додайте товари з каталогу."
    />
  )
}
