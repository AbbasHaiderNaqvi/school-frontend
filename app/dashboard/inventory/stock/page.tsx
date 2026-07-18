'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/layout/page-header'
import { AccessDenied } from '@/components/ui/access-denied'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { inventoryService, type StockBucket, type StockMovement } from '@/lib/services/inventory'
import { Search, Boxes, History } from 'lucide-react'
import { SkeletonTableRows } from '@/components/ui/page-skeleton'

export default function StockPage() {
  const { can } = useAuth()

  const [activeTab, setActiveTab] = useState('stock')

  const [buckets, setBuckets] = useState<StockBucket[]>([])
  const [stockTotal, setStockTotal] = useState(0)
  const [stockSearch, setStockSearch] = useState('')
  const [isLoadingStock, setIsLoadingStock] = useState(true)
  const [stockError, setStockError] = useState('')

  const [movements, setMovements] = useState<StockMovement[]>([])
  const [movementsTotal, setMovementsTotal] = useState(0)
  const [movementSearch, setMovementSearch] = useState('')
  const [isLoadingMovements, setIsLoadingMovements] = useState(false)
  const [movementsError, setMovementsError] = useState('')
  const [movementsLoaded, setMovementsLoaded] = useState(false)

  const loadStock = useCallback(async () => {
    setIsLoadingStock(true)
    setStockError('')
    try {
      const result = await inventoryService.getStock({ limit: 100, search: stockSearch || undefined })
      setBuckets(result.data)
      setStockTotal(result.total)
    } catch (err) {
      setStockError(err instanceof Error ? err.message : 'Failed to load stock.')
    } finally {
      setIsLoadingStock(false)
    }
  }, [stockSearch])

  const loadMovements = useCallback(async () => {
    setIsLoadingMovements(true)
    setMovementsError('')
    try {
      const result = await inventoryService.getStockMovements({ limit: 100, search: movementSearch || undefined })
      setMovements(result.data)
      setMovementsTotal(result.total)
      setMovementsLoaded(true)
    } catch (err) {
      setMovementsError(err instanceof Error ? err.message : 'Failed to load movements.')
    } finally {
      setIsLoadingMovements(false)
    }
  }, [movementSearch])

  useEffect(() => { loadStock() }, [loadStock])
  useEffect(() => { if (activeTab === 'movements' && !movementsLoaded) loadMovements() }, [activeTab, movementsLoaded, loadMovements])
  useEffect(() => { if (activeTab === 'movements') loadMovements() }, [movementSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!can('inventory.stock.read')) return <AccessDenied />

  return (
    <div className="space-y-6">
      <PageHeader title="Stock & Movements" description="Find any item by location, and review the append-only movement ledger" />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="stock" className="gap-2"><Boxes className="h-4 w-4" /> Stock</TabsTrigger>
          <TabsTrigger value="movements" className="gap-2"><History className="h-4 w-4" /> Movement Ledger</TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="space-y-4 mt-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by item, code, or location path…"
              value={stockSearch}
              onChange={e => setStockSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {stockError && <Alert variant="destructive"><AlertDescription>{stockError}</AlertDescription></Alert>}

          <Card>
            <CardContent className="pt-6 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingStock ? (
                    <SkeletonTableRows rows={8} cols={5} />
                  ) : (
                    <>
                      {buckets.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                            <Boxes className="h-10 w-10 mx-auto mb-2 opacity-30" />
                            No stock found
                          </TableCell>
                        </TableRow>
                      )}
                      {buckets.map((b, i) => (
                        <TableRow key={`${b.itemId}-${b.locationId}-${b.condition}-${b.expiryDate ?? ''}-${i}`}>
                          <TableCell className="font-medium">
                            {b.itemName}
                            {b.itemCode && <span className="ml-2 font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{b.itemCode}</span>}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{b.locationPath}</TableCell>
                          <TableCell><Badge variant="secondary">{b.condition}</Badge></TableCell>
                          <TableCell className="text-muted-foreground text-sm">{b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : '—'}</TableCell>
                          <TableCell className="text-right font-semibold">{b.quantity} {b.unitSymbol ?? ''}</TableCell>
                        </TableRow>
                      ))}
                    </>
                  )}
                </TableBody>
              </Table>
              {!isLoadingStock && buckets.length > 0 && (
                <p className="text-xs text-muted-foreground mt-3">Showing {buckets.length} of {stockTotal} buckets</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements" className="space-y-4 mt-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by item, type, or document…"
              value={movementSearch}
              onChange={e => setMovementSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {movementsError && <Alert variant="destructive"><AlertDescription>{movementsError}</AlertDescription></Alert>}

          <Card>
            <CardContent className="pt-6 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Document</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingMovements ? (
                    <SkeletonTableRows rows={8} cols={5} />
                  ) : (
                    <>
                      {movements.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                            <History className="h-10 w-10 mx-auto mb-2 opacity-30" />
                            No movements found
                          </TableCell>
                        </TableRow>
                      )}
                      {movements.map(m => (
                        <TableRow key={m.id}>
                          <TableCell className="text-muted-foreground text-sm">{new Date(m.date).toLocaleString()}</TableCell>
                          <TableCell className="font-medium">{m.itemName ?? m.itemId}</TableCell>
                          <TableCell><Badge variant="secondary">{m.type}</Badge></TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {m.documentType ? `${m.documentType} ${m.documentNumber ?? ''}` : '—'}
                          </TableCell>
                          <TableCell className={`text-right font-semibold ${m.quantity < 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                            {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  )}
                </TableBody>
              </Table>
              {!isLoadingMovements && movements.length > 0 && (
                <p className="text-xs text-muted-foreground mt-3">Showing {movements.length} of {movementsTotal} movements</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
