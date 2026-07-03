'use client'

import { CURRENCY_SYMBOL } from '@/lib/currency'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { inventoryService } from '@/lib/services/inventory'
import { useUser } from '@/lib/hooks/use-user'
import { Plus, Search, Package, Calendar } from 'lucide-react'
import type { Asset } from '@/lib/types'
import { TablePageSkeleton } from '@/components/ui/page-skeleton'

export default function AssetsPage() {
  const { user } = useUser()
  const [assets, setAssets] = useState<Asset[]>([])
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [addDialog, setAddDialog] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    serialNumber: '',
    purchaseDate: '',
    purchasePrice: 0,
    currentValue: 0,
    location: '',
    assignedTo: '',
    status: 'active' as 'active' | 'maintenance' | 'retired',
    condition: 'excellent' as 'excellent' | 'good' | 'fair' | 'poor',
    warrantyExpiry: '',
    notes: '',
  })

  useEffect(() => {
    loadAssets()
  }, [user])

  useEffect(() => {
    filterAssets()
  }, [assets, searchTerm, statusFilter])

  const loadAssets = async () => {
    if (!user?.tenantId) return

    try {
      setLoading(true)
      const data = await inventoryService.getAssets(user.tenantId)
      setAssets(data)
    } catch (error) {
      console.error('[v0] Error loading assets:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterAssets = () => {
    let filtered = [...assets]

    if (searchTerm) {
      filtered = filtered.filter(asset =>
        asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.category.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(asset => asset.status === statusFilter)
    }

    setFilteredAssets(filtered)
  }

  const handleAddAsset = async () => {
    if (!user?.tenantId || !formData.name) return

    try {
      await inventoryService.createAsset({
        ...formData,
        tenantId: user.tenantId,
      })
      setAddDialog(false)
      setFormData({
        name: '',
        category: '',
        serialNumber: '',
        purchaseDate: '',
        purchasePrice: 0,
        currentValue: 0,
        location: '',
        assignedTo: '',
        status: 'active',
        condition: 'excellent',
        warrantyExpiry: '',
        notes: '',
      })
      loadAssets()
    } catch (error) {
      console.error('[v0] Error adding asset:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>
      case 'maintenance':
        return <Badge className="bg-yellow-100 text-yellow-800">Maintenance</Badge>
      case 'retired':
        return <Badge variant="secondary">Retired</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getConditionBadge = (condition: string) => {
    switch (condition) {
      case 'excellent':
        return <Badge className="bg-blue-100 text-blue-800">Excellent</Badge>
      case 'good':
        return <Badge className="bg-green-100 text-green-800">Good</Badge>
      case 'fair':
        return <Badge className="bg-yellow-100 text-yellow-800">Fair</Badge>
      case 'poor':
        return <Badge className="bg-red-100 text-red-800">Poor</Badge>
      default:
        return <Badge>{condition}</Badge>
    }
  }

  if (loading) {
    return <TablePageSkeleton />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fixed Assets</h1>
          <p className="text-muted-foreground">Track and manage school assets</p>
        </div>
        <Button onClick={() => setAddDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Asset
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex-1 max-w-sm">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search assets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="retired">Retired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Serial Number</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Purchase Date</TableHead>
                <TableHead className="text-right">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No assets found
                  </TableCell>
                </TableRow>
              ) : (
                filteredAssets.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell className="font-medium">{asset.name}</TableCell>
                    <TableCell>{asset.category}</TableCell>
                    <TableCell>{asset.serialNumber || '-'}</TableCell>
                    <TableCell>{asset.location}</TableCell>
                    <TableCell>{getStatusBadge(asset.status)}</TableCell>
                    <TableCell>{getConditionBadge(asset.condition)}</TableCell>
                    <TableCell>{asset.purchaseDate}</TableCell>
                    <TableCell className="text-right">{CURRENCY_SYMBOL} {asset.currentValue.toFixed(2)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Asset</DialogTitle>
            <DialogDescription>Register a new fixed asset</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Asset Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., Computer, Furniture"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="serialNumber">Serial Number</Label>
                <Input
                  id="serialNumber"
                  value={formData.serialNumber}
                  onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Room 101"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="purchaseDate">Purchase Date</Label>
                <Input
                  id="purchaseDate"
                  type="date"
                  value={formData.purchaseDate}
                  onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="purchasePrice">Purchase Price</Label>
                <Input
                  id="purchasePrice"
                  type="number"
                  value={formData.purchasePrice}
                  onChange={(e) => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currentValue">Current Value</Label>
                <Input
                  id="currentValue"
                  type="number"
                  value={formData.currentValue}
                  onChange={(e) => setFormData({ ...formData, currentValue: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="warrantyExpiry">Warranty Expiry</Label>
                <Input
                  id="warrantyExpiry"
                  type="date"
                  value={formData.warrantyExpiry}
                  onChange={(e) => setFormData({ ...formData, warrantyExpiry: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="retired">Retired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="condition">Condition</Label>
                <Select value={formData.condition} onValueChange={(value: any) => setFormData({ ...formData, condition: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddAsset}>Add Asset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
