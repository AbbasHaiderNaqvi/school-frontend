'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/layout/page-header'
import { AccessDenied } from '@/components/ui/access-denied'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
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
  inventoryService, type ConditionChange, type ItemDropdownItem, type LocationDropdownItem, type StockCondition,
} from '@/lib/services/inventory'
import { numberError, hasNoErrors } from '@/lib/validation'
import { Plus, Loader2, RefreshCw, Repeat } from 'lucide-react'
import { SkeletonTableRows } from '@/components/ui/page-skeleton'

const CONDITIONS: StockCondition[] = ['NEW', 'USED', 'DAMAGED', 'BROKEN', 'EXPIRED']
const EMPTY_FORM = { itemId: '', locationId: '', fromCondition: 'NEW' as StockCondition, toCondition: 'USED' as StockCondition, quantity: '', reason: '' }

export default function ConditionChangesPage() {
  const { can } = useAuth()

  const [changes, setChanges] = useState<ConditionChange[]>([])
  const [total, setTotal] = useState(0)
  const [items, setItems] = useState<ItemDropdownItem[]>([])
  const [locations, setLocations] = useState<LocationDropdownItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState(EMPTY_FORM)

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
      const result = await inventoryService.getConditionChanges({ limit: 100 })
      setChanges(result.data)
      setTotal(result.total)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load condition changes.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadDropdowns() }, [loadDropdowns])
  useEffect(() => { loadData() }, [loadData])

  if (!can('inventory.condition.change') && !can('inventory.stock.read')) return <AccessDenied />

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setSubmitError('')
    setFieldErrors({})
    setDialogOpen(true)
  }

  const isValid = form.itemId && form.locationId && form.quantity && form.reason.trim() && form.fromCondition !== form.toCondition

  const validate = (): boolean => {
    const errors: Record<string, string> = {}
    const qtyErr = numberError(form.quantity, { required: true, min: 0.001, label: 'Quantity' })
    if (qtyErr) errors.quantity = qtyErr
    setFieldErrors(errors)
    return hasNoErrors(errors)
  }

  const handleSave = async () => {
    if (!isValid || !validate()) return
    setIsSubmitting(true)
    setSubmitError('')

    const result = await inventoryService.createConditionChange({
      itemId: form.itemId,
      locationId: form.locationId,
      fromCondition: form.fromCondition,
      toCondition: form.toCondition,
      quantity: Number(form.quantity),
      reason: form.reason.trim(),
    })

    if (result.error || !result.data) {
      setSubmitError(result.error || 'Failed to record condition change')
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
        title="Condition Changes"
        description="Reclassify stock condition — e.g. New to Damaged or Broken"
        action={
          can('inventory.condition.change') && (
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={loadData} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" /> Record Change
              </Button>
            </div>
          )
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>All Condition Changes ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          {loadError && <Alert variant="destructive" className="mb-4"><AlertDescription>{loadError}</AlertDescription></Alert>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Change</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <SkeletonTableRows rows={6} cols={5} />
              ) : (
                <>
                  {changes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        <Repeat className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        No condition changes recorded yet
                      </TableCell>
                    </TableRow>
                  )}
                  {changes.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.itemName ?? c.itemId}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{c.locationPath ?? c.locationId}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{c.fromCondition}</Badge> → <Badge variant="secondary">{c.toCondition}</Badge>
                      </TableCell>
                      <TableCell>{c.quantity}</TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-[220px] truncate" title={c.reason}>{c.reason}</TableCell>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Condition Change</DialogTitle>
            <DialogDescription>No GL impact — write-offs go through Adjustments instead</DialogDescription>
          </DialogHeader>
          {submitError && <Alert variant="destructive"><AlertDescription>{submitError}</AlertDescription></Alert>}
          <div className="space-y-4">
            <div>
              <Label>Item <span className="text-destructive">*</span></Label>
              <Combobox
                value={form.itemId}
                onValueChange={v => setForm(f => ({ ...f, itemId: v }))}
                options={items.map(it => ({ value: it.id, label: it.name, keywords: it.code }))}
                placeholder="Select item"
                searchPlaceholder="Search items…"
                emptyText="No items found."
                className="mt-1"
              />
            </div>
            <div>
              <Label>Location <span className="text-destructive">*</span></Label>
              <Combobox
                value={form.locationId}
                onValueChange={v => setForm(f => ({ ...f, locationId: v }))}
                options={locations.map(l => ({ value: l.id, label: l.path }))}
                placeholder="Select location"
                searchPlaceholder="Search locations…"
                emptyText="No locations found."
                className="mt-1"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>From Condition</Label>
                <Select value={form.fromCondition} onValueChange={v => setForm(f => ({ ...f, fromCondition: v as StockCondition }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>To Condition</Label>
                <Select value={form.toCondition} onValueChange={v => setForm(f => ({ ...f, toCondition: v as StockCondition }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.filter(c => c !== form.fromCondition).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Quantity <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                min={0}
                value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                className={`mt-1 ${fieldErrors.quantity ? 'border-destructive' : ''}`}
              />
              {fieldErrors.quantity && <p className="text-xs text-destructive mt-1">{fieldErrors.quantity}</p>}
            </div>
            <div>
              <Label>Reason <span className="text-destructive">*</span></Label>
              <Textarea rows={2} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSubmitting || !isValid}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Record Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
