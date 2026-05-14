import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { CatalogApiError, fetchAdminSummary } from '../services/catalogApi'
import { useAuth } from '../context/AuthContext'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import './AdminPage.css'

export function AdminPage() {
  useDocumentTitle('Панель адміністратора')
  const { user, ready, isAdmin } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!ready || !isAdmin) return
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchAdminSummary()
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch((e) => {
        if (!cancelled) {
          setError(
            e instanceof CatalogApiError ? e.message : 'Не вдалося завантажити дані.',
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [ready, isAdmin])

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

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1>Панель адміністратора</h1>
      </header>

      {error ? (
        <div className="banner banner--error" role="alert">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p>Завантаження статистики…</p>
      ) : data ? (
        <ul className="admin-stats panel">
          <li>Товарів у каталозі: {data.productCount}</li>
          <li>Брендів: {data.brandCount}</li>
          <li>Облікових записів: {data.userCount}</li>
        </ul>
      ) : null}
    </div>
  )
}
