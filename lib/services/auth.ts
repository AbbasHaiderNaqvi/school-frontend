import { storage, STORAGE_KEYS } from './storage'
import { api, tokenStore } from './api-client'
import { getTenantSlug } from '../tenant'
import type { User, UserRole } from '../types'

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthResponse {
  success: boolean
  user?: User
  tenant?: ApiTenant
  features?: Record<string, boolean>
  permissions?: string[]
  error?: string
}

export interface ApiTenant {
  id: string
  code: string
  slug: string
  name: string
  timezone: string
  status: string
  isActive: boolean
}

interface ApiLoginResponse {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
  refreshTokenExpiresAt: string
  user: {
    id: string
    userCode: string
    fullName: string
    email: string
    phone: string
    role: string
    status: string
    isActive: boolean
    isDeleted: boolean
    mustChangePassword: boolean
    employeeId: string | null
    studentId: string | null
    parentId: string | null
    lastLoginAt: string
    createdAt: string
    updatedAt: string
  }
  tenant: ApiTenant
  features: Record<string, boolean>
  permissions?: { flat: string[]; byModule: Record<string, string[]> }
}

function mapApiRoleToUserRole(apiRole: string): UserRole {
  const roleMap: Record<string, UserRole> = {
    super_admin: 'super_admin',
    tenant_owner: 'tenant_owner',
    tenant_admin: 'tenant_admin',
    tenant_accountant: 'tenant_accountant',
    tenant_cashier: 'tenant_cashier',
    tenant_principal: 'tenant_principal',
    teacher: 'teacher',
    hr: 'hr',
    student: 'student',
    parent: 'parent',
  }
  return roleMap[apiRole] ?? 'teacher'
}

function mapApiUserToUser(apiUser: ApiLoginResponse['user'], tenantId: string): User {
  return {
    id: apiUser.id,
    email: apiUser.email,
    name: apiUser.fullName,
    phone: apiUser.phone,
    role: mapApiRoleToUserRole(apiUser.role),
    tenantId: tenantId || null,
    linkedId: apiUser.employeeId ?? apiUser.studentId ?? apiUser.parentId ?? undefined,
    isActive: apiUser.isActive,
    createdAt: apiUser.createdAt,
    updatedAt: apiUser.updatedAt,
  }
}

const SESSION_KEY = 'mudir_session'

export const authService = {
  // Invite/reset flow: the emailed link carries a one-time token; no auth header needed.
  async setPassword(token: string, password: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await api.post('/auth/set-password', { token, password })
    if (error) return { success: false, error }
    return { success: true }
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await api.post('/auth/change-password', { currentPassword, newPassword })
    if (error) return { success: false, error }
    return { success: true }
  },

  // PATCH /auth/me — updates the signed-in user's own name/phone, then syncs
  // the locally stored session so the sidebar/header reflect it immediately.
  async updateProfile(payload: { fullName?: string; phone?: string }): Promise<{ success: boolean; error?: string }> {
    const { error } = await api.patch('/auth/me', payload)
    if (error) return { success: false, error }
    const currentUser = this.getCurrentUser()
    if (currentUser) {
      const updatedUser = {
        ...currentUser,
        ...(payload.fullName !== undefined ? { name: payload.fullName } : {}),
        ...(payload.phone !== undefined ? { phone: payload.phone } : {}),
        updatedAt: new Date().toISOString(),
      }
      storage.set(STORAGE_KEYS.CURRENT_USER, updatedUser)
      const session = this.getSession()
      if (session) storage.set(SESSION_KEY, { ...session, user: updatedUser })
    }
    return { success: true }
  },

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // --- Real API login ---
    const tenantSlug = getTenantSlug()

    const { data, error } = await api.post<ApiLoginResponse>('/auth/login', {
      email: credentials.email,
      password: credentials.password,
      tenantSlug,
    })

    if (data && data.accessToken) {
      // Store JWT tokens
      tokenStore.setTokens(data.accessToken, data.refreshToken, data.expiresIn)

      const user = mapApiUserToUser(data.user, data.tenant?.id)

      const permissions = data.permissions?.flat ?? []

      // Persist session with tenant + features + permissions
      const session = {
        user,
        tenant: data.tenant,
        features: data.features,
        permissions,
      }
      storage.set(SESSION_KEY, session)
      storage.set(STORAGE_KEYS.CURRENT_USER, user)

      return {
        success: true,
        user,
        tenant: data.tenant,
        features: data.features,
        permissions,
      }
    }

    // API returned an error
    return {
      success: false,
      error: error || 'Invalid email or password',
    }
  },

  async logout(): Promise<void> {
    // Optionally call server logout endpoint
    try {
      await api.post('/auth/logout', {})
    } catch {
      // Ignore logout API errors
    }
    tokenStore.clearTokens()
    storage.remove(STORAGE_KEYS.CURRENT_USER)
    storage.remove(SESSION_KEY)
  },

  getCurrentUser(): User | null {
    return storage.get<User>(STORAGE_KEYS.CURRENT_USER)
  },

  getSession(): { user: User; tenant: ApiTenant; features: Record<string, boolean>; permissions?: string[] } | null {
    return storage.get(SESSION_KEY)
  },

  isAuthenticated(): boolean {
    return !!this.getCurrentUser() && !!tokenStore.getAccessToken()
  },

  hasRole(roles: UserRole[]): boolean {
    const user = this.getCurrentUser()
    return user ? roles.includes(user.role) : false
  },

  async updateUser(updates: Partial<User>): Promise<User | null> {
    const currentUser = this.getCurrentUser()
    if (!currentUser) return null

    const updatedUser = { ...currentUser, ...updates, updatedAt: new Date().toISOString() }
    storage.set(STORAGE_KEYS.CURRENT_USER, updatedUser)

    // Update session too
    const session = this.getSession()
    if (session) {
      storage.set(SESSION_KEY, { ...session, user: updatedUser })
    }

    return updatedUser
  },
}
