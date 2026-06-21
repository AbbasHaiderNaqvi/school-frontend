/**
 * Extracts the tenant slug from the current subdomain.
 *
 *   mdgs.muddir.com  →  'mdgs'
 *   muddir.com       →  null  (main marketing domain)
 *   www.muddir.com   →  null
 *   localhost        →  NEXT_PUBLIC_TENANT_SLUG env var (dev override)
 */
export function getTenantSlug(): string | null {
  if (typeof window === 'undefined') return null

  // Local dev: set NEXT_PUBLIC_TENANT_SLUG=md-grammar in .env.local to simulate a subdomain
  if (process.env.NEXT_PUBLIC_TENANT_SLUG) {
    return process.env.NEXT_PUBLIC_TENANT_SLUG
  }

  const hostname = window.location.hostname
  const parts = hostname.split('.')

  // Need at least 3 parts (sub.domain.tld) and first part is not 'www'
  if (parts.length >= 3 && parts[0] !== 'www') {
    return parts[0]
  }

  return null
}

export function isSubdomain(): boolean {
  return getTenantSlug() !== null
}
