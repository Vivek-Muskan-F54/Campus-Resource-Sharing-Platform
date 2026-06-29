import axios from 'axios'
import { API_BASE_URL } from '../config/environment'

const api = axios.create({ baseURL: API_BASE_URL })
const authClient = axios.create({ baseURL: API_BASE_URL })

const getAccessToken = () => localStorage.getItem('token')
const getRefreshToken = () => localStorage.getItem('refreshToken')

const saveTokens = (accessToken, refreshToken) => {
  localStorage.setItem('token', accessToken)
  if (refreshToken) localStorage.setItem('refreshToken', refreshToken)
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null')
    if (user) {
      user.token = accessToken
      user.accessToken = accessToken
      if (refreshToken) user.refreshToken = refreshToken
      localStorage.setItem('user', JSON.stringify(user))
    }
  } catch {
    // corrupted user JSON - leave it for AuthContext to clean up
  }
}

const clearSession = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
}

const redirectToLogin = () => {
  if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
    window.location.href = '/login'
  }
}

let isRefreshing = false
let pendingQueue = []

const processQueue = (error, accessToken = null) => {
  pendingQueue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve(accessToken)))
  pendingQueue = []
}

api.interceptors.request.use(config => {
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config
    const is401 = error.response?.status === 401
    const isAuthEndpoint = originalRequest.url?.includes('/auth/')
    const refreshToken = getRefreshToken()

    if (!is401 || originalRequest._retry || isAuthEndpoint || !refreshToken) {
      if (is401 && !isAuthEndpoint) {
        clearSession()
        redirectToLogin()
      }
      return Promise.reject(error)
    }

    originalRequest._retry = true

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject })
      }).then(accessToken => {
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return api(originalRequest)
      })
    }

    isRefreshing = true

    try {
      const { data } = await authClient.post('/auth/refresh', { refreshToken })

      const newAccessToken = data.accessToken || data.token
      const newRefreshToken = data.refreshToken

      saveTokens(newAccessToken, newRefreshToken)
      processQueue(null, newAccessToken)

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
      return api(originalRequest)
    } catch (refreshError) {
      processQueue(refreshError, null)
      clearSession()
      redirectToLogin()
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)

export { authClient }
export default api
