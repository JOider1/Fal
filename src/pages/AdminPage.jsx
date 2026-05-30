import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import {
  CatalogApiError,
  createProductRequest,
  deleteProductRequest,
  fetchAdminSummary,
  fetchBrands,
  fetchClothingTypes,
  fetchColors,
  fetchProductsPage,
  fetchSeasons,
  fetchSizes,
  updateProductRequest,
  uploadProductImageRequest,
} from '../services/catalogApi'
import { useAuth } from '../context/AuthContext'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import './AdminPage.css'

const EMPTY_FORM = {
  name: '',
  description: '',
  price: '',
  brandId: '',
  colorId: '',
  seasonId: '',
  clothingTypeId: '',
}

function formFromProduct(p) {
  return {
    name: p.name ?? '',
    description: p.description ?? '',
    price: String(p.price ?? ''),
    brandId: String(p.brandId ?? p.brand_id ?? ''),
    colorId: String(p.colorId ?? p.color_id ?? ''),
    seasonId: String(p.seasonId ?? p.season_id ?? ''),
    clothingTypeId: String(p.clothingTypeId ?? p.clothing_type_id ?? ''),
  }
}

/** Залишки товару у вигляді мапи { [sizeId]: 'кількість' } для полів форми. */
function stocksFromProduct(p) {
  const out = {}
  for (const s of p.sizeStocks ?? []) {
    if (s.sizeId != null) out[s.sizeId] = String(s.quantity ?? '')
  }
  return out
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Не вдалося прочитати файл.'))
    reader.readAsDataURL(file)
  })
}

