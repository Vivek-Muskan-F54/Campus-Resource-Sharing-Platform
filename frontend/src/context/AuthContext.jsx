import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { authApi } from '../api/services'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null')
    } catch {
      return null
    }
  })

  const apply = useCallback(data => {
    localStorage.setItem('token', data.token || data.accessToken)
    localStorage.setItem('user', JSON.stringify(data))
    setUser(data)
  }, [])

  const login = useCallback(async form => {
    const res = await authApi.login(form)
    apply(res.data)
    return res.data
  }, [apply])

  const register = useCallback(async form => {
    const res = await authApi.register(form)
    apply(res.data)
    return res.data
  }, [apply])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      login,
      register,
      logout,
      isAdmin: user?.roles?.includes('ADMIN') ?? false,
      isAuthenticated: !!user,
    }),
    [user, login, register, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
