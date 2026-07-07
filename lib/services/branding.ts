import { tokenStore } from './api-client'

const PROXY = '/api/proxy'

export interface TenantTheme {
  primaryColor?: string | null
  secondaryColor?: string | null
  backgroundColor?: string | null
}

// Read shape — GET /tenant/branding and GET /public/tenants/{slug} nest these,
// even though PATCH /tenant/branding takes the same fields flat (see updateBranding).
export interface TenantContact {
  email?: string | null
  phone?: string | null
  whatsapp?: string | null
  telegram?: string | null
  websiteUrl?: string | null
  fax?: string | null
}

export interface TenantAddress {
  line1?: string | null
  line2?: string | null
  city?: string | null
  state?: string | null
  postalCode?: string | null
  country?: string | null
  googleMapsUrl?: string | null
}

export interface TenantSystemSettings {
  timezone?: string | null
  currency?: string | null
  currencySymbol?: string | null
  academicYear?: string | null
}

export interface TenantBranding {
  id?: string
  tenantId?: string
  slug?: string
  name?: string
  description?: string | null
  logoUrl?: string | null
  faviconUrl?: string | null
  logoMime?: string | null
  faviconMime?: string | null
  brandingUpdatedAt?: string | null
  contact?: TenantContact | null
  address?: TenantAddress | null
  system?: TenantSystemSettings | null
  theme?: TenantTheme | null
}

function authHeader(): Record<string, string> {
  const token = tokenStore.getAccessToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// Appends a cache-busting query param so browsers re-fetch the image after a re-upload
// instead of serving a stale cached response for the same static URL.
function withCacheBust(url: string, version?: string | null): string {
  if (!version) return url
  return `${url}?v=${encodeURIComponent(version)}`
}

export const brandingService = {
  async getBranding(): Promise<TenantBranding | null> {
    try {
      const res = await fetch(`${PROXY}/tenant/branding`, {
        headers: { ...authHeader(), Accept: 'application/json' },
      })
      if (!res.ok) return null
      const data: TenantBranding = await res.json()
      if (data.logoUrl) data.logoUrl = withCacheBust(`${PROXY}${data.logoUrl}`, data.brandingUpdatedAt)
      if (data.faviconUrl) data.faviconUrl = withCacheBust(`${PROXY}${data.faviconUrl}`, data.brandingUpdatedAt)
      return data
    } catch {
      return null
    }
  },

  async updateBranding(data: {
    name?: string
    description?: string
    email?: string
    phone?: string
    whatsapp?: string
    telegram?: string
    websiteUrl?: string
    fax?: string
    addressLine1?: string
    addressLine2?: string
    city?: string
    state?: string
    postalCode?: string
    country?: string
    googleMapsUrl?: string
    theme?: TenantTheme
    logo?: File | null
    favicon?: File | null
  }): Promise<{ success: boolean; data?: TenantBranding; error?: string }> {
    try {
      const form = new FormData()
      if (data.name !== undefined) form.append('name', data.name)
      if (data.description !== undefined) form.append('description', data.description)
      if (data.email !== undefined) form.append('email', data.email)
      if (data.phone !== undefined) form.append('phone', data.phone)
      if (data.whatsapp !== undefined) form.append('whatsapp', data.whatsapp)
      if (data.telegram !== undefined) form.append('telegram', data.telegram)
      if (data.websiteUrl !== undefined) form.append('websiteUrl', data.websiteUrl)
      if (data.fax !== undefined) form.append('fax', data.fax)
      if (data.addressLine1 !== undefined) form.append('addressLine1', data.addressLine1)
      if (data.addressLine2 !== undefined) form.append('addressLine2', data.addressLine2)
      if (data.city !== undefined) form.append('city', data.city)
      if (data.state !== undefined) form.append('state', data.state)
      if (data.postalCode !== undefined) form.append('postalCode', data.postalCode)
      if (data.country !== undefined) form.append('country', data.country)
      if (data.googleMapsUrl !== undefined) form.append('googleMapsUrl', data.googleMapsUrl)
      if (data.theme !== undefined) form.append('theme', JSON.stringify(data.theme))
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
      if (updated.logoUrl) updated.logoUrl = withCacheBust(`${PROXY}${updated.logoUrl}`, updated.brandingUpdatedAt)
      if (updated.faviconUrl) updated.faviconUrl = withCacheBust(`${PROXY}${updated.faviconUrl}`, updated.brandingUpdatedAt)
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
      if (data.logoUrl) data.logoUrl = withCacheBust(`${PROXY}${data.logoUrl}`, data.brandingUpdatedAt)
      if (data.faviconUrl) data.faviconUrl = withCacheBust(`${PROXY}${data.faviconUrl}`, data.brandingUpdatedAt)
      return data
    } catch {
      return null
    }
  },

  // Direct URL to the logo image for a given slug (unauthenticated CDN endpoint)
  logoUrl(slug: string, version?: string | null): string {
    return withCacheBust(`${PROXY}/public/tenants/${slug}/logo`, version)
  },

  faviconUrl(slug: string, version?: string | null): string {
    return withCacheBust(`${PROXY}/public/tenants/${slug}/favicon`, version)
  },
}
