import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppliedFiltersSummary } from '../components/AppliedFiltersSummary'
import { FilterPanel } from '../components/FilterPanel'
import { PaginationBar } from '../components/PaginationBar'
import { ProductList } from '../components/ProductList'
import {
  CatalogApiError,
  fetchBrands,
  fetchClothingTypes,
  fetchColors,
  fetchProductsPage,
  fetchSeasons,
  fetchSizes,
} from '../services/catalogApi'
import { useFavorites } from '../context/FavoritesContext'
import {
  loadFilterSettings,
  saveFilterSettings,
} from '../services/filterSettingsStorage'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import './CatalogPage.css'

const emptyLookups = () => ({
  brands: [],
  colors: [],
  sizes: [],
  seasons: [],
  clothingTypes: [],
})

export function CatalogPage() {
  useDocumentTitle('Каталог одягу — перегляд товарів')

  const [lookups, setLookups] = useState(emptyLookups)
  const [lookupsError, setLookupsError] = useState(null)
  const [lookupsLoading, setLookupsLoading] = useState(true)

  const [saved] = useState(() => loadFilterSettings())
  const [brandIds, setBrandIds] = useState(saved.brandIds)
  const [colorIds, setColorIds] = useState(saved.colorIds)
  const [sizeIds, setSizeIds] = useState(saved.sizeIds)
  const [seasonIds, setSeasonIds] = useState(saved.seasonIds)
  const [clothingTypeIds, setClothingTypeIds] = useState(saved.clothingTypeIds)
  const [minPrice, setMinPrice] = useState(saved.minPrice)
  const [maxPrice, setMaxPrice] = useState(saved.maxPrice)
  const [search, setSearch] = useState(saved.search)
  const [pageSize] = useState(saved.pageSize)
  const [page, setPage] = useState(saved.page)

  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState(null)

  const { favoriteIds, toggle: toggleFavorite } = useFavorites()
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLookupsLoading(true)
    setLookupsError(null)
    Promise.all([
      fetchBrands(),
      fetchColors(),
      fetchSizes(),
      fetchSeasons(),
      fetchClothingTypes(),
    ])
      .then(([brands, colors, sizes, seasons, clothingTypes]) => {
        if (cancelled) return
        setLookups({ brands, colors, sizes, seasons, clothingTypes })
      })
      .catch((e) => {
        if (cancelled) return
        const msg =
          e instanceof CatalogApiError
            ? e.message
            : 'Не вдалося завантажити довідники.'
        setLookupsError(msg)
      })
      .finally(() => {
        if (!cancelled) setLookupsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const query = useMemo(
    () => ({
      page,
      pageSize,
      search,
      minPrice,
      maxPrice,
      brandIds,
      colorIds,
      sizeIds,
      seasonIds,
      clothingTypeIds,
    }),
    [
      page,
      pageSize,
      search,
      minPrice,
      maxPrice,
      brandIds,
      colorIds,
      sizeIds,
      seasonIds,
      clothingTypeIds,
    ],
  )

  useEffect(() => {
    saveFilterSettings(query)
  }, [query])

  useEffect(() => {
    let cancelled = false
    setListLoading(true)
    setListError(null)
    fetchProductsPage(query)
      .then((data) => {
        if (cancelled) return
        setItems(data.items ?? [])
        setTotal(Number(data.total) || 0)
        const tp = Math.max(1, Math.ceil((Number(data.total) || 0) / pageSize))
        if (page > tp) setPage(tp)
      })
      .catch((e) => {
        if (cancelled) return
        const msg =
          e instanceof CatalogApiError
            ? e.message
            : 'Помилка під час завантаження товарів.'
        setListError(msg)
        setItems([])
        setTotal(0)
      })
      .finally(() => {
        if (!cancelled) setListLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [query, pageSize, page])

  const resetFilters = useCallback(() => {
    setBrandIds([])
    setColorIds([])
    setSizeIds([])
    setSeasonIds([])
    setClothingTypeIds([])
    setMinPrice('')
    setMaxPrice('')
    setSearch('')
    setPage(1)
  }, [])

  const onToggleFavorite = useCallback(
    async (id) => {
      try {
        await toggleFavorite(id)
      } catch {
        /* залишаємо попередній стан */
      }
    },
    [toggleFavorite],
  )

  const dbError = lookupsError || listError
  const retry = () => {
    window.location.reload()
  }

  return (
    <div className="catalog-page">
      <header className="page-header">
        <div>
          <h1 className="page-header__title">Каталог одягу</h1>
          <p className="page-header__sub">
            Підбір за розміром, кольором, типом, сезоном та ціною. Дані з локальної бази.
          </p>
        </div>
      </header>

      {dbError ? (
        <div className="banner banner--error" role="alert">
          <div>
            <strong>Проблема з доступом до даних.</strong> {dbError}
          </div>
          <button type="button" className="btn" onClick={retry}>
            Оновити сторінку
          </button>
        </div>
      ) : null}

      <div className="catalog-page__body">
        <div className="catalog-layout">
          <div className="catalog-layout__filters">
            <button
              type="button"
              className="catalog-filters-toggle btn"
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen((v) => !v)}
            >
              {filtersOpen ? 'Сховати фільтри' : 'Показати фільтри'}
            </button>
            {lookupsLoading ? (
              <div className="panel-muted">Завантаження фільтрів…</div>
            ) : (
              <div
                className={
                  filtersOpen
                    ? 'catalog-filters panel catalog-filters--open'
                    : 'catalog-filters panel'
                }
              >
                <FilterPanel
                  lookups={lookups}
                  brandIds={brandIds}
                  colorIds={colorIds}
                  sizeIds={sizeIds}
                  seasonIds={seasonIds}
                  clothingTypeIds={clothingTypeIds}
                  minPrice={minPrice}
                  maxPrice={maxPrice}
                  search={search}
                  onBrandIds={(v) => {
                    setBrandIds(v)
                    setPage(1)
                  }}
                  onColorIds={(v) => {
                    setColorIds(v)
                    setPage(1)
                  }}
                  onSizeIds={(v) => {
                    setSizeIds(v)
                    setPage(1)
                  }}
                  onSeasonIds={(v) => {
                    setSeasonIds(v)
                    setPage(1)
                  }}
                  onClothingTypeIds={(v) => {
                    setClothingTypeIds(v)
                    setPage(1)
                  }}
                  onMinPrice={(v) => {
                    setMinPrice(v)
                    setPage(1)
                  }}
                  onMaxPrice={(v) => {
                    setMaxPrice(v)
                    setPage(1)
                  }}
                  onSearch={(v) => {
                    setSearch(v)
                    setPage(1)
                  }}
                  onReset={resetFilters}
                />
              </div>
            )}
          </div>

          <main className="catalog-layout__main">
            <div className="catalog-main-scroll">
              <section className="panel" aria-label="Застосований фільтр">
                <AppliedFiltersSummary
                  brands={lookups.brands}
                  colors={lookups.colors}
                  sizes={lookups.sizes}
                  seasons={lookups.seasons}
                  clothingTypes={lookups.clothingTypes}
                  brandIds={brandIds}
                  colorIds={colorIds}
                  sizeIds={sizeIds}
                  seasonIds={seasonIds}
                  clothingTypeIds={clothingTypeIds}
                  minPrice={minPrice}
                  maxPrice={maxPrice}
                  search={search}
                  onRemoveBrand={(id) => {
                    setBrandIds(brandIds.filter((x) => x !== id))
                    setPage(1)
                  }}
                  onRemoveColor={(id) => {
                    setColorIds(colorIds.filter((x) => x !== id))
                    setPage(1)
                  }}
                  onRemoveSize={(id) => {
                    setSizeIds(sizeIds.filter((x) => x !== id))
                    setPage(1)
                  }}
                  onRemoveSeason={(id) => {
                    setSeasonIds(seasonIds.filter((x) => x !== id))
                    setPage(1)
                  }}
                  onRemoveType={(id) => {
                    setClothingTypeIds(clothingTypeIds.filter((x) => x !== id))
                    setPage(1)
                  }}
                  onClearPrice={() => {
                    setMinPrice('')
                    setMaxPrice('')
                    setPage(1)
                  }}
                  onClearSearch={() => {
                    setSearch('')
                    setPage(1)
                  }}
                />
              </section>

              <section aria-label="Список товарів">
                <h2 className="section-title">Товари</h2>
                <ProductList
                  products={items}
                  loading={listLoading}
                  showFavoriteToggle
                  favoriteIds={favoriteIds}
                  onToggleFavorite={onToggleFavorite}
                />
              </section>
            </div>

            <div className="catalog-pagination-dock">
              <PaginationBar
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={(p) => setPage(p)}
              />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
