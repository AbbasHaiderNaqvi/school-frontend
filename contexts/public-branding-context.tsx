'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { getTenantSlug } from '@/lib/tenant'
import { brandingService, type TenantBranding } from '@/lib/services/branding'

interface PublicBrandingContextType {
  slug: string | null
  branding: TenantBranding | null
  isLoading: boolean
}

const PublicBrandingContext = createContext<PublicBrandingContextType | undefined>(undefined)

// Mounted once in the root layout, so the public branding fetch runs a single
// time per site visit and is shared across all pre-auth pages (landing,
// login, ...) instead of each page re-fetching on navigation.
export function PublicBrandingProvider({ children }: { children: ReactNode }) {
  const [slug, setSlug] = useState<string | null>(null)
  const [branding, setBranding] = useState<TenantBranding | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const detectedSlug = getTenantSlug()
    setSlug(detectedSlug)
    if (!detectedSlug) {
      setIsLoading(false)
      return
    }
    brandingService.getPublicBranding(detectedSlug).then(data => {
      setBranding(data)
      setIsLoading(false)
    })
  }, [])

  return (
    <PublicBrandingContext.Provider value={{ slug, branding, isLoading }}>
      {children}
    </PublicBrandingContext.Provider>
  )
}

export function usePublicBranding() {
  const context = useContext(PublicBrandingContext)
  if (context === undefined) {
    throw new Error('usePublicBranding must be used within a PublicBrandingProvider')
  }
  return context
}
