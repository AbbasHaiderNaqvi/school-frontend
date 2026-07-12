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
