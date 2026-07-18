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
  inventoryService, type Adjustment, type ItemDropdownItem, type LocationDropdownItem, type StockCondition,
} from '@/lib/services/inventory'
import { numberError, hasNoErrors } from '@/lib/validation'
import { Plus, Loader2, RefreshCw, ClipboardList, Check, X } from 'lucide-react'
import { SkeletonTableRows } from '@/components/ui/page-skeleton'

const CONDITIONS: StockCondition[] = ['NEW', 'USED', 'DAMAGED', 'BROKEN', 'EXPIRED']
const REASON_CODES = [
  { value: 'LOSS', label: 'Loss' },
  { value: 'FOUND', label: 'Found' },
  { value: 'DAMAGE', label: 'Damage' },
  { value: 'THEFT', label: 'Theft' },
  { value: 'COUNT_CORRECTION', label: 'Count Correction' },
  { value: 'OTHER', label: 'Other' },
]
const EMPTY_FORM = { itemId: '', locationId: '', condition: 'NEW' as StockCondition, quantityDelta: '', reasonCode: 'COUNT_CORRECTION', reason: '' }

function statusBadgeVariant(status: Adjustment['status']): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'APPROVED') return 'default'
  if (status === 'REJECTED') return 'destructive'
  return 'secondary'
}

export default function AdjustmentsPage() {
  const { can, user } = useAuth()

  const [adjustments, setAdjustments] = useState<Adjustment[]>([])
  const [total, setTotal] = useState(0)
  const [items, setItems] = useState<ItemDropdownItem[]>([])
  const [locations, setLocations] = useState<LocationDropdownItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'PENDING' | 'APPROVED' | 'REJECTED'>('all')
  const [decidingId, setDecidingId] = useState<string | null>(null)

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
      const result = await inventoryService.getAdjustments({ limit: 100, status: statusFilter === 'all' ? undefined : statusFilter })
      setAdjustments(result.data)
      setTotal(result.total)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load adjustments.')
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { loadDropdowns() }, [loadDropdowns])
  useEffect(() => { loadData() }, [loadData])

  if (!can('inventory.adjustment.read')) return <AccessDenied />

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setSubmitError('')
    setFieldErrors({})
    setDialogOpen(true)
  }

  const isValid = form.itemId && form.locationId && form.quantityDelta && Number(form.quantityDelta) !== 0 && form.reason.trim()

  const validate = (): boolean => {
    const errors: Record<string, string> = {}
    const deltaErr = numberError(form.quantityDelta, { required: true, label: 'Quantity delta' })
    if (deltaErr) errors.quantityDelta = deltaErr
    else if (Number(form.quantityDelta) === 0) errors.quantityDelta = 'Quantity delta cannot be zero.'
    setFieldErrors(errors)
    return hasNoErrors(errors)
  }

  const handleSave = async () => {
    if (!isValid || !validate()) return
    setIsSubmitting(true)
    setSubmitError('')

    const result = await inventoryService.createAdjustment({
      itemId: form.itemId,
      locationId: form.locationId,
      condition: form.condition,
      quantityDelta: Number(form.quantityDelta),
      reasonCode: form.reasonCode,
      reason: form.reason.trim(),
    })

    if (result.error || !result.data) {
      setSubmitError(result.error || 'Failed to submit adjustment')
      setIsSubmitting(false)
      return
    }

    setDialogOpen(false)
    setIsSubmitting(false)
    loadData()
  }

  const handleDecide = async (adj: Adjustment, decision: 'APPROVED' | 'REJECTED') => {
    let reason: string | undefined
    if (decision === 'REJECTED') {
      const input = prompt('Reason for rejecting this adjustment:')
      if (input === null) return
      reason = input || undefined
    } else if (!confirm(`Approve this ${adj.quantityDelta > 0 ? 'found' : 'loss'} adjustment for ${adj.itemName ?? 'this item'}?`)) {
      return
    }
    setDecidingId(adj.id)
    const result = await inventoryService.decideAdjustment(adj.id, decision, reason)
    setDecidingId(null)
    if (result.error) alert(result.error)
    loadData()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Adjustments"
        description="Request and approve signed quantity corrections — losses and found stock"
        action={
          can('inventory.adjustment.create') && (
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={loadData} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" /> Request Adjustment
              </Button>
            </div>
          )
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>All Adjustments ({total})</CardTitle>
          <div className="mt-3">
            <Select value={statusFilter} onValueChange={v => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loadError && <Alert variant="destructive" className="mb-4"><AlertDescription>{loadError}</AlertDescription></Alert>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Qty Delta</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <SkeletonTableRows rows={6} cols={7} />
              ) : (
                <>
                  {adjustments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        <ClipboardList className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        No adjustments found
                      </TableCell>
                    </TableRow>
                  )}
                  {adjustments.map(adj => {
                    const isOwnRequest = !!user?.id && adj.createdBy === user.id
                    return (
                      <TableRow key={adj.id}>
                        <TableCell className="font-medium">{adj.itemName ?? adj.itemId}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{adj.locationPath ?? adj.locationId}</TableCell>
                        <TableCell className={adj.quantityDelta > 0 ? 'text-emerald-600' : 'text-destructive'}>
                          {adj.quantityDelta > 0 ? `+${adj.quantityDelta}` : adj.quantityDelta}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate" title={adj.reason}>{adj.reason}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{adj.createdByName ?? '—'}</TableCell>
                        <TableCell><Badge variant={statusBadgeVariant(adj.status)}>{adj.status}</Badge></TableCell>
                        <TableCell className="text-right">
                          {adj.status === 'PENDING' && can('inventory.adjustment.approve') && !isOwnRequest && (
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleDecide(adj, 'APPROVED')} disabled={decidingId === adj.id} title="Approve">
                                {decidingId === adj.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-emerald-600" />}
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDecide(adj, 'REJECTED')} disabled={decidingId === adj.id} title="Reject">
                                <X className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          )}
                          {adj.status === 'PENDING' && isOwnRequest && (
                            <span className="text-xs text-muted-foreground">Awaiting another approver</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
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
            <DialogTitle>Request Stock Adjustment</DialogTitle>
            <DialogDescription>Nothing moves until an approver decides. Use a negative quantity for a loss, positive for found stock.</DialogDescription>
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
            <div className="grid gap-4 sm:grid-cols-2">
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
              <div>
                <Label>Condition</Label>
                <Select value={form.condition} onValueChange={v => setForm(f => ({ ...f, condition: v as StockCondition }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Quantity Delta <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  value={form.quantityDelta}
                  onChange={e => setForm(f => ({ ...f, quantityDelta: e.target.value }))}
                  placeholder="e.g. -3 for a loss, 2 for found stock"
                  className={`mt-1 ${fieldErrors.quantityDelta ? 'border-destructive' : ''}`}
                />
                {fieldErrors.quantityDelta && <p className="text-xs text-destructive mt-1">{fieldErrors.quantityDelta}</p>}
              </div>
              <div>
                <Label>Reason Code</Label>
                <Select value={form.reasonCode} onValueChange={v => setForm(f => ({ ...f, reasonCode: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REASON_CODES.map(rc => <SelectItem key={rc.value} value={rc.value}>{rc.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
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
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
