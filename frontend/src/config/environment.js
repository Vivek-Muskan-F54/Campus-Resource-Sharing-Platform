const API_PRODUCTION_URL = 'https://campus-resource-sharing-platform.onrender.com/api'
const WS_PRODUCTION_URL = 'https://campus-resource-sharing-platform.onrender.com/ws'
const API_DEVELOPMENT_URL = 'http://localhost:8080/api'
const WS_DEVELOPMENT_URL = 'http://localhost:8080/ws'

const isDevelopment = import.meta.env.DEV

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || (isDevelopment ? API_DEVELOPMENT_URL : API_PRODUCTION_URL)

export const WS_BASE_URL =
  import.meta.env.VITE_WS_URL || (isDevelopment ? WS_DEVELOPMENT_URL : WS_PRODUCTION_URL)
