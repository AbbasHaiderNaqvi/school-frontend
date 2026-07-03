import { tokenStore } from './api-client'

const PROXY = '/api/proxy'

export interface TenantBranding {
  id?: string
  name?: string
  description?: string | null
  logoUrl?: string | null
  faviconUrl?: string | null
}

function authHeader(): Record<string, string> {
  const token = tokenStore.getAccessToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const brandingService = {
  async getBranding(): Promise<TenantBranding | null> {
    try {
      const res = await fetch(`${PROXY}/tenant/branding`, {
        headers: { ...authHeader(), Accept: 'application/json' },
      })
      if (!res.ok) return null
      const data: TenantBranding = await res.json()
      if (data.logoUrl) data.logoUrl = `${PROXY}${data.logoUrl}`
      if (data.faviconUrl) data.faviconUrl = `${PROXY}${data.faviconUrl}`
      return data
    } catch {
      return null
    }
  },

  async updateBranding(data: {
    description?: string
    logo?: File | null
    favicon?: File | null
  }): Promise<{ success: boolean; data?: TenantBranding; error?: string }> {
    try {
      const form = new FormData()
      if (data.description !== undefined) form.append('description', data.description)
      if (data.logo) {
        const bytes = await data.logo.arrayBuffer()
        form.append('logo', new Blob([bytes], { type: data.logo.type }), data.logo.name)
      }
      if (data.favicon) {
        const bytes = await data.favicon.arrayBuffer()
        form.append('favicon', new Blob([bytes], { type: data.favicon.type }), data.favicon.name)
      }

      const res = await fetch(`${PROXY}/tenant/branding`, {
        method: 'PATCH',
        // No Content-Type header — browser sets it automatically with multipart boundary
        headers: authHeader(),
        body: form,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as Record<string, string>
        return { success: false, error: err.message || 'Failed to update branding' }
      }
      const updated: TenantBranding = await res.json().catch(() => ({}))
      if (updated.logoUrl) updated.logoUrl = `${PROXY}${updated.logoUrl}`
      if (updated.faviconUrl) updated.faviconUrl = `${PROXY}${updated.faviconUrl}`
      return { success: true, data: updated }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Network error' }
    }
  },

  async deleteLogo(): Promise<void> {
    await fetch(`${PROXY}/tenant/branding/logo`, {
      method: 'DELETE',
      headers: authHeader(),
    })
  },

  async deleteFavicon(): Promise<void> {
    await fetch(`${PROXY}/tenant/branding/favicon`, {
      method: 'DELETE',
      headers: authHeader(),
    })
  },

  // Unauthenticated — public endpoint, no token needed
  async getPublicBranding(slug: string): Promise<TenantBranding | null> {
    try {
      const res = await fetch(`${PROXY}/public/tenants/${slug}`, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      })
      if (!res.ok) return null
      const data: TenantBranding = await res.json()
      if (data.logoUrl) data.logoUrl = `${PROXY}${data.logoUrl}`
      if (data.faviconUrl) data.faviconUrl = `${PROXY}${data.faviconUrl}`
      return data
    } catch {
      return null
    }
  },

  // Direct URL to the logo image for a given slug (unauthenticated CDN endpoint)
  logoUrl(slug: string): string {
    return `${PROXY}/public/tenants/${slug}/logo`
  },

  faviconUrl(slug: string): string {
    return `${PROXY}/public/tenants/${slug}/favicon`
  },
}
