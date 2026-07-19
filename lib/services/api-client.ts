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

// When the refresh token itself is rejected the session is over — clear
// everything and send the user to sign in (unless already on a public page).
function onSessionExpired() {
  tokenStore.clearTokens()
  if (typeof window === 'undefined') return
  localStorage.removeItem('mudir_session')
  localStorage.removeItem('erp_current_user')
  const path = window.location.pathname
  if (path.startsWith('/login') || path.startsWith('/set-password') || path === '/') return
  window.location.href = '/login'
}

// Single-flight: concurrent requests with an expired token must share ONE
// refresh call — the backend rotates refresh tokens, so parallel refreshes
// would invalidate each other and randomly log the user out.
let refreshInFlight: Promise<string | null> | null = null

function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight
  refreshInFlight = doRefreshAccessToken().finally(() => { refreshInFlight = null })
  return refreshInFlight
}

async function doRefreshAccessToken(): Promise<string | null> {
  const refreshToken = tokenStore.getRefreshToken()
  if (!refreshToken) return null

  try {
    const response = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })

    if (!response.ok) {
      onSessionExpired()
      return null
    }

    const raw = await response.json().catch(() => null)
    // Accept both bare { accessToken, … } and enveloped { data: { accessToken, … } }.
    const data = (raw?.data && typeof raw.data === 'object' && 'accessToken' in raw.data ? raw.data : raw) ?? {}
    if (data.accessToken) {
      tokenStore.setTokens(data.accessToken, data.refreshToken || refreshToken, data.expiresIn || 900)
      return data.accessToken
    }
  } catch (error) {
    console.error('[api] Token refresh failed:', error)
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

// For endpoints that return a real file (e.g. a report with ?format=pdf/csv/xlsx)
// instead of JSON. apiRequest always calls response.json(), which would corrupt
// binary content, so this fetches the blob directly and triggers a download —
// same Blob→createObjectURL→click pattern already used for receipt printing.
export async function apiDownload(endpoint: string, fallbackFilename: string): Promise<{ success: boolean; error?: string }> {
  let accessToken = tokenStore.getAccessToken()
  if (accessToken && tokenStore.isTokenExpired()) {
    accessToken = await refreshAccessToken()
  }

  const headers: Record<string, string> = {}
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, { headers })

    if (!response.ok) {
      const errData = await response.json().catch(() => null)
      return { success: false, error: errData?.message || errData?.error || `HTTP ${response.status}` }
    }

    const blob = await response.blob()
    const disposition = response.headers.get('Content-Disposition')
    const filename = disposition?.match(/filename="?([^"]+)"?/)?.[1] || fallbackFilename

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)

    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Download failed' }
  }
}

// Normalizes any paginated-shaped response from the API, handling three cases:
//   1. null/undefined       → empty page
//   2. bare array  []       → wraps into { data, total, page, limit }
//   3. { data:[] } (partial)→ fills missing total/page/limit with safe defaults
export function toPaginated<T>(raw: unknown): { data: T[]; total: number; page: number; limit: number } {
  const empty = { data: [] as T[], total: 0, page: 1, limit: 20 }
  if (!raw) return empty
  if (Array.isArray(raw)) {
    return { data: raw as T[], total: raw.length, page: 1, limit: raw.length || 20 }
  }
  const p = raw as Record<string, unknown>
  if (!Array.isArray(p.data)) return empty
  // Support both { data, total, page, limit } and { data, meta: { total, page, limit } }
  const meta = p.meta as Record<string, unknown> | undefined
  return {
    data: p.data as T[],
    total: typeof meta?.total === 'number' ? meta.total : typeof p.total === 'number' ? p.total : (p.data as T[]).length,
    page: typeof meta?.page === 'number' ? meta.page : typeof p.page === 'number' ? p.page : 1,
    limit: typeof meta?.limit === 'number' ? meta.limit : typeof p.limit === 'number' ? p.limit : 20,
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
