import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { CatalogApiError } from '../services/catalogApi'
import { useAuth } from '../context/AuthContext'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import './LoginPage.css'

export function LoginPage() {
  const isRegister = useLocation().pathname === '/register'
  useDocumentTitle(isRegister ? 'Реєстрація' : 'Вхід')

  const { login, register, user, ready } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError] = useState(null)
  const [pending, setPending] = useState(false)

  if (ready && user) {
    return <Navigate to={from} replace />
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (isRegister && password !== password2) {
      setError('Паролі не збігаються')
      return
    }

    setPending(true)
    try {
      if (isRegister) {
        await register(username.trim(), password)
      } else {
        await login(username.trim(), password)
      }
      navigate(from, { replace: true })
    } catch (err) {
      const msg =
        err instanceof CatalogApiError
          ? err.message
          : isRegister
            ? 'Не вдалося зареєструватися. Перевірте, що запущено API (npm run dev).'
            : 'Не вдалося увійти. Перевірте, що запущено API (npm run dev).'
      setError(msg)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card panel">
        <h1 className="login-card__title">{isRegister ? 'Реєстрація' : 'Вхід'}</h1>

        {!isRegister ? (
          <p className="login-card__hint">
            Демо: <strong>admin</strong> / <strong>admin123</strong> або{' '}
            <strong>user</strong> / <strong>user123</strong>.
          </p>
        ) : (
          <p className="login-card__hint">
            Створіть обліковий запис. Логін — від 3 символів, пароль — від 6.
          </p>
        )}

        <p className="login-card__note">
          {isRegister ? (
            <>
              Уже є акаунт?{' '}
              <Link className="login-card__link" to="/login" state={location.state}>
                Увійти
              </Link>
            </>
          ) : (
            <>
              Немає акаунта?{' '}
              <Link className="login-card__link" to="/register" state={location.state}>
                Зареєструватися
              </Link>
            </>
          )}
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
              minLength={isRegister ? 3 : 1}
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
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              minLength={isRegister ? 6 : 1}
              required
            />
          </label>
          {isRegister ? (
            <label className="login-field">
              <span>Повтор пароля</span>
              <input
                className="input"
                type="password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
              />
            </label>
          ) : null}
          <button type="submit" className="btn btn--primary" disabled={pending}>
            {pending
              ? isRegister
                ? 'Реєстрація…'
                : 'Вхід…'
              : isRegister
                ? 'Зареєструватися'
                : 'Увійти'}
          </button>
        </form>
      </div>
    </div>
  )
}
