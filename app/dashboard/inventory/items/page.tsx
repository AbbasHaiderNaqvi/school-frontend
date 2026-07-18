'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/layout/page-header'
import { AccessDenied } from '@/components/ui/access-denied'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Combobox } from '@/components/ui/combobox'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { inventoryService, type InventoryItemRecord, type DropdownItem, type UnitDropdownItem } from '@/lib/services/inventory'
import { numberError, hasNoErrors } from '@/lib/validation'
import { Plus, Search, MoreHorizontal, Edit, Trash2, Loader2, RefreshCw, Package } from 'lucide-react'
import { SkeletonTableRows } from '@/components/ui/page-skeleton'

const ALL = '__all__'
const EMPTY_FORM = {
  name: '', categoryId: '', unitId: '', trackExpiry: false,
  minStockLevel: '', reorderLevel: '', barcode: '', assetTag: '', description: '',
}

export default function InventoryItemsPage() {
  const { can } = useAuth()

  const [items, setItems] = useState<InventoryItemRecord[]>([])
  const [categories, setCategories] = useState<DropdownItem[]>([])
  const [units, setUnits] = useState<UnitDropdownItem[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<InventoryItemRecord | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState(EMPTY_FORM)

  const [deleteTarget, setDeleteTarget] = useState<InventoryItemRecord | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const loadDropdowns = useCallback(async () => {
    const [cats, us] = await Promise.all([
      inventoryService.getCategoriesDropdown(),
      inventoryService.getUnitsDropdown(),
    ])
    setCategories(cats)
    setUnits(us)
  }, [])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const result = await inventoryService.getItems({
        limit: 200,
        search: search || undefined,
        categoryId: categoryFilter || undefined,
      })
      setItems(result.data)
      setTotal(result.total)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load items.')
    } finally {
      setIsLoading(false)
    }
  }, [search, categoryFilter])

  useEffect(() => { loadDropdowns() }, [loadDropdowns])
  useEffect(() => { loadData() }, [loadData])

  if (!can('inventory.item.read')) return <AccessDenied />

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setSubmitError('')
    setFieldErrors({})
    setDialogOpen(true)
  }

  const openEdit = (item: InventoryItemRecord) => {
    setEditing(item)
    setForm({
      name: item.name,
      categoryId: item.categoryId ?? item.category?.id ?? '',
      unitId: item.unitId ?? item.unit?.id ?? '',
      trackExpiry: item.trackExpiry,
      minStockLevel: item.minStockLevel != null ? String(item.minStockLevel) : '',
      reorderLevel: item.reorderLevel != null ? String(item.reorderLevel) : '',
      barcode: item.barcode ?? '',
      assetTag: item.assetTag ?? '',
      description: item.description ?? '',
    })
    setSubmitError('')
    setFieldErrors({})
    setDialogOpen(true)
  }

  const validate = (): boolean => {
    const errors: Record<string, string> = {}
    const minStockErr = numberError(form.minStockLevel, { min: 0, label: 'Minimum stock level' })
    if (minStockErr) errors.minStockLevel = minStockErr
    const reorderErr = numberError(form.reorderLevel, { min: 0, label: 'Reorder level' })
    if (reorderErr) errors.reorderLevel = reorderErr
    setFieldErrors(errors)
    return hasNoErrors(errors)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.categoryId || !form.unitId || !validate()) return
    setIsSubmitting(true)
    setSubmitError('')

    const payload = {
      name: form.name.trim(),
      categoryId: form.categoryId,
      unitId: form.unitId,
      trackExpiry: form.trackExpiry,
      minStockLevel: form.minStockLevel ? Number(form.minStockLevel) : undefined,
      reorderLevel: form.reorderLevel ? Number(form.reorderLevel) : undefined,
      barcode: form.barcode.trim() || undefined,
      assetTag: form.assetTag.trim() || undefined,
      description: form.description.trim() || undefined,
    }

    const result = editing
      ? await inventoryService.updateItem(editing.id, payload)
      : await inventoryService.createItem(payload)

    if (result.error || !result.data) {
      setSubmitError(result.error || 'Operation failed')
      setIsSubmitting(false)
      return
    }

    setDialogOpen(false)
    setIsSubmitting(false)
    loadData()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    setDeleteError('')
    const { error } = await inventoryService.deleteItem(deleteTarget.id)
    setIsDeleting(false)
    if (error) { setDeleteError(error); return }
    setDeleteTarget(null)
    loadData()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Items"
        description="The item catalogue — pencils, lab kits, projectors, sports gear…"
        action={
          can('inventory.item.create') && (
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={loadData} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" /> Add Item
              </Button>
            </div>
          )
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>All Items ({total})</CardTitle>
          <div className="flex flex-col sm:flex-row gap-3 mt-3">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, code, or barcode…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Combobox
              value={categoryFilter || ALL}
              onValueChange={v => setCategoryFilter(v === ALL ? '' : v)}
              options={[
                { value: ALL, label: 'All Categories' },
                ...categories.map(c => ({ value: c.id, label: c.name })),
              ]}
              placeholder="All Categories"
              searchPlaceholder="Search categories…"
              emptyText="No categories found."
              className="w-full sm:w-56"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loadError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{loadError}</AlertDescription>
            </Alert>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Expiry Tracked</TableHead>
                <TableHead>Reorder Level</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <SkeletonTableRows rows={6} cols={7} />
              ) : (
                <>
                  {items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        No items found
                      </TableCell>
                    </TableRow>
                  )}
                  {items.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{item.code}</span>
                      </TableCell>
                      <TableCell className="font-semibold">{item.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{item.category?.name ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{item.unit?.symbol ?? item.unit?.name ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant={item.trackExpiry ? 'default' : 'secondary'}>{item.trackExpiry ? 'Yes' : 'No'}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{item.reorderLevel ?? '—'}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {can('inventory.item.update') && (
                              <DropdownMenuItem onClick={() => openEdit(item)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                            )}
                            {can('inventory.item.delete') && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => { setDeleteTarget(item); setDeleteError('') }} className="text-destructive">
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Item' : 'Add Item'}</DialogTitle>
            <DialogDescription>
              {editing ? `Update details for ${editing.name}` : 'Add a new item to the catalogue. A code is generated automatically.'}
            </DialogDescription>
          </DialogHeader>
          {submitError && (
            <Alert variant="destructive"><AlertDescription>{submitError}</AlertDescription></Alert>
          )}
          <div className="space-y-4">
            <div>
              <Label>Item Name <span className="text-destructive">*</span></Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. A4 Paper Ream"
                className="mt-1"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Category <span className="text-destructive">*</span></Label>
                <Combobox
                  value={form.categoryId}
                  onValueChange={v => setForm(f => ({ ...f, categoryId: v }))}
                  options={categories.map(c => ({ value: c.id, label: c.name }))}
                  placeholder="Select category"
                  searchPlaceholder="Search categories…"
                  emptyText="No categories found."
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Unit <span className="text-destructive">*</span></Label>
                <Combobox
                  value={form.unitId}
                  onValueChange={v => setForm(f => ({ ...f, unitId: v }))}
                  options={units.map(u => ({ value: u.id, label: `${u.name} (${u.symbol})` }))}
                  placeholder="Select unit"
                  searchPlaceholder="Search units…"
                  emptyText="No units found."
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Minimum Stock Level</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.minStockLevel}
                  onChange={e => setForm(f => ({ ...f, minStockLevel: e.target.value }))}
                  className={`mt-1 ${fieldErrors.minStockLevel ? 'border-destructive' : ''}`}
                />
                {fieldErrors.minStockLevel && <p className="text-xs text-destructive mt-1">{fieldErrors.minStockLevel}</p>}
              </div>
              <div>
                <Label>Reorder Level</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.reorderLevel}
                  onChange={e => setForm(f => ({ ...f, reorderLevel: e.target.value }))}
                  className={`mt-1 ${fieldErrors.reorderLevel ? 'border-destructive' : ''}`}
                />
                {fieldErrors.reorderLevel && <p className="text-xs text-destructive mt-1">{fieldErrors.reorderLevel}</p>}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Barcode (optional)</Label>
                <Input value={form.barcode} onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Asset Tag (optional)</Label>
                <Input value={form.assetTag} onChange={e => setForm(f => ({ ...f, assetTag: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>Track Expiry</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Requires an expiry date on every stock-in; feeds the expiring-soon report</p>
              </div>
              <Switch checked={form.trackExpiry} onCheckedChange={checked => setForm(f => ({ ...f, trackExpiry: checked }))} />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSubmitting || !form.name.trim() || !form.categoryId || !form.unitId}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? 'Save Changes' : 'Create Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Items with existing stock or movement history cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <Alert variant="destructive"><AlertDescription>{deleteError}</AlertDescription></Alert>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-white hover:bg-destructive/90">
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
