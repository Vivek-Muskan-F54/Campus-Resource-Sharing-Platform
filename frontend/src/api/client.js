import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

// ─── Primary instance used by the whole app ───────────────────────────────────
const api = axios.create({ baseURL: BASE_URL })

// ─── Separate bare instance for auth calls ────────────────────────────────────
// Uses the same base URL but has NO interceptors, so refresh / logout calls
// never themselves trigger another refresh attempt.
const authClient = axios.create({ baseURL: BASE_URL })

// ─── Token helpers ─────────────────────────────────────────────────────────────
const getAccessToken  = () => localStorage.getItem('token')
const getRefreshToken = () => localStorage.getItem('refreshToken')

const saveTokens = (accessToken, refreshToken) => {
  localStorage.setItem('token', accessToken)
  if (refreshToken) localStorage.setItem('refreshToken', refreshToken)
  // Keep the stored user object in sync with the new access token
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null')
    if (user) {
      user.token       = accessToken
      user.accessToken = accessToken
      if (refreshToken) user.refreshToken = refreshToken
      localStorage.setItem('user', JSON.stringify(user))
    }
  } catch {
    // corrupted user JSON – leave it for AuthContext to clean up
  }
}

const clearSession = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
}

// ─── Redirect to login ─────────────────────────────────────────────────────────
const redirectToLogin = () => {
  // Avoid redirect loops if the user is already on an auth page
  if (!window.location.pathname.startsWith('/login') &&
      !window.location.pathname.startsWith('/register')) {
    window.location.href = '/login'
  }
}

// ─── Refresh-token state ───────────────────────────────────────────────────────
// isRefreshing prevents multiple concurrent 401 responses from each triggering
// a separate /auth/refresh call.  All queued requests are resolved/rejected once
// the single refresh attempt settles.
let isRefreshing = false
let pendingQueue = [] // [{ resolve, reject }]

const processQueue = (error, accessToken = null) => {
  pendingQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(accessToken)
  )
  pendingQueue = []
}

// ─── Request interceptor – attach Bearer token ───────────────────────────────
api.interceptors.request.use(config => {
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ─── Response interceptor – 401 → refresh → retry ───────────────────────────
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config

    // Only attempt refresh on 401; skip if:
    //  • the failing request was itself a retry (_retry flag)
    //  • the failing endpoint is an auth endpoint (prevents loops)
    //  • there is no refresh token stored
    const is401 = error.response?.status === 401
    const isAuthEndpoint = originalRequest.url?.includes('/auth/')
    const refreshToken = getRefreshToken()

    if (!is401 || originalRequest._retry || isAuthEndpoint || !refreshToken) {
      // For any non-recoverable 401 (no refresh token, auth endpoint, or second
      // failure) wipe the session and let the caller handle the rejection.
      if (is401 && !isAuthEndpoint) {
        clearSession()
        redirectToLogin()
      }
      return Promise.reject(error)
    }

    // Mark so this request is not retried a second time
    originalRequest._retry = true

    if (isRefreshing) {
      // Another refresh is already in flight – queue this request
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

      const newAccessToken  = data.accessToken || data.token
      const newRefreshToken = data.refreshToken

      saveTokens(newAccessToken, newRefreshToken)
      processQueue(null, newAccessToken)

      // Retry the original request with the new token
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
      return api(originalRequest)
    } catch (refreshError) {
      // Refresh itself failed – session is dead
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
