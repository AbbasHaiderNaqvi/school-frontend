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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { financeService, type Vendor, type CreateVendorRequest } from '@/lib/services/finance'
import { emailError, phoneError, numberError, requiredError, hasNoErrors } from '@/lib/validation'
import { Plus, Search, MoreHorizontal, Edit, Trash2, Loader2, RefreshCw, Truck, Eye } from 'lucide-react'
import { SkeletonTableRows } from '@/components/ui/page-skeleton'

const EMPTY_FORM = {
  name: '', code: '', contactPerson: '', phone: '', email: '', address: '', paymentTermsDays: '30', notes: '',
}

export default function VendorsPage() {
  const { can } = useAuth()

  const [vendors, setVendors] = useState<Vendor[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Vendor | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState(EMPTY_FORM)

  const [viewing, setViewing] = useState<Vendor | null>(null)
  const [isViewLoading, setIsViewLoading] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const result = await financeService.getVendors({ limit: 100, search: search || undefined })
      setVendors(result.data)
      setTotal(result.total)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load vendors.')
    } finally {
      setIsLoading(false)
    }
  }, [search])

  useEffect(() => { loadData() }, [loadData])

  if (!can('finance.vendor.read')) return <AccessDenied />

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setSubmitError('')
    setFieldErrors({})
    setDialogOpen(true)
  }

  const openEdit = (vendor: Vendor) => {
    setEditing(vendor)
    setForm({
      name: vendor.name,
      code: vendor.code,
      contactPerson: vendor.contactPerson ?? '',
      phone: vendor.phone ?? '',
      email: vendor.email ?? '',
      address: vendor.address ?? '',
      paymentTermsDays: vendor.paymentTermsDays != null ? String(vendor.paymentTermsDays) : '',
      notes: vendor.notes ?? '',
    })
    setSubmitError('')
    setFieldErrors({})
    setDialogOpen(true)
  }

  const openView = async (vendor: Vendor) => {
    setViewing(vendor)
    setIsViewLoading(true)
    const full = await financeService.getVendor(vendor.id)
    if (full) setViewing(full)
    setIsViewLoading(false)
  }

  const validate = (): boolean => {
    const errors: Record<string, string> = {}
    const nameErr = requiredError(form.name, 'Vendor name')
    if (nameErr) errors.name = nameErr
    const codeErr = requiredError(form.code, 'Code')
    if (codeErr) errors.code = codeErr
    const emailErr = emailError(form.email, false)
    if (emailErr) errors.email = emailErr
    const phoneErr = phoneError(form.phone, false)
    if (phoneErr) errors.phone = phoneErr
    const termsErr = numberError(form.paymentTermsDays, { min: 0, label: 'Payment terms' })
    if (termsErr) errors.paymentTermsDays = termsErr
    setFieldErrors(errors)
    return hasNoErrors(errors)
  }

  const handleSave = async () => {
    if (!validate()) return
    setIsSubmitting(true)
    setSubmitError('')

    const payload: CreateVendorRequest = {
      name: form.name.trim(),
      code: form.code.trim(),
      contactPerson: form.contactPerson.trim() || undefined,
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      address: form.address.trim() || undefined,
      paymentTermsDays: form.paymentTermsDays ? Number(form.paymentTermsDays) : undefined,
      notes: form.notes.trim() || undefined,
    }

    const result = editing
      ? await financeService.updateVendor(editing.id, payload)
      : await financeService.createVendor(payload)

    setIsSubmitting(false)
    if (result.error || !result.vendor) {
      setSubmitError(result.error || 'Operation failed')
      return
    }
    setDialogOpen(false)
    loadData()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    setDeleteError('')
    const { error } = await financeService.deleteVendor(deleteTarget.id)
    setIsDeleting(false)
    if (error) { setDeleteError(error); return }
    setDeleteTarget(null)
    loadData()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendors"
        description="Suppliers for purchases, bills, and goods received"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={loadData} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            {can('finance.vendor.create') && (
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" /> Add Vendor
              </Button>
            )}
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>All Vendors ({total})</CardTitle>
          <div className="relative max-w-sm mt-3">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or code…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loadError && <Alert variant="destructive" className="mb-4"><AlertDescription>{loadError}</AlertDescription></Alert>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Contact Person</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Payment Terms</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <SkeletonTableRows rows={6} cols={7} />
              ) : (
                <>
                  {vendors.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        <Truck className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        No vendors yet
                      </TableCell>
                    </TableRow>
                  )}
                  {vendors.map(vendor => (
                    <TableRow key={vendor.id}>
                      <TableCell>
                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{vendor.code}</span>
                      </TableCell>
                      <TableCell className="font-semibold">{vendor.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{vendor.contactPerson ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{vendor.phone ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{vendor.email ?? '—'}</TableCell>
                      <TableCell className="text-right text-sm">
                        {vendor.paymentTermsDays != null ? `${vendor.paymentTermsDays} days` : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openView(vendor)}>
                              <Eye className="mr-2 h-4 w-4" /> View
                            </DropdownMenuItem>
                            {can('finance.vendor.update') && (
                              <DropdownMenuItem onClick={() => openEdit(vendor)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                            )}
                            {can('finance.vendor.delete') && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => { setDeleteTarget(vendor); setDeleteError('') }} className="text-destructive">
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
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Vendor' : 'Add Vendor'}</DialogTitle>
            <DialogDescription>
              {editing ? `Update details for ${editing.name}` : 'Register a supplier for purchases and bills'}
            </DialogDescription>
          </DialogHeader>
          {submitError && <Alert variant="destructive"><AlertDescription>{submitError}</AlertDescription></Alert>}

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <Label>Name <span className="text-destructive">*</span></Label>
                <Input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="K-Electric"
                  className={`mt-1 ${fieldErrors.name ? 'border-destructive' : ''}`}
                />
                {fieldErrors.name && <p className="text-xs text-destructive mt-1">{fieldErrors.name}</p>}
              </div>
              <div>
                <Label>Code <span className="text-destructive">*</span></Label>
                <Input
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                  placeholder="KE"
                  className={`mt-1 ${fieldErrors.code ? 'border-destructive' : ''}`}
                />
                {fieldErrors.code && <p className="text-xs text-destructive mt-1">{fieldErrors.code}</p>}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Contact Person</Label>
                <Input
                  value={form.contactPerson}
                  onChange={e => setForm(f => ({ ...f, contactPerson: e.target.value }))}
                  placeholder="Billing Department"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Payment Terms (days)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.paymentTermsDays}
                  onChange={e => setForm(f => ({ ...f, paymentTermsDays: e.target.value }))}
                  className={`mt-1 ${fieldErrors.paymentTermsDays ? 'border-destructive' : ''}`}
                />
                {fieldErrors.paymentTermsDays && <p className="text-xs text-destructive mt-1">{fieldErrors.paymentTermsDays}</p>}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+92 21 111 000 000"
                  className={`mt-1 ${fieldErrors.phone ? 'border-destructive' : ''}`}
                />
                {fieldErrors.phone && <p className="text-xs text-destructive mt-1">{fieldErrors.phone}</p>}
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="billing@ke.com.pk"
                  className={`mt-1 ${fieldErrors.email ? 'border-destructive' : ''}`}
                />
                {fieldErrors.email && <p className="text-xs text-destructive mt-1">{fieldErrors.email}</p>}
              </div>
            </div>

            <div>
              <Label>Address</Label>
              <Textarea rows={2} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="mt-1" />
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="mt-1" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSubmitting || !form.name.trim() || !form.code.trim()}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? 'Save Changes' : 'Create Vendor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewing} onOpenChange={open => !open && setViewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{viewing?.name}</DialogTitle>
            <DialogDescription>
              <span className="font-mono">{viewing?.code}</span>
              {viewing?.isActive === false && <Badge variant="secondary" className="ml-2">Inactive</Badge>}
            </DialogDescription>
          </DialogHeader>
          {isViewLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-muted-foreground">Contact Person</p><p className="font-medium">{viewing?.contactPerson ?? '—'}</p></div>
              <div><p className="text-muted-foreground">Payment Terms</p><p className="font-medium">{viewing?.paymentTermsDays != null ? `${viewing.paymentTermsDays} days` : '—'}</p></div>
              <div><p className="text-muted-foreground">Phone</p><p className="font-medium">{viewing?.phone ?? '—'}</p></div>
              <div><p className="text-muted-foreground">Email</p><p className="font-medium">{viewing?.email ?? '—'}</p></div>
              <div className="col-span-2"><p className="text-muted-foreground">Address</p><p className="font-medium">{viewing?.address ?? '—'}</p></div>
              <div className="col-span-2"><p className="text-muted-foreground">Notes</p><p className="font-medium">{viewing?.notes ?? '—'}</p></div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Vendors with bills or goods received may not be deletable.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && <Alert variant="destructive"><AlertDescription>{deleteError}</AlertDescription></Alert>}
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
