'use client'

import { money } from '@/lib/currency'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/layout/page-header'
import { AccessDenied } from '@/components/ui/access-denied'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
  inventoryService, type Grn, type GrnLine, type GrnType, type ItemDropdownItem,
  type LocationDropdownItem, type StockCondition,
} from '@/lib/services/inventory'
import { financeService } from '@/lib/services/finance'
import { numberError, requiredError, hasNoErrors } from '@/lib/validation'
import { Plus, Loader2, RefreshCw, Truck, Trash2, Eye } from 'lucide-react'
import { SkeletonTableRows } from '@/components/ui/page-skeleton'

const CONDITIONS: StockCondition[] = ['NEW', 'USED', 'DAMAGED', 'BROKEN', 'EXPIRED']

type LineRow = { itemId: string; quantity: string; unitCost: string; locationId: string; condition: StockCondition; expiryDate: string }

const blankLine = (): LineRow => ({ itemId: '', quantity: '', unitCost: '', locationId: '', condition: 'NEW', expiryDate: '' })

export default function GrnsPage() {
  const { can } = useAuth()

  const [grns, setGrns] = useState<Grn[]>([])
  const [total, setTotal] = useState(0)
  const [items, setItems] = useState<ItemDropdownItem[]>([])
  const [locations, setLocations] = useState<LocationDropdownItem[]>([])
  const [vendors, setVendors] = useState<Array<{ id: string; name: string; code: string }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [lineErrors, setLineErrors] = useState<Record<string, string>>({})
  const [type, setType] = useState<GrnType>('VENDOR')
  const [vendorId, setVendorId] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [lines, setLines] = useState<LineRow[]>([blankLine()])

  const [viewing, setViewing] = useState<Grn | null>(null)
  const [isViewLoading, setIsViewLoading] = useState(false)

  const loadDropdowns = useCallback(async () => {
    const [i, l, v] = await Promise.all([
      inventoryService.getItemsDropdown(),
      inventoryService.getLocationsDropdown(),
      financeService.getVendorsDropdown(),
    ])
    setItems(i)
    setLocations(l)
    setVendors(v)
  }, [])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const result = await inventoryService.getGrns({ limit: 100 })
      setGrns(result.data)
      setTotal(result.total)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load GRNs.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadDropdowns() }, [loadDropdowns])
  useEffect(() => { loadData() }, [loadData])

  if (!can('inventory.grn.read')) return <AccessDenied />

  const openCreate = () => {
    setType('VENDOR')
    setVendorId('')
    setDate(new Date().toISOString().slice(0, 10))
    setLines([blankLine()])
    setSubmitError('')
    setFieldErrors({})
    setLineErrors({})
    setDialogOpen(true)
  }

  const updateLine = (index: number, patch: Partial<LineRow>) => {
    setLines(prev => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)))
  }

  const addLine = () => setLines(prev => [...prev, blankLine()])
  const removeLine = (index: number) => setLines(prev => prev.filter((_, i) => i !== index))

  const isValid =
    date &&
    (type !== 'VENDOR' || vendorId) &&
    lines.length > 0 &&
    lines.every(l => l.itemId && l.quantity && l.unitCost && l.locationId)

  const validate = (): boolean => {
    const errors: Record<string, string> = {}
    if (type === 'VENDOR') {
      const vendorErr = requiredError(vendorId, 'Vendor')
      if (vendorErr) errors.vendorId = vendorErr
    }
    const lErrors: Record<string, string> = {}
    lines.forEach((l, idx) => {
      const qtyErr = numberError(l.quantity, { required: true, min: 0.001, label: 'Quantity' })
      if (qtyErr) lErrors[`${idx}-quantity`] = qtyErr
      const costErr = numberError(l.unitCost, { required: true, min: 0, label: 'Unit cost' })
      if (costErr) lErrors[`${idx}-unitCost`] = costErr
    })
    setFieldErrors(errors)
    setLineErrors(lErrors)
    return hasNoErrors(errors) && hasNoErrors(lErrors)
  }

  const handleSave = async () => {
    if (!isValid || !validate()) return
    setIsSubmitting(true)
    setSubmitError('')

    const payloadLines: GrnLine[] = lines.map(l => ({
      itemId: l.itemId,
      quantity: Number(l.quantity),
      unitCost: l.unitCost,
      locationId: l.locationId,
      condition: l.condition,
      expiryDate: l.expiryDate || undefined,
    }))

    const result = await inventoryService.createGrn({
      type,
      vendorId: type === 'VENDOR' ? vendorId : undefined,
      date,
      lines: payloadLines,
    })

    if (result.error || !result.data) {
      setSubmitError(result.error || 'Failed to create GRN')
      setIsSubmitting(false)
      return
    }

    setDialogOpen(false)
    setIsSubmitting(false)
    loadData()
  }

  const openView = async (grn: Grn) => {
    setViewing(grn)
    setIsViewLoading(true)
    const full = await inventoryService.getGrn(grn.id)
    if (full) setViewing(full)
    setIsViewLoading(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Goods Received (Stock In)"
        description="Receive stock from vendors, opening balances, or donations"
        action={
          can('inventory.grn.create') && (
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={loadData} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" /> New GRN
              </Button>
            </div>
          )
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>All GRNs ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          {loadError && <Alert variant="destructive" className="mb-4"><AlertDescription>{loadError}</AlertDescription></Alert>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Received Date</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <SkeletonTableRows rows={6} cols={6} />
              ) : (
                <>
                  {grns.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        <Truck className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        No GRNs recorded yet
                      </TableCell>
                    </TableRow>
                  )}
                  {grns.map(grn => (
                    <TableRow key={grn.id}>
                      <TableCell><span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{grn.grnNo}</span></TableCell>
                      <TableCell><Badge variant="secondary">{grn.sourceType}</Badge></TableCell>
                      <TableCell className="text-muted-foreground text-sm">{grn.vendorName ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{grn.receivedDate}</TableCell>
                      <TableCell className="text-right font-medium">{grn.totalValue != null ? money(grn.totalValue) : '—'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openView(grn)}><Eye className="h-4 w-4" /></Button>
                      </TableCell>
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
            <DialogTitle>New Goods Received Note</DialogTitle>
            <DialogDescription>Record stock coming into the school</DialogDescription>
          </DialogHeader>
          {submitError && <Alert variant="destructive"><AlertDescription>{submitError}</AlertDescription></Alert>}

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>Type</Label>
                <Select value={type} onValueChange={v => setType(v as GrnType)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VENDOR">Vendor Purchase</SelectItem>
                    <SelectItem value="OPENING">Opening Balance</SelectItem>
                    <SelectItem value="DONATION">Donation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {type === 'VENDOR' && (
                <div>
                  <Label>Vendor <span className="text-destructive">*</span></Label>
                  <Combobox
                    value={vendorId}
                    onValueChange={setVendorId}
                    options={vendors.map(v => ({ value: v.id, label: v.name, keywords: v.code }))}
                    placeholder="Select vendor"
                    searchPlaceholder="Search vendors…"
                    emptyText="No vendors found."
                    className={`mt-1 ${fieldErrors.vendorId ? 'border-destructive' : ''}`}
                  />
                  {fieldErrors.vendorId && <p className="text-xs text-destructive mt-1">{fieldErrors.vendorId}</p>}
                </div>
              )}
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
                    <div className="col-span-3">
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
                    <div className="col-span-2">
                      <Label className="text-xs">Unit Cost</Label>
                      <Input
                        type="number"
                        min={0}
                        value={line.unitCost}
                        onChange={e => updateLine(idx, { unitCost: e.target.value })}
                        className={`mt-1 ${lineErrors[`${idx}-unitCost`] ? 'border-destructive' : ''}`}
                      />
                      {lineErrors[`${idx}-unitCost`] && <p className="text-xs text-destructive mt-1">{lineErrors[`${idx}-unitCost`]}</p>}
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Location</Label>
                      <Combobox
                        value={line.locationId}
                        onValueChange={v => updateLine(idx, { locationId: v })}
                        options={locations.map(l => ({ value: l.id, label: l.path }))}
                        placeholder="Location"
                        searchPlaceholder="Search locations…"
                        emptyText="No locations found."
                        className="mt-1"
                      />
                    </div>
                    <div className="col-span-2">
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
              Post GRN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewing} onOpenChange={open => !open && setViewing(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>GRN {viewing?.grnNo}</DialogTitle>
            <DialogDescription>
              {viewing?.sourceType}{viewing?.vendorName ? ` · ${viewing.vendorName}` : ''} · {viewing?.receivedDate}
              {viewing?.totalValue != null ? ` · ${money(viewing.totalValue)}` : ''}
            </DialogDescription>
          </DialogHeader>
          {isViewLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Unit Cost</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Condition</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewing?.lines?.map((l, i) => (
                  <TableRow key={l.id ?? i}>
                    <TableCell>{l.itemName ?? l.itemId}</TableCell>
                    <TableCell>{l.quantity}</TableCell>
                    <TableCell>{l.unitCost}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{l.locationPath ?? l.locationId}</TableCell>
                    <TableCell><Badge variant="secondary">{l.condition}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
