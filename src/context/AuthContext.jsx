import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { CatalogApiError, fetchMe, loginRequest, registerRequest } from '../services/catalogApi'
import { clearAuthToken, getAuthToken, setAuthToken } from '../services/authStorage'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  const refreshMe = useCallback(async () => {
    const t = getAuthToken()
    if (!t) {
      setUser(null)
      return
    }
    try {
      const data = await fetchMe()
      setUser(data.user ?? null)
    } catch (e) {
      if (e instanceof CatalogApiError && e.status === 401) {
        clearAuthToken()
        setUser(null)
      } else {
        setUser(null)
      }
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await refreshMe()
      if (!cancelled) setReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [refreshMe])

  const login = useCallback(async (username, password) => {
    const data = await loginRequest(username, password)
    setAuthToken(data.token)
    setUser(data.user ?? null)
    return data.user
  }, [])

  const register = useCallback(async (username, password) => {
    const data = await registerRequest(username, password)
    setAuthToken(data.token)
    setUser(data.user ?? null)
    return data.user
  }, [])

  const logout = useCallback(() => {
    clearAuthToken()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      ready,
      isAdmin: user?.role === 'admin',
      login,
      register,
      logout,
      refreshMe,
    }),
    [user, ready, login, register, logout, refreshMe],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- парний хук до провайдера
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth поза AuthProvider')
  return ctx
}
