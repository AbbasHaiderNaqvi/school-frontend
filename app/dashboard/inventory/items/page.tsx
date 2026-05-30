'use client'

import React, { useState, useMemo } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Edit2, Trash2, AlertTriangle, Package, TrendingDown } from 'lucide-react'
import type { InventoryItem, InventoryMovement } from '@/lib/types'
import { generateId } from '@/lib/utils'

export default function InventoryPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<InventoryItem[]>([
    {
      id: '1',
      tenantId: user?.tenantId || '',
      name: 'Textbook - English Class 9',
      category: 'Books',
      sku: 'TXT-ENG-09',
      quantity: 45,
      reorderLevel: 20,
      reorderQuantity: 50,
      unitPrice: 250,
      location: 'Library Shelf A1',
      supplier: 'National Books',
      status: 'in_stock',
      lastRestocked: '2025-01-15',
      movementHistory: [
        {
          id: '1',
          movementType: 'purchase',
          quantity: 50,
          toLocation: 'Library Shelf A1',
          reason: 'Initial stock',
          reference: 'PO-2025-001',
          movedBy: 'admin',
          movedByName: 'Admin',
          date: '2025-01-15',
        },
      ],
      createdAt: '2025-01-10',
      updatedAt: '2025-01-15',
    },
    {
      id: '2',
      tenantId: user?.tenantId || '',
      name: 'Lab Equipment - Microscope',
      category: 'Equipment',
      sku: 'LAB-MIC-001',
      quantity: 8,
      reorderLevel: 5,
      reorderQuantity: 5,
      unitPrice: 15000,
      location: 'Science Lab',
      supplier: 'Science Suppliers Ltd',
      status: 'in_stock',
      lastRestocked: '2025-01-10',
      movementHistory: [],
      createdAt: '2025-01-05',
      updatedAt: '2025-01-10',
    },
    {
      id: '3',
      tenantId: user?.tenantId || '',
      name: 'Office Paper - A4 (500 sheets)',
      category: 'Supplies',
      sku: 'OFC-PAP-A4',
      quantity: 12,
      reorderLevel: 25,
      reorderQuantity: 50,
      unitPrice: 350,
      location: 'Office Store',
      supplier: 'Office Supplies Co',
      status: 'low_stock',
      lastRestocked: '2024-12-20',
      movementHistory: [],
      createdAt: '2024-12-01',
      updatedAt: '2025-01-01',
    },
  ])

  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [newItem, setNewItem] = useState<Partial<InventoryItem>>({})
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.sku.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = filterStatus === 'all' || item.status === filterStatus
      return matchesSearch && matchesStatus
    })
  }, [items, searchTerm, filterStatus])

  const stats = {
    totalItems: items.length,
    lowStockItems: items.filter(i => i.status === 'low_stock').length,
    outOfStock: items.filter(i => i.status === 'out_of_stock').length,
    totalValue: items.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0),
  }

  const handleAddItem = () => {
    if (newItem.name && newItem.sku && newItem.quantity !== undefined) {
      const item: InventoryItem = {
        id: generateId(),
        tenantId: user?.tenantId || '',
        name: newItem.name,
        sku: newItem.sku,
        category: newItem.category || 'General',
        quantity: newItem.quantity,
        reorderLevel: newItem.reorderLevel || 10,
        reorderQuantity: newItem.reorderQuantity || 20,
        unitPrice: newItem.unitPrice || 0,
        location: newItem.location || 'Storage',
        supplier: newItem.supplier || '',
        status: newItem.quantity! <= (newItem.reorderLevel || 10) ? 'low_stock' : 'in_stock',
        lastRestocked: new Date().toISOString().split('T')[0],
        movementHistory: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      setItems([...items, item])
      setNewItem({})
      setIsAddingItem(false)
    }
  }

  const handleDeleteItem = (id: string) => {
    setItems(items.filter(item => item.id !== id))
  }

  const handleRecordMovement = (itemId: string, quantity: number, movementType: string, reason: string) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        const newQuantity = movementType === 'usage' || movementType === 'adjustment'
          ? item.quantity - quantity
          : item.quantity + quantity

        const movement: InventoryMovement = {
          id: generateId(),
          movementType: movementType as any,
          quantity,
          reason,
          movedBy: user?.id || '',
          movedByName: user?.name || '',
          date: new Date().toISOString(),
        }

        return {
          ...item,
          quantity: newQuantity,
          status: newQuantity === 0 ? 'out_of_stock' : newQuantity <= item.reorderLevel ? 'low_stock' : 'in_stock',
          lastMovement: new Date().toISOString(),
          movementHistory: [...(item.movementHistory || []), movement],
          updatedAt: new Date().toISOString(),
        }
      }
      return item
    }))
  }

  return (
    <div className="flex-1 space-y-8 p-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Inventory Management</h1>
        <p className="text-muted-foreground">Track and manage school inventory items</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalItems}</div>
            <p className="text-xs text-muted-foreground mt-1">In inventory</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.lowStockItems}</div>
            <p className="text-xs text-muted-foreground mt-1">Need reordering</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.outOfStock}</div>
            <p className="text-xs text-muted-foreground mt-1">Urgent orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">৳{stats.totalValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Inventory value</p>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {stats.lowStockItems > 0 && (
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            {stats.lowStockItems} item{stats.lowStockItems !== 1 ? 's' : ''} running low on stock. Consider placing reorder.
          </AlertDescription>
        </Alert>
      )}

      {/* Filters and Search */}
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <Input
            placeholder="Search by name or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border rounded-md text-sm"
        >
          <option value="all">All Status</option>
          <option value="in_stock">In Stock</option>
          <option value="low_stock">Low Stock</option>
          <option value="out_of_stock">Out of Stock</option>
        </select>
        <Dialog open={isAddingItem} onOpenChange={setIsAddingItem}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add Item</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Inventory Item</DialogTitle>
              <DialogDescription>Add a new item to your inventory</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Item Name *</label>
                <Input
                  value={newItem.name || ''}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder="e.g., Textbook - English"
                />
              </div>
              <div>
                <label className="text-sm font-medium">SKU *</label>
                <Input
                  value={newItem.sku || ''}
                  onChange={(e) => setNewItem({ ...newItem, sku: e.target.value })}
                  placeholder="e.g., TXT-ENG-09"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Category</label>
                <Input
                  value={newItem.category || ''}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                  placeholder="e.g., Books"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium">Quantity *</label>
                  <Input
                    type="number"
                    value={newItem.quantity || ''}
                    onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Unit Price</label>
                  <Input
                    type="number"
                    value={newItem.unitPrice || ''}
                    onChange={(e) => setNewItem({ ...newItem, unitPrice: Number(e.target.value) })}
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Location</label>
                <Input
                  value={newItem.location || ''}
                  onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
                  placeholder="e.g., Shelf A1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Reorder Level</label>
                <Input
                  type="number"
                  value={newItem.reorderLevel || ''}
                  onChange={(e) => setNewItem({ ...newItem, reorderLevel: Number(e.target.value) })}
                  placeholder="10"
                />
              </div>
              <Button onClick={handleAddItem} className="w-full">Add Item</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Items</CardTitle>
          <CardDescription>{filteredItems.length} items found</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Total Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.sku}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        {item.quantity}
                      </div>
                    </TableCell>
                    <TableCell>৳{item.unitPrice.toLocaleString()}</TableCell>
                    <TableCell>৳{(item.quantity * item.unitPrice).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.status === 'in_stock'
                            ? 'default'
                            : item.status === 'low_stock'
                            ? 'secondary'
                            : 'destructive'
                        }
                      >
                        {item.status === 'in_stock' ? 'In Stock' : item.status === 'low_stock' ? 'Low Stock' : 'Out of Stock'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{item.location}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedItem(item)}
                            >
                              <TrendingDown className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Record Movement - {item.name}</DialogTitle>
                              <DialogDescription>Record a stock movement for this item</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <label className="text-sm font-medium">Movement Type</label>
                                <select className="w-full px-3 py-2 border rounded-md text-sm">
                                  <option>Purchase (Add stock)</option>
                                  <option>Usage (Remove stock)</option>
                                  <option>Adjustment</option>
                                  <option>Transfer</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Quantity</label>
                                <Input type="number" placeholder="0" />
                              </div>
                              <div>
                                <label className="text-sm font-medium">Reason</label>
                                <Input placeholder="e.g., Monthly usage, Stock adjustment" />
                              </div>
                              <Button className="w-full">Record Movement</Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
