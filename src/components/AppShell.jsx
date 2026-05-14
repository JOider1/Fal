import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './AppShell.css'

/** Оболонка для всіх сторінок після входу: навігація + обов’язкова авторизація */
export function AppShell() {
  const { user, ready, isAdmin, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  if (!ready) {
    return (
      <div className="app-shell-loading" role="status">
        Завантаження…
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return (
    <div className="app-shell-layout">
      <header className="app-shell">
        <div className="app-shell__inner">
          <nav className="app-shell__nav" aria-label="Головна навігація">
            <Link className="nav-link" to="/">
              Каталог
            </Link>
            <Link className="nav-link" to="/favorites">
              Обране
            </Link>
            {isAdmin ? (
              <Link className="nav-link" to="/admin">
                Адмін
              </Link>
            ) : null}
          </nav>
          <div className="app-shell__right">
            <span className="app-shell__user">
              {user.username}
              {isAdmin ? ' · адмін' : ' · користувач'}
            </span>
            <button
              type="button"
              className="nav-link app-shell__exit"
              onClick={() => {
                logout()
                navigate('/login', { replace: true })
              }}
            >
              Вихід
            </button>
          </div>
        </div>
      </header>
      <div className="app-shell-outlet">
        <Outlet />
      </div>
    </div>
  )
}
