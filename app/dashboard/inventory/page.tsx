'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { inventoryService } from '@/lib/services/inventory'
import { useUser } from '@/lib/hooks/use-user'
import { Package, TrendingDown, AlertCircle, DollarSign, Archive, Activity } from 'lucide-react'

export default function InventoryOverviewPage() {
  const { user } = useUser()
  const [stats, setStats] = useState({
    totalItems: 0,
    totalValue: 0,
    lowStock: 0,
    outOfStock: 0,
    totalAssets: 0,
    recentMovements: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [user])

  const loadStats = async () => {
    if (!user?.tenantId) return

    try {
      setLoading(true)
      const [items, assets, movements] = await Promise.all([
        inventoryService.getInventoryItems(user.tenantId),
        inventoryService.getAssets(user.tenantId),
        inventoryService.getMovementHistory(user.tenantId),
      ])

      const lowStockItems = items.filter(i => i.quantity <= i.reorderLevel && i.quantity > 0)
      const outOfStockItems = items.filter(i => i.quantity === 0)
      const totalValue = items.reduce((sum, item) => sum + (item.quantity * (item.unitPrice || 0)), 0)
      const recentMovements = movements.filter(m => {
        const movementDate = new Date(m.date)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        return movementDate >= thirtyDaysAgo
      }).length

      setStats({
        totalItems: items.length,
        totalValue,
        lowStock: lowStockItems.length,
        outOfStock: outOfStockItems.length,
        totalAssets: assets.length,
        recentMovements,
      })
    } catch (error) {
      console.error('[v0] Error loading inventory stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Inventory Overview</h1>
          <p className="text-muted-foreground">Loading inventory statistics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Inventory Overview</h1>
        <p className="text-muted-foreground">Comprehensive view of inventory and assets</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalItems}</div>
            <p className="text-xs text-muted-foreground">Inventory items tracked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Current inventory value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <TrendingDown className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.lowStock}</div>
            <p className="text-xs text-muted-foreground">Items below reorder level</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.outOfStock}</div>
            <p className="text-xs text-muted-foreground">Items out of stock</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <Archive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAssets}</div>
            <p className="text-xs text-muted-foreground">Fixed assets registered</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Movements</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentMovements}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common inventory tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <a href="/dashboard/inventory/items" className="block p-3 rounded-lg hover:bg-accent transition-colors">
              <div className="font-medium">Manage Items</div>
              <div className="text-sm text-muted-foreground">View and update inventory items</div>
            </a>
            <a href="/dashboard/inventory/movements" className="block p-3 rounded-lg hover:bg-accent transition-colors">
              <div className="font-medium">Record Movement</div>
              <div className="text-sm text-muted-foreground">Add purchase, usage, or adjustment</div>
            </a>
            <a href="/dashboard/inventory/assets" className="block p-3 rounded-lg hover:bg-accent transition-colors">
              <div className="font-medium">Manage Assets</div>
              <div className="text-sm text-muted-foreground">View and track fixed assets</div>
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inventory Health</CardTitle>
            <CardDescription>Status summary</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">In Stock</span>
              <Badge variant="default">{stats.totalItems - stats.outOfStock} items</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Low Stock</span>
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">{stats.lowStock} items</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Out of Stock</span>
              <Badge variant="destructive">{stats.outOfStock} items</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
