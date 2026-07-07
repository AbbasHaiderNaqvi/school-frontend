'use client'

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { authService, type LoginCredentials, type ApiTenant } from '@/lib/services/auth'
import { tokenStore } from '@/lib/services/api-client'
import { brandingService, type TenantBranding } from '@/lib/services/branding'
import type { User } from '@/lib/types'

interface AuthContextType {
  user: User | null
  tenant: ApiTenant | null
  branding: TenantBranding | null
  features: Record<string, boolean>
  permissions: string[]
  isLoading: boolean
  isAuthenticated: boolean
  /** Returns true if the current user has the given permission string */
  can: (permission: string) => boolean
  /** Returns true if the user has ANY of the given permission strings */
  canAny: (...perms: string[]) => boolean
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refreshUser: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const DEFAULT_FEATURES: Record<string, boolean> = {
  academics: true,
  attendance: true,
  fees: true,
  finance: true,
  hr: true,
  inventory: true,
  reports: true,
  settings: true,
  users: true,
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [tenant, setTenant] = useState<ApiTenant | null>(null)
  const [branding, setBranding] = useState<TenantBranding | null>(null)
  const [features, setFeatures] = useState<Record<string, boolean>>(DEFAULT_FEATURES)
  const [permissions, setPermissions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadUser = useCallback(() => {
    const session = authService.getSession()

    if (session?.user && tokenStore.getAccessToken()) {
      setUser(session.user)
      setTenant(session.tenant ?? null)
      setFeatures(session.features ?? DEFAULT_FEATURES)
      setPermissions(session.permissions ?? [])
      brandingService.getBranding().then(setBranding)
    } else {
      setUser(null)
      setTenant(null)
      setFeatures(DEFAULT_FEATURES)
      setPermissions([])
      setBranding(null)
    }

    setIsLoading(false)
  }, [])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true)
    const result = await authService.login(credentials)

    if (result.success && result.user) {
      setUser(result.user)
      setTenant(result.tenant ?? null)
      setFeatures(result.features ?? DEFAULT_FEATURES)
      setPermissions(result.permissions ?? [])
      brandingService.getBranding().then(setBranding)
    }

    setIsLoading(false)
    return { success: result.success, error: result.error }
  }

  const logout = async () => {
    await authService.logout()
    setUser(null)
    setTenant(null)
    setBranding(null)
    setFeatures(DEFAULT_FEATURES)
    setPermissions([])
  }

  const refreshUser = () => {
    loadUser()
  }

  const can = (permission: string) => permissions.includes(permission)
  const canAny = (...perms: string[]) => perms.some(p => permissions.includes(p))

  return (
    <AuthContext.Provider
      value={{
        user,
        tenant,
        branding,
        features,
        permissions,
        isLoading,
        isAuthenticated: !!user,
        can,
        canAny,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Alias used by some pages
export const useUser = useAuth
