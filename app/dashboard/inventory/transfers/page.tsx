'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/layout/page-header'
import { AccessDenied } from '@/components/ui/access-denied'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  inventoryService, type Transfer, type ItemDropdownItem, type LocationDropdownItem, type StockCondition,
} from '@/lib/services/inventory'
import { numberError, hasNoErrors } from '@/lib/validation'
import { Plus, Loader2, RefreshCw, ArrowLeftRight, Trash2 } from 'lucide-react'
import { SkeletonTableRows } from '@/components/ui/page-skeleton'

const CONDITIONS: StockCondition[] = ['NEW', 'USED', 'DAMAGED', 'BROKEN', 'EXPIRED']

type LineRow = { itemId: string; quantity: string; condition: StockCondition; expiryDate: string }
const blankLine = (): LineRow => ({ itemId: '', quantity: '', condition: 'NEW', expiryDate: '' })

export default function TransfersPage() {
  const { can } = useAuth()

  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [total, setTotal] = useState(0)
  const [items, setItems] = useState<ItemDropdownItem[]>([])
  const [locations, setLocations] = useState<LocationDropdownItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [lineErrors, setLineErrors] = useState<Record<string, string>>({})
  const [fromLocationId, setFromLocationId] = useState('')
  const [toLocationId, setToLocationId] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [lines, setLines] = useState<LineRow[]>([blankLine()])

  const loadDropdowns = useCallback(async () => {
    const [i, l] = await Promise.all([
      inventoryService.getItemsDropdown(),
      inventoryService.getLocationsDropdown(),
    ])
    setItems(i)
    setLocations(l)
  }, [])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const result = await inventoryService.getTransfers({ limit: 100 })
      setTransfers(result.data)
      setTotal(result.total)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load transfers.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadDropdowns() }, [loadDropdowns])
  useEffect(() => { loadData() }, [loadData])

  if (!can('inventory.transfer.create') && !can('inventory.stock.read')) return <AccessDenied />

  const openCreate = () => {
    setFromLocationId('')
    setToLocationId('')
    setDate(new Date().toISOString().slice(0, 10))
    setLines([blankLine()])
    setSubmitError('')
    setLineErrors({})
    setDialogOpen(true)
  }

  const updateLine = (index: number, patch: Partial<LineRow>) => {
    setLines(prev => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)))
  }
  const addLine = () => setLines(prev => [...prev, blankLine()])
  const removeLine = (index: number) => setLines(prev => prev.filter((_, i) => i !== index))

  const isValid =
    date && fromLocationId && toLocationId && fromLocationId !== toLocationId &&
    lines.length > 0 && lines.every(l => l.itemId && l.quantity)

  const validate = (): boolean => {
    const errors: Record<string, string> = {}
    lines.forEach((l, idx) => {
      const qtyErr = numberError(l.quantity, { required: true, min: 0.001, label: 'Quantity' })
      if (qtyErr) errors[`${idx}-quantity`] = qtyErr
    })
    setLineErrors(errors)
    return hasNoErrors(errors)
  }

  const handleSave = async () => {
    if (!isValid || !validate()) return
    setIsSubmitting(true)
    setSubmitError('')

    const result = await inventoryService.createTransfer({
      fromLocationId,
      toLocationId,
      date,
      lines: lines.map(l => ({
        itemId: l.itemId,
        quantity: Number(l.quantity),
        condition: l.condition,
        expiryDate: l.expiryDate || undefined,
      })),
    })

    if (result.error || !result.data) {
      setSubmitError(result.error || 'Failed to create transfer')
      setIsSubmitting(false)
      return
    }

    setDialogOpen(false)
    setIsSubmitting(false)
    loadData()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Transfers"
        description="Move stock between locations without touching the books"
        action={
          can('inventory.transfer.create') && (
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={loadData} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" /> New Transfer
              </Button>
            </div>
          )
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>All Transfers ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          {loadError && <Alert variant="destructive" className="mb-4"><AlertDescription>{loadError}</AlertDescription></Alert>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Lines</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <SkeletonTableRows rows={6} cols={5} />
              ) : (
                <>
                  {transfers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        <ArrowLeftRight className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        No transfers recorded yet
                      </TableCell>
                    </TableRow>
                  )}
                  {transfers.map(t => (
                    <TableRow key={t.id}>
                      <TableCell><span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{t.number}</span></TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {locations.find(l => l.id === t.fromLocationId)?.path ?? t.fromLocationId}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {locations.find(l => l.id === t.toLocationId)?.path ?? t.toLocationId}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{new Date(t.date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-muted-foreground">{Array.isArray(t.lines) ? t.lines.length : 0}</TableCell>
                    </TableRow>
                  ))}
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>New Stock Transfer</DialogTitle>
            <DialogDescription>Move stock from one location to another</DialogDescription>
          </DialogHeader>
          {submitError && <Alert variant="destructive"><AlertDescription>{submitError}</AlertDescription></Alert>}

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>From Location <span className="text-destructive">*</span></Label>
                <Combobox
                  value={fromLocationId}
                  onValueChange={setFromLocationId}
                  options={locations.map(l => ({ value: l.id, label: l.path }))}
                  placeholder="Select location"
                  searchPlaceholder="Search locations…"
                  emptyText="No locations found."
                  className="mt-1"
                />
              </div>
              <div>
                <Label>To Location <span className="text-destructive">*</span></Label>
                <Combobox
                  value={toLocationId}
                  onValueChange={setToLocationId}
                  options={locations.filter(l => l.id !== fromLocationId).map(l => ({ value: l.id, label: l.path }))}
                  placeholder="Select location"
                  searchPlaceholder="Search locations…"
                  emptyText="No locations found."
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Lines</Label>
                <Button variant="outline" size="sm" onClick={addLine}><Plus className="h-3.5 w-3.5 mr-1" /> Add Line</Button>
              </div>
              <div className="space-y-2">
                {lines.map((line, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end border rounded-lg p-2">
                    <div className="col-span-5">
                      <Label className="text-xs">Item</Label>
                      <Combobox
                        value={line.itemId}
                        onValueChange={v => updateLine(idx, { itemId: v })}
                        options={items.map(it => ({ value: it.id, label: it.name, keywords: it.code }))}
                        placeholder="Item"
                        searchPlaceholder="Search items…"
                        emptyText="No items found."
                        className="mt-1"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Quantity</Label>
                      <Input
                        type="number"
                        min={0}
                        value={line.quantity}
                        onChange={e => updateLine(idx, { quantity: e.target.value })}
                        className={`mt-1 ${lineErrors[`${idx}-quantity`] ? 'border-destructive' : ''}`}
                      />
                      {lineErrors[`${idx}-quantity`] && <p className="text-xs text-destructive mt-1">{lineErrors[`${idx}-quantity`]}</p>}
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs">Condition</Label>
                      <Select value={line.condition} onValueChange={v => updateLine(idx, { condition: v as StockCondition })}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CONDITIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button variant="ghost" size="icon" onClick={() => removeLine(idx)} disabled={lines.length === 1}>
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                    {items.find(it => it.id === line.itemId)?.trackExpiry && (
                      <div className="col-span-4">
                        <Label className="text-xs">Expiry Date</Label>
                        <Input type="date" value={line.expiryDate} onChange={e => updateLine(idx, { expiryDate: e.target.value })} className="mt-1" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSubmitting || !isValid}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Post Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
