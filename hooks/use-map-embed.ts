'use client'

import { useEffect, useState } from 'react'
import type { TenantAddress } from '@/lib/services/branding'
import { buildGeocodeQuery, buildOsmEmbedUrl } from '@/lib/utils/contact'

// Resolves a tenant's address to real coordinates (via our cached /api/geocode
// route) and returns an embeddable OpenStreetMap URL. Null while resolving or
// if geocoding fails — callers should fall back to a static map card in that case.
export function useMapEmbedUrl(address?: TenantAddress | null): string | null {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null)
  const query = buildGeocodeQuery(address)

  useEffect(() => {
    setEmbedUrl(null)
    if (!query) return

    let cancelled = false
    fetch(`/api/geocode?q=${encodeURIComponent(query)}`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (cancelled || typeof data?.lat !== 'number' || typeof data?.lon !== 'number') return
        setEmbedUrl(buildOsmEmbedUrl(data.lat, data.lon))
      })
      .catch(() => {})

    return () => { cancelled = true }
  }, [query])

  return embedUrl
}
