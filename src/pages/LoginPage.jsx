import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { CatalogApiError } from '../services/catalogApi'
import { useAuth } from '../context/AuthContext'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import './LoginPage.css'

export function LoginPage() {
  useDocumentTitle('Вхід')
  const { login, user, ready } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [pending, setPending] = useState(false)

  if (ready && user) {
    return <Navigate to={from} replace />
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      await login(username.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      const msg =
        err instanceof CatalogApiError
          ? err.message
          : 'Не вдалося увійти. Перевірте, що запущено API (npm run dev).'
      setError(msg)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card panel">
        <h1 className="login-card__title">Вхід</h1>
        <p className="login-card__hint">
          Демо: <strong>admin</strong> / <strong>admin123</strong> (адмін) або{' '}
          <strong>user</strong> / <strong>user123</strong> (користувач).
        </p>
        <p className="login-card__note">
          Без входу каталог недоступний — після авторизації ви потрапите на головну.
        </p>
        {error ? (
          <div className="banner banner--error login-card__err" role="alert">
            {error}
          </div>
        ) : null}
        <form className="login-form" onSubmit={onSubmit}>
          <label className="login-field">
            <span>Логін</span>
            <input
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label className="login-field">
            <span>Пароль</span>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          <button type="submit" className="btn btn--primary" disabled={pending}>
            {pending ? 'Вхід…' : 'Увійти'}
          </button>
        </form>
      </div>
    </div>
  )
}
