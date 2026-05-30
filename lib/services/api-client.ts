// All browser requests go through the Next.js proxy to avoid CORS issues.
// The proxy (/app/api/proxy) forwards them server-side to the real backend.
// Strip any trailing slash to prevent double-slash in composed URLs.
const BASE_URL = '/api/proxy'

const TOKEN_KEY = 'mudir_access_token'
const REFRESH_TOKEN_KEY = 'mudir_refresh_token'
const TOKEN_EXPIRY_KEY = 'mudir_token_expiry'

export const tokenStore = {
  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(TOKEN_KEY)
  },
  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  },
  setTokens(accessToken: string, refreshToken: string, expiresIn: number) {
    if (typeof window === 'undefined') return
    localStorage.setItem(TOKEN_KEY, accessToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
    const expiryTime = Date.now() + expiresIn * 1000
    localStorage.setItem(TOKEN_EXPIRY_KEY, String(expiryTime))
  },
  clearTokens() {
    if (typeof window === 'undefined') return
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(TOKEN_EXPIRY_KEY)
  },
  isTokenExpired(): boolean {
    if (typeof window === 'undefined') return false
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY)
    if (!expiry) return false // No expiry stored — treat as valid, let server reject if needed
    return Date.now() > parseInt(expiry) - 30000 // 30s buffer
  },
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = tokenStore.getRefreshToken()
  if (!refreshToken) return null

  try {
    const response = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })

    if (!response.ok) {
      tokenStore.clearTokens()
      return null
    }

    const data = await response.json()
    if (data.accessToken) {
      tokenStore.setTokens(data.accessToken, data.refreshToken || refreshToken, data.expiresIn || 900)
      return data.accessToken
    }
  } catch (error) {
    console.error('[v0] Token refresh failed:', error)
    tokenStore.clearTokens()
  }

  return null
}

export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: string | null; status: number }> {
  let accessToken = tokenStore.getAccessToken()

  // Auto-refresh if token is expired
  if (accessToken && tokenStore.isTokenExpired()) {
    accessToken = await refreshAccessToken()
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    })

    // Handle 401 - try token refresh once
    if (response.status === 401 && tokenStore.getRefreshToken()) {
      const newToken = await refreshAccessToken()
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`
        const retryResponse = await fetch(`${BASE_URL}${endpoint}`, {
          ...options,
          headers,
        })
        const retryData = await retryResponse.json().catch(() => null)
        return { data: retryData, error: retryResponse.ok ? null : (retryData?.message || 'Request failed'), status: retryResponse.status }
      }
    }

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      const errorMessage = data?.message || data?.error || `HTTP ${response.status}`
      return { data: null, error: errorMessage, status: response.status }
    }

    return { data: data as T, error: null, status: response.status }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network error'
    console.error(`[v0] API request failed for ${endpoint}:`, message)
    return { data: null, error: message, status: 0 }
  }
}

export const api = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { method: 'GET', ...options }),

  post: <T>(endpoint: string, body: unknown, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
      ...options,
    }),

  put: <T>(endpoint: string, body: unknown, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
      ...options,
    }),

  patch: <T>(endpoint: string, body: unknown, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
      ...options,
    }),

  delete: <T>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { method: 'DELETE', ...options }),
}