export function AdminPage() {
  useDocumentTitle('Панель адміністратора')
  const { user, ready, isAdmin } = useAuth()

  const [summary, setSummary] = useState(null)
  const [lookups, setLookups] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // editing: null (нічого) | 'new' | продукт, що редагується
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [stocks, setStocks] = useState({})
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [imgBusyId, setImgBusyId] = useState(null)
  const [imgVersion, setImgVersion] = useState(0)
  // Фото, вибране для ще не збереженого товару (завантажиться після створення)
  const [pendingImage, setPendingImage] = useState(null)
  const fileInputRef = useRef(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [sum, brands, colors, sizes, seasons, types, page] = await Promise.all([
        fetchAdminSummary(),
        fetchBrands(),
        fetchColors(),
        fetchSizes(),
        fetchSeasons(),
        fetchClothingTypes(),
        fetchProductsPage({ page: 1, pageSize: 50 }),
      ])
      setSummary(sum)
      setLookups({ brands, colors, sizes, seasons, types })
      setProducts(page.items ?? [])
      setImgVersion((v) => v + 1)
    } catch (e) {
      setError(e instanceof CatalogApiError ? e.message : 'Не вдалося завантажити дані.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!ready || !isAdmin) return
    loadAll()
  }, [ready, isAdmin, loadAll])

  // Модальне вікно: закриття по Escape + блокування прокрутки фону
  useEffect(() => {
    if (!editing) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setEditing(null)
        setForm(EMPTY_FORM)
        setStocks({})
        setPendingImage(null)
        setFormError(null)
      }
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [editing])

  // Звільняємо тимчасовий URL попереднього перегляду фото
  useEffect(() => {
    const preview = pendingImage?.preview
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [pendingImage])

  if (!ready) return <div className="admin-page">Завантаження…</div>
  if (!user) return <Navigate to="/login" replace state={{ from: { pathname: '/admin' } }} />
  if (!isAdmin) {
    return (
      <div className="admin-page">
        <div className="banner banner--error" role="alert">
          У вас немає прав адміністратора.
        </div>
        <Link className="nav-link" to="/">
          До каталогу
        </Link>
      </div>
    )
  }

  const openCreate = () => {
    setEditing('new')
    setForm(EMPTY_FORM)
    setStocks({})
    setPendingImage(null)
    setFormError(null)
    setNotice(null)
  }

  const openEdit = (p) => {
    setEditing(p)
    setForm(formFromProduct(p))
    setStocks(stocksFromProduct(p))
    setPendingImage(null)
    setFormError(null)
    setNotice(null)
  }

  const closeForm = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setStocks({})
    setPendingImage(null)
    setFormError(null)
  }

  const updateField = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const updateStock = (sizeId, value) =>
    setStocks((s) => ({ ...s, [sizeId]: value.replace(/[^\d]/g, '') }))

  const REQUIRED_SELECTS = [
    ['brandId', 'бренд'],
    ['colorId', 'колір'],
    ['seasonId', 'сезон'],
    ['clothingTypeId', 'тип одягу'],
  ]

  // Перетворює мапу залишків на масив { sizeId, quantity } для надсилання
  const stockEntries = () =>
    Object.entries(stocks)
      .map(([sizeId, q]) => ({ sizeId: Number(sizeId), quantity: Number.parseInt(q, 10) }))
      .filter((x) => Number.isFinite(x.quantity) && x.quantity >= 0)

  // Перевірка форми на клієнті — дублює серверну, але дає миттєвий відгук
  const validateForm = () => {
    if (form.name.trim().length < 2) {
      return 'Назва товару має містити щонайменше 2 символи.'
    }
    const price = Number.parseFloat(form.price)
    if (!Number.isFinite(price) || price < 0) {
      return 'Ціна має бути невід’ємним числом.'
    }
    for (const [key, label] of REQUIRED_SELECTS) {
      if (!form[key]) return `Оберіть ${label}.`
    }
    if (!stockEntries().some((x) => x.quantity > 0)) {
      return 'Вкажіть кількість хоча б для одного розміру.'
    }
    return null
  }

  const pickNewImage = (file) => {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setFormError('Розмір зображення не має перевищувати 5 МБ.')
      return
    }
    setFormError(null)
    setPendingImage({ file, preview: URL.createObjectURL(file) })
  }

  const saveForm = async () => {
    const validationError = validateForm()
    if (validationError) {
      setFormError(validationError)
      return
    }
    setSaving(true)
    setFormError(null)
    setNotice(null)
    const payload = { ...form, sizeStocks: stockEntries() }
    try {
      if (editing === 'new') {
        const created = await createProductRequest(payload)
        if (pendingImage) {
          const dataUrl = await readFileAsDataUrl(pendingImage.file)
          await uploadProductImageRequest(created.id, dataUrl)
        }
        setNotice(
          pendingImage
            ? `Товар «${created.name}» створено разом із фото.`
            : `Товар «${created.name}» створено. За потреби завантажте фото нижче.`,
        )
        setEditing(created)
        setForm(formFromProduct(created))
        setStocks(stocksFromProduct(created))
        setPendingImage(null)
      } else {
        const updated = await updateProductRequest(editing.id, payload)
        setNotice(`Зміни товару «${updated.name}» збережено.`)
        setEditing(updated)
        setStocks(stocksFromProduct(updated))
      }
      await loadAll()
    } catch (e) {
      setFormError(e instanceof CatalogApiError ? e.message : 'Не вдалося зберегти товар.')
    } finally {
      setSaving(false)
    }
  }

  const removeProduct = async (p) => {
    if (!window.confirm(`Видалити товар «${p.name}»? Дію не можна скасувати.`)) return
    setError(null)
    setNotice(null)
    try {
      await deleteProductRequest(p.id)
      if (editing && editing !== 'new' && editing.id === p.id) closeForm()
      setNotice(`Товар «${p.name}» видалено.`)
      await loadAll()
    } catch (e) {
      setError(e instanceof CatalogApiError ? e.message : 'Не вдалося видалити товар.')
    }
  }

  const onImageChange = async (p, file) => {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setError('Розмір зображення не має перевищувати 5 МБ.')
      return
    }
    setImgBusyId(p.id)
    setError(null)
    setNotice(null)
    try {
      const dataUrl = await readFileAsDataUrl(file)
      await uploadProductImageRequest(p.id, dataUrl)
      setNotice(`Фото для «${p.name}» оновлено.`)
      await loadAll()
    } catch (e) {
      setError(e instanceof CatalogApiError ? e.message : 'Не вдалося завантажити фото.')
    } finally {
      setImgBusyId(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const imgSrc = (p) => `/api/product-images/${p.id}?v=${imgVersion}`

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1>Панель адміністратора</h1>
        <Link className="nav-link" to="/">
          До каталогу
        </Link>
      </header>

      {error ? (
        <div className="banner banner--error" role="alert">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="banner admin-notice" role="status">
          {notice}
        </div>
      ) : null}

      {loading ? (
        <p>Завантаження…</p>
      ) : (
        <>
          {summary ? (
            <ul className="admin-stats panel">
              <li>
                <span className="admin-stats__num">{summary.productCount}</span>
                товарів у каталозі
              </li>
              <li>
                <span className="admin-stats__num">{summary.brandCount}</span>
                брендів
              </li>
              <li>
                <span className="admin-stats__num">{summary.userCount}</span>
                облікових записів
              </li>
            </ul>
          ) : null}

          <section className="admin-section">
            <div className="admin-section__head">
              <h2>Товари</h2>
              <button type="button" className="btn btn--admin-primary" onClick={openCreate}>
                + Додати товар
              </button>
            </div>

            <div className="admin-table-wrap panel">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Фото</th>
                    <th>Назва</th>
                    <th>Бренд</th>
                    <th>Колір</th>
                    <th>Ціна</th>
                    <th aria-label="Дії" />
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <img
                          className="admin-thumb"
                          src={imgSrc(p)}
                          alt={`${p.name} — ${p.brandName}`}
                          onError={(e) => {
                            if (!e.currentTarget.dataset.fb) {
                              e.currentTarget.dataset.fb = '1'
                              e.currentTarget.src = '/api/product-images/placeholder'
                            }
                          }}
                        />
                      </td>
                      <td>{p.name}</td>
                      <td>{p.brandName}</td>
                      <td>{p.colorName}</td>
                      <td className="admin-table__price">{p.price} ₴</td>
                      <td className="admin-table__actions">
                        <button type="button" className="btn" onClick={() => openEdit(p)}>
                          Редагувати
                        </button>
                        <button
                          type="button"
                          className="btn btn--danger"
                          onClick={() => removeProduct(p)}
                        >
                          Видалити
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!products.length ? (
                    <tr>
                      <td colSpan={6} className="admin-table__empty">
                        Товарів немає. Додайте перший товар.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>

          {editing ? (
            <div
              className="admin-modal"
              role="presentation"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) closeForm()
              }}
            >
              <section
                className="admin-modal__dialog panel"
                role="dialog"
                aria-modal="true"
                aria-label="Форма товару"
              >
                <header className="admin-modal__head">
                  <h2>{editing === 'new' ? 'Новий товар' : `Редагування: ${editing.name}`}</h2>
                  <button
                    type="button"
                    className="admin-modal__close"
                    aria-label="Закрити"
                    onClick={closeForm}
                  >
                    ×
                  </button>
                </header>

                <div className="admin-modal__body">
                  {formError ? (
                    <div className="banner banner--error" role="alert">
                      {formError}
                    </div>
                  ) : null}

                  <div className="admin-form__grid">
                <label className="admin-field admin-field--wide">
                  <span>Назва</span>
                  <input
                    className="input"
                    value={form.name}
                    onChange={(e) => updateField('name', e.target.value)}
                  />
                </label>
                <label className="admin-field admin-field--wide">
                  <span>Опис</span>
                  <textarea
                    className="input"
                    rows={3}
                    value={form.description}
                    onChange={(e) => updateField('description', e.target.value)}
                  />
                </label>
                <label className="admin-field">
                  <span>Ціна, ₴</span>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="1"
                    value={form.price}
                    onChange={(e) => updateField('price', e.target.value)}
                  />
                </label>
                <label className="admin-field">
                  <span>Бренд</span>
                  <select
                    className="input"
                    value={form.brandId}
                    onChange={(e) => updateField('brandId', e.target.value)}
                  >
                    <option value="">— оберіть —</option>
                    {lookups?.brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="admin-field">
                  <span>Колір</span>
                  <select
                    className="input"
                    value={form.colorId}
                    onChange={(e) => updateField('colorId', e.target.value)}
                  >
                    <option value="">— оберіть —</option>
                    {lookups?.colors.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="admin-field">
                  <span>Сезон</span>
                  <select
                    className="input"
                    value={form.seasonId}
                    onChange={(e) => updateField('seasonId', e.target.value)}
                  >
                    <option value="">— оберіть —</option>
                    {lookups?.seasons.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="admin-field">
                  <span>Тип одягу</span>
                  <select
                    className="input"
                    value={form.clothingTypeId}
                    onChange={(e) => updateField('clothingTypeId', e.target.value)}
                  >
                    <option value="">— оберіть —</option>
                    {lookups?.types.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="admin-field admin-field--wide">
                  <span>Розміри та кількість на складі</span>
                  <div className="admin-stock-grid">
                    {lookups?.sizes.map((s) => (
                      <label key={s.id} className="admin-stock-cell">
                        <span className="admin-stock-cell__code">{s.code}</span>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          step="1"
                          inputMode="numeric"
                          placeholder="0"
                          value={stocks[s.id] ?? ''}
                          onChange={(e) => updateStock(s.id, e.target.value)}
                        />
                      </label>
                    ))}
                  </div>
                  <p className="admin-form__hint">
                    Вкажіть кількість для потрібних розмірів. Розміри з кількістю 0 або без
                    значення не будуть доступні в каталозі.
                  </p>
                </div>
              </div>

              {editing !== 'new' ? (
                <div className="admin-form__image">
                  <img
                    className="admin-form__preview"
                    src={imgSrc(editing)}
                    alt={editing.name}
                    onError={(e) => {
                      if (!e.currentTarget.dataset.fb) {
                        e.currentTarget.dataset.fb = '1'
                        e.currentTarget.src = '/api/product-images/placeholder'
                      }
                    }}
                  />
                  <label className="btn admin-upload">
                    {imgBusyId === editing.id ? 'Завантаження…' : 'Завантажити фото товару'}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      hidden
                      disabled={imgBusyId === editing.id}
                      onChange={(e) => onImageChange(editing, e.target.files?.[0])}
                    />
                  </label>
                  <p className="admin-form__hint">PNG, JPEG, WEBP або SVG, до 5 МБ.</p>
                </div>
              ) : (
                <div className="admin-form__image">
                  {pendingImage ? (
                    <img
                      className="admin-form__preview"
                      src={pendingImage.preview}
                      alt="Попередній перегляд фото товару"
                    />
                  ) : (
                    <div className="admin-form__preview admin-form__preview--empty">
                      Без фото
                    </div>
                  )}
                  <label className="btn admin-upload">
                    {pendingImage ? 'Замінити фото' : 'Вибрати фото товару'}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      hidden
                      onChange={(e) => pickNewImage(e.target.files?.[0])}
                    />
                  </label>
                  <p className="admin-form__hint">
                    Фото завантажиться автоматично після створення товару. PNG, JPEG, WEBP або
                    SVG, до 5 МБ.
                  </p>
                </div>
              )}
                </div>

                <div className="admin-form__actions admin-modal__foot">
                  <button
                    type="button"
                    className="btn btn--admin-primary"
                    disabled={saving}
                    onClick={saveForm}
                  >
                    {saving ? 'Збереження…' : editing === 'new' ? 'Створити товар' : 'Зберегти зміни'}
                  </button>
                  <button type="button" className="btn" onClick={closeForm}>
                    Закрити
                  </button>
                </div>
              </section>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
