import type { TenantAddress, TenantContact } from '@/lib/services/branding'

export function formatAddress(address?: TenantAddress | null): string | null {
  if (!address) return null
  const cityState = [address.city, address.state].filter(Boolean).join(', ')
  const parts = [address.line1, address.line2, cityState, address.postalCode, address.country].filter(Boolean)
  return parts.length ? parts.join(', ') : null
}

export function hasContactInfo(contact?: TenantContact | null, address?: TenantAddress | null): boolean {
  return Boolean(
    formatAddress(address) || contact?.phone || contact?.whatsapp || contact?.email || contact?.websiteUrl
  )
}

// City/state/country geocodes far more reliably than the full address (line1
// often has building/street detail a free geocoder can't resolve).
export function buildGeocodeQuery(address?: TenantAddress | null): string | null {
  if (!address) return null
  const parts = [address.city, address.state, address.country].filter(Boolean)
  if (parts.length) return parts.join(', ')
  return formatAddress(address)
}

// OpenStreetMap's own embed view — unlike Google's, it doesn't set X-Frame-Options,
// so it actually renders in a cross-origin iframe without needing an API key.
export function buildOsmEmbedUrl(lat: number, lon: number, delta = 0.01): string {
  const bbox = `${lon - delta},${lat - delta},${lon + delta},${lat + delta}`
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`
}
