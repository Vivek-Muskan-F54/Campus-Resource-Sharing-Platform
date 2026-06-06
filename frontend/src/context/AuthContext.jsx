import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { authClient } from '../api/client'

const AuthContext = createContext(null)

// ─── Storage helpers ──────────────────────────────────────────────────────────
const persistSession = data => {
  // Store access token, refresh token, and full user object separately so the
  // Axios client can read tokens without parsing the user JSON every time.
  localStorage.setItem('token',        data.accessToken || data.token)
  localStorage.setItem('refreshToken', data.refreshToken || '')
  localStorage.setItem('user',         JSON.stringify(data))
}

const clearSession = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
}

const readUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null')
  } catch {
    return null
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user, setUser] = useState(readUser)

  // Persist the full auth response (tokens + user info) and update React state
  const apply = useCallback(data => {
    persistSession(data)
    setUser(data)
  }, [])

  const login = useCallback(async form => {
    // Use authClient (no interceptors) to avoid any retry loops on login
    const res = await authClient.post('/auth/login', form)
    apply(res.data)
    return res.data
  }, [apply])

  const register = useCallback(async form => {
    const res = await authClient.post('/auth/register', form)
    apply(res.data)
    return res.data
  }, [apply])

  /**
   * Logout:
   *  1. Revoke the refresh token on the backend (fire-and-forget – don't block
   *     the UI on a network error).
   *  2. Wipe local session immediately so the UI reflects the logged-out state.
   */
  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken')

    // Clear UI state and local storage right away so the user is
    // immediately considered logged out regardless of network outcome.
    clearSession()
    setUser(null)

    if (refreshToken) {
      try {
        await authClient.post('/auth/logout', { refreshToken })
      } catch {
        // Silently ignore – the token will expire naturally even if the
        // revocation call fails (e.g. the server is temporarily unreachable).
      }
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      login,
      register,
      logout,
      isAdmin:         user?.roles?.includes('ADMIN')  ?? false,
      isAuthenticated: !!user,
    }),
    [user, login, register, logout]
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
