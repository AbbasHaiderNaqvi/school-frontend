'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, ArrowRight } from 'lucide-react'
import { useUser } from '@/lib/hooks/use-user'
import { inventoryService } from '@/lib/services/inventory'
import type { InventoryItem, InventoryMovement } from '@/lib/types'

export default function InventoryMovementsPage() {
  const { user } = useUser()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [movements, setMovements] = useState<InventoryMovement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    itemId: '',
    movementType: 'usage' as const,
    quantity: '',
    fromLocation: '',
    toLocation: '',
    reason: '',
  })

  useEffect(() => {
    if (user?.tenantId) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    if (!user?.tenantId) return
    setIsLoading(true)
    try {
      const itemsData = await inventoryService.getItems(user.tenantId)
      setItems(itemsData)
      const movementsData = await inventoryService.getMovementHistory(user.tenantId)
      setMovements(movementsData)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRecordMovement = async () => {
    if (!user?.tenantId || !formData.itemId || !formData.quantity) {
      alert('Please fill in all required fields')
      return
    }

    try {
      const success = await inventoryService.recordMovement({
        itemId: formData.itemId,
        movementType: formData.movementType,
        quantity: parseFloat(formData.quantity),
        fromLocation: formData.fromLocation,
        toLocation: formData.toLocation,
        reason: formData.reason,
        movedBy: user.id,
        movedByName: user.name,
        tenantId: user.tenantId,
      })

      if (success) {
        await loadData()
        setFormData({
          itemId: '',
          movementType: 'usage',
          quantity: '',
          fromLocation: '',
          toLocation: '',
          reason: '',
        })
        setIsDialogOpen(false)
      }
    } catch (error) {
      console.error('Failed to record movement:', error)
      alert('Failed to record movement')
    }
  }

  const getMovementBadgeColor = (type: InventoryMovement['movementType']) => {
    switch (type) {
      case 'purchase':
        return 'bg-green-100 text-green-800'
      case 'usage':
        return 'bg-blue-100 text-blue-800'
      case 'adjustment':
        return 'bg-yellow-100 text-yellow-800'
      case 'transfer':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventory Movements</h1>
          <p className="text-muted-foreground">Track all inventory movements and transfers</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Record Movement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Record Inventory Movement</DialogTitle>
              <DialogDescription>
                Record a new inventory movement for tracking and auditing
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="item">Item</Label>
                <Select
                  value={formData.itemId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, itemId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select item" />
                  </SelectTrigger>
                  <SelectContent>
                    {items.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} ({item.sku})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="movementType">Movement Type</Label>
                <Select
                  value={formData.movementType}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, movementType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="purchase">Purchase</SelectItem>
                    <SelectItem value="usage">Usage</SelectItem>
                    <SelectItem value="adjustment">Adjustment</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  placeholder="Enter quantity"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity: e.target.value })
                  }
                />
              </div>

              {formData.movementType === 'transfer' && (
                <>
                  <div>
                    <Label htmlFor="fromLocation">From Location</Label>
                    <Input
                      id="fromLocation"
                      placeholder="From location"
                      value={formData.fromLocation}
                      onChange={(e) =>
                        setFormData({ ...formData, fromLocation: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="toLocation">To Location</Label>
                    <Input
                      id="toLocation"
                      placeholder="To location"
                      value={formData.toLocation}
                      onChange={(e) =>
                        setFormData({ ...formData, toLocation: e.target.value })
                      }
                    />
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="reason">Reason/Notes</Label>
                <Input
                  id="reason"
                  placeholder="Reason for movement"
                  value={formData.reason}
                  onChange={(e) =>
                    setFormData({ ...formData, reason: e.target.value })
                  }
                />
              </div>

              <Button onClick={handleRecordMovement} className="w-full">
                Record Movement
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Movement History</CardTitle>
          <CardDescription>
            Complete log of all inventory movements
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading movements...</div>
          ) : movements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No movements recorded yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Recorded By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell>
                        {new Date(movement.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-medium">
                        {items.find(i => i.id === movement.id)?.name || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        <Badge className={getMovementBadgeColor(movement.movementType)}>
                          {movement.movementType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {movement.quantity} units
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {movement.movementType === 'transfer' ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{movement.fromLocation}</span>
                            <ArrowRight className="h-4 w-4" />
                            <span className="text-sm">{movement.toLocation}</span>
                          </div>
                        ) : (
                          movement.fromLocation || '-'
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {movement.reason || '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {movement.movedByName}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
