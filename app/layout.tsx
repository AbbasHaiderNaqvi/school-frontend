import React from "react"
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/contexts/auth-context'
import { extractTenantSlugFromHost } from '@/lib/tenant'
import { API_BASE_URL } from '@/lib/api-base-url'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

const DEFAULT_ICONS = {
  icon: [
    { url: '/icon.svg', type: 'image/svg+xml' },
    { url: '/icon-light-32x32.png', sizes: '32x32', type: 'image/png' },
  ],
  apple: '/apple-icon.png',
}

export async function generateMetadata(): Promise<Metadata> {
  const base: Metadata = {
    title: 'Mudirr - School Management System',
    description: 'Comprehensive school management system',
    generator: 'v0.app',
    icons: DEFAULT_ICONS,
  }

  const host = (await headers()).get('host') || ''
  const slug = process.env.NEXT_PUBLIC_TENANT_SLUG || extractTenantSlugFromHost(host)
  if (!slug) return base

  try {
    const res = await fetch(`${API_BASE_URL}/public/tenants/${slug}`, { cache: 'no-store' })
    if (!res.ok) return base
    const data = await res.json()
    if (!data.faviconUrl) return base

    const version = data.brandingUpdatedAt ? `?v=${encodeURIComponent(data.brandingUpdatedAt)}` : ''
    return { ...base, icons: { icon: `/api/proxy/public/tenants/${slug}/favicon${version}` } }
  } catch {
    return base
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`} suppressHydrationWarning>
        <AuthProvider>
          {children}
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
