'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { inventoryService } from '@/lib/services/inventory'
import {
  Package, Tags, MapPin, Boxes, ClipboardList, Settings2, Truck, PackageMinus,
} from 'lucide-react'
import { TablePageSkeleton } from '@/components/ui/page-skeleton'

export default function InventoryOverviewPage() {
  const { can } = useAuth()

  const [stats, setStats] = useState({
    totalItems: 0,
    totalCategories: 0,
    totalLocations: 0,
    stockBuckets: 0,
    pendingAdjustments: 0,
    glIntegrationEnabled: false,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const loadStats = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const [items, categories, locations, stock, adjustments, settings] = await Promise.all([
        inventoryService.getItems({ limit: 1 }),
        inventoryService.getCategories({ limit: 1 }),
        inventoryService.getLocations({ limit: 1 }),
        inventoryService.getStock({ limit: 1 }),
        can('inventory.adjustment.read') ? inventoryService.getAdjustments({ limit: 1, status: 'PENDING' }) : Promise.resolve({ data: [], total: 0, page: 1, limit: 1 }),
        can('inventory.settings.read') ? inventoryService.getSettings() : Promise.resolve(null),
      ])

      setStats({
        totalItems: items.total,
        totalCategories: categories.total,
        totalLocations: locations.total,
        stockBuckets: stock.total,
        pendingAdjustments: adjustments.total,
        glIntegrationEnabled: !!settings?.glIntegrationEnabled,
      })
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load inventory overview.')
    } finally {
      setIsLoading(false)
    }
  }, [can])

  useEffect(() => { loadStats() }, [loadStats])

  if (isLoading) return <TablePageSkeleton />

  const quickLinks = [
    { href: '/dashboard/inventory/items', label: 'Manage Items', description: 'The item catalogue — add, edit, retire', icon: Package },
    { href: '/dashboard/inventory/categories', label: 'Categories & Units', description: 'Organise items by category and unit of measure', icon: Tags },
    { href: '/dashboard/inventory/locations', label: 'Storage Locations', description: 'Campus, building, room, cabinet, shelf, bin', icon: MapPin },
    { href: '/dashboard/inventory/grns', label: 'Receive Stock', description: 'Record a vendor purchase, opening balance, or donation', icon: Truck },
    { href: '/dashboard/inventory/issues', label: 'Issue Stock', description: 'Issue to a department, class, employee, or purpose', icon: PackageMinus },
    { href: '/dashboard/inventory/stock', label: 'Find Stock', description: 'Search current stock by item, code, or location', icon: Boxes },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Inventory Overview</h1>
        <p className="text-muted-foreground">The school's physical stock, tracked down to the exact location it sits in</p>
      </div>

      {loadError && <Alert variant="destructive"><AlertDescription>{loadError}</AlertDescription></Alert>}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalItems}</div>
            <p className="text-xs text-muted-foreground">Items in the catalogue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Tags className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCategories}</div>
            <p className="text-xs text-muted-foreground">Item categories defined</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Locations</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLocations}</div>
            <p className="text-xs text-muted-foreground">Nodes in the location tree</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Buckets</CardTitle>
            <Boxes className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.stockBuckets}</div>
            <p className="text-xs text-muted-foreground">Item × location × condition combinations with stock</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Adjustments</CardTitle>
            <ClipboardList className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingAdjustments}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">GL Integration</CardTitle>
            <Settings2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge variant={stats.glIntegrationEnabled ? 'default' : 'secondary'}>
              {stats.glIntegrationEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">Stock movements post to the ledger when on</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common inventory tasks</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {quickLinks.map(link => (
            <Link key={link.href} href={link.href} className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent transition-colors">
              <link.icon className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <div className="font-medium">{link.label}</div>
                <div className="text-sm text-muted-foreground">{link.description}</div>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
