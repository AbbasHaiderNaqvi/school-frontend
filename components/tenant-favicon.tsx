'use client'

import { useEffect } from 'react'
import { getTenantSlug } from '@/lib/tenant'
import { brandingService } from '@/lib/services/branding'

// Swaps the default app favicon for the tenant's uploaded favicon on subdomains.
export function TenantFavicon() {
  useEffect(() => {
    const slug = getTenantSlug()
    if (!slug) return

    brandingService.getPublicBranding(slug).then(data => {
      if (!data?.faviconUrl) return

      const href = brandingService.faviconUrl(slug, data.brandingUpdatedAt)
      document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]').forEach(link => link.remove())

      const link = document.createElement('link')
      link.rel = 'icon'
      link.href = href
      document.head.appendChild(link)
    })
  }, [])

  return null
}
