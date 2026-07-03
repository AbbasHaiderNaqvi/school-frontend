'use client'

import React from "react"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { AppSidebar, MobileTopBar } from '@/components/layout/app-sidebar'
import { LayoutSkeleton } from '@/components/ui/page-skeleton'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isLoading, isAuthenticated, router])

  if (isLoading) {
    return <LayoutSkeleton />
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <MobileTopBar />
      <main className="lg:pl-64 pt-14 lg:pt-0">
        <div className="p-4 sm:p-6">{children}</div>
      </main>
    </div>
  )
}
