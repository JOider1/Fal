import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './AppShell.css'

/** Оболонка сторінок: каталог відкритий для всіх, обране/адмінка — для авторизованих */
export function AppShell() {
  const { user, ready, isAdmin, logout } = useAuth()
  const navigate = useNavigate()

  if (!ready) {
    return (
      <div className="app-shell-loading" role="status">
        Завантаження…
      </div>
    )
  }

  return (
    <div className="app-shell-layout">
      <header className="app-shell">
        <div className="app-shell__inner">
          <nav className="app-shell__nav" aria-label="Головна навігація">
            <Link className="nav-link" to="/">
              Каталог
            </Link>
            {user ? (
              <Link className="nav-link" to="/favorites">
                Обране
              </Link>
            ) : null}
            {isAdmin ? (
              <Link className="nav-link" to="/admin">
                Адмін
              </Link>
            ) : null}
          </nav>
          <div className="app-shell__right">
            {user ? (
              <>
                <span className="app-shell__user">
                  {user.username}
                  {isAdmin ? ' · адмін' : ' · користувач'}
                </span>
                <button
                  type="button"
                  className="nav-link app-shell__exit"
                  onClick={() => {
                    logout()
                    navigate('/', { replace: true })
                  }}
                >
                  Вихід
                </button>
              </>
            ) : (
              <Link className="nav-link app-shell__exit" to="/login">
                Вхід
              </Link>
            )}
          </div>
        </div>
      </header>
      <div className="app-shell-outlet">
        <Outlet />
      </div>
    </div>
  )
}
