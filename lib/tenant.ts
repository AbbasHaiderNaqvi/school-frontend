/**
 * Extracts the tenant slug from a hostname.
 *
 *   mdgs.muddir.com  →  'mdgs'
 *   muddir.com       →  null  (main marketing domain)
 *   www.muddir.com   →  null
 */
export function extractTenantSlugFromHost(hostname: string): string | null {
  const parts = hostname.split(':')[0].split('.')

  // Need at least 3 parts (sub.domain.tld) and first part is not 'www'
  if (parts.length >= 3 && parts[0] !== 'www') {
    return parts[0]
  }

  return null
}

/**
 * Client-side tenant slug detection, from the current subdomain.
 *
 *   localhost → NEXT_PUBLIC_TENANT_SLUG env var (dev override)
 */
export function getTenantSlug(): string | null {
  if (typeof window === 'undefined') return null

  // Local dev: set NEXT_PUBLIC_TENANT_SLUG=md-grammar in .env.local to simulate a subdomain
  if (process.env.NEXT_PUBLIC_TENANT_SLUG) {
    return process.env.NEXT_PUBLIC_TENANT_SLUG
  }

  return extractTenantSlugFromHost(window.location.hostname)
}

export function isSubdomain(): boolean {
  return getTenantSlug() !== null
}
