'use client'

import { useState, useEffect, useCallback } from 'react'
import { money } from '@/lib/currency'
import { useAuth } from '@/contexts/auth-context'
import { feeService, type FeeDiscount, type FeeComponentType, type DiscountMode, type DiscountStatus } from '@/lib/services/fee'
import { usersService, type UserListItem } from '@/lib/services/users'
import { metadataService } from '@/lib/services/metadata'
import { FALLBACK_COMPONENT_TYPES } from '@/components/fees/manage-fee-components-dialog'
import { PageHeader } from '@/components/layout/page-header'
import { AccessDenied } from '@/components/ui/access-denied'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { OverviewPageSkeleton } from '@/components/ui/page-skeleton'
import { Plus, Check, X, Edit, Trash2, Loader2, BadgePercent, Search } from 'lucide-react'

const ACADEMIC_YEARS = ['2024-2025', '2025-2026', '2026-2027']

function statusBadgeVariant(status: DiscountStatus): 'default' | 'secondary' | 'destructive' {
  if (status === 'APPROVED') return 'default'
  if (status === 'REJECTED') return 'destructive'
  return 'secondary'
}

type FormState = {
  id: string | null
  studentId: string
  studentLabel: string
  academicYear: string
  type: string
  discountMode: DiscountMode
  value: string
  reason: string
  invoiceId: string
  studentFeeAssignmentId: string
}

function blankForm(): FormState {
  return {
    id: null,
    studentId: '',
    studentLabel: '',
    academicYear: '2025-2026',
    type: 'DISCOUNT',
    discountMode: 'PERCENTAGE',
    value: '',
    reason: '',
    invoiceId: '',
    studentFeeAssignmentId: '',
  }
}

export default function DiscountsPage() {
  const { can } = useAuth()
  // "Required permission: fees:discount:create" was given in colon form, but
  // every other confirmed permission in this app uses dots (e.g.
  // users.user.deactivate) — check both so this doesn't silently hide again.
  const canDiscount = (action: string) => can(`fees.discount.${action}`) || can(`fees:discount:${action}`)

  const [discounts, setDiscounts] = useState<FeeDiscount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [statusFilter, setStatusFilter] = useState<DiscountStatus | 'all'>('all')

  const [typeOptions, setTypeOptions] = useState(FALLBACK_COMPONENT_TYPES)

  const [showFormDialog, setShowFormDialog] = useState(false)
  const [form, setForm] = useState<FormState>(blankForm())
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [studentSearch, setStudentSearch] = useState('')
  const [students, setStudents] = useState<UserListItem[]>([])
  const [isLoadingStudents, setIsLoadingStudents] = useState(false)
  const [studentInvoices, setStudentInvoices] = useState<Array<{ id: string; invoiceNo: string; balanceAmount: string }>>([])

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  const loadDiscounts = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const res = await feeService.getDiscounts({ limit: 100, status: statusFilter === 'all' ? undefined : statusFilter })
      setDiscounts(res.data)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load discounts. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { loadDiscounts() }, [loadDiscounts])

  useEffect(() => {
    metadataService.getFeeDropdowns().then(dropdowns => {
      if (dropdowns?.discountTypes?.length) setTypeOptions(dropdowns.discountTypes)
    })
  }, [])

  // Student search — only while creating (editing keeps the original student).
  useEffect(() => {
    if (!showFormDialog || form.id) return
    setIsLoadingStudents(true)
    usersService.list({ role: 'student', limit: 50, search: studentSearch || undefined }).then(res => {
      setStudents(res.data)
      setIsLoadingStudents(false)
    })
  }, [showFormDialog, form.id, studentSearch])

  // Once a student is picked, pull their invoices + current fee assignment.
  useEffect(() => {
    if (!form.studentId) { setStudentInvoices([]); return }
    feeService.getStudentFeeDetail(form.studentId).then(detail => {
      setStudentInvoices((detail?.invoices ?? []).map(i => ({ id: i.id, invoiceNo: i.invoiceNo, balanceAmount: i.balanceAmount })))
      setForm(f => ({ ...f, studentFeeAssignmentId: detail?.feeAssignment?.id ?? '' }))
    })
  }, [form.studentId])

  const openCreate = () => {
    setForm(blankForm())
    setStudentSearch('')
    setSaveError('')
    setShowFormDialog(true)
  }

  const openEdit = (d: FeeDiscount) => {
    setForm({
      id: d.id,
      studentId: d.studentId,
      studentLabel: d.studentName ?? d.studentId,
      academicYear: d.academicYear,
      type: d.type,
      discountMode: d.discountMode,
      value: d.value,
      reason: d.reason,
      invoiceId: d.invoiceId ?? '',
      studentFeeAssignmentId: d.studentFeeAssignmentId ?? '',
    })
    setSaveError('')
    setShowFormDialog(true)
  }

  const handleSelectStudent = (studentId: string) => {
    const student = students.find(s => s.id === studentId)
    setForm(f => ({ ...f, studentId, studentLabel: student?.fullName ?? studentId, invoiceId: '' }))
  }

  const handleSave = async () => {
    if (!form.value || !form.reason || (!form.id && !form.studentId)) return
    setIsSaving(true)
    setSaveError('')

    if (form.id) {
      const updated = await feeService.updateDiscount(form.id, {
        academicYear: form.academicYear,
        type: form.type as FeeComponentType,
        discountMode: form.discountMode,
        value: form.value,
        reason: form.reason,
      })
      if (!updated) { setSaveError('Failed to update discount'); setIsSaving(false); return }
    } else {
      const result = await feeService.createDiscount({
        studentId: form.studentId,
        invoiceId: form.invoiceId || undefined,
        studentFeeAssignmentId: form.studentFeeAssignmentId || undefined,
        academicYear: form.academicYear,
        type: form.type as FeeComponentType,
        discountMode: form.discountMode,
        value: form.value,
        reason: form.reason,
      })
      if (result.error || !result.discount) {
        setSaveError(result.error || 'Failed to create discount')
        setIsSaving(false)
        return
      }
    }

    await loadDiscounts()
    setShowFormDialog(false)
    setIsSaving(false)
  }

  const handleApprove = async (d: FeeDiscount) => {
    const label = d.discountMode === 'PERCENTAGE' ? `${d.value}%` : money(d.value)
    if (!confirm(`Approve this ${label} discount for ${d.studentName ?? 'this student'}?`)) return
    setActionLoadingId(d.id)
    const result = await feeService.approveDiscount(d.id)
    setActionLoadingId(null)
    if (result.error) alert(result.error)
    await loadDiscounts()
  }

  const handleReject = async (d: FeeDiscount) => {
    const reason = prompt('Reason for rejecting this discount:')
    if (!reason) return
    setActionLoadingId(d.id)
    const result = await feeService.rejectDiscount(d.id, reason)
    setActionLoadingId(null)
    if (result.error) alert(result.error)
    await loadDiscounts()
  }

  const handleDelete = async (d: FeeDiscount) => {
    if (!confirm(`Delete this discount for ${d.studentName ?? 'this student'}? This cannot be undone.`)) return
    setActionLoadingId(d.id)
    await feeService.deleteDiscount(d.id)
    setActionLoadingId(null)
    await loadDiscounts()
  }

  if (!canDiscount('read')) return <AccessDenied />

  if (isLoading) return <OverviewPageSkeleton />

  return (
    <div className="space-y-6">
      <PageHeader title="Discounts & Scholarships" description="Review, approve, and manage fee discounts and scholarships" />

      {loadError && (
        <Alert variant="destructive"><AlertDescription>{loadError}</AlertDescription></Alert>
      )}

      <div className="flex justify-between items-center gap-2 flex-wrap">
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as DiscountStatus | 'all')}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
        {canDiscount('create') && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> New Discount
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="pt-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Academic Year</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead className="text-right">Resolved Amount</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {discounts.map(d => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.studentName ?? d.studentId}</TableCell>
                  <TableCell className="text-muted-foreground">{d.academicYear}</TableCell>
                  <TableCell><Badge variant="secondary">{d.type}</Badge></TableCell>
                  <TableCell>{d.discountMode === 'PERCENTAGE' ? `${d.value}%` : money(d.value)}</TableCell>
                  <TableCell className="text-right">{d.resolvedAmount ? money(d.resolvedAmount) : '—'}</TableCell>
                  <TableCell className="max-w-[240px] truncate text-muted-foreground" title={d.reason}>{d.reason}</TableCell>
                  <TableCell><Badge variant={statusBadgeVariant(d.status)}>{d.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      {d.status === 'PENDING' && canDiscount('approve') && (
                        <Button variant="ghost" size="icon" onClick={() => handleApprove(d)} disabled={actionLoadingId === d.id} title="Approve">
                          {actionLoadingId === d.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-emerald-600" />}
                        </Button>
                      )}
                      {d.status === 'PENDING' && canDiscount('reject') && (
                        <Button variant="ghost" size="icon" onClick={() => handleReject(d)} disabled={actionLoadingId === d.id} title="Reject">
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                      {canDiscount('update') && (
                        <Button variant="ghost" size="icon" onClick={() => openEdit(d)} title="Edit">
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {canDiscount('delete') && (
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(d)} disabled={actionLoadingId === d.id} title="Delete">
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {discounts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                    <BadgePercent className="mx-auto h-10 w-10 text-muted-foreground/50 mb-2" />
                    No discounts found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showFormDialog} onOpenChange={setShowFormDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit Discount' : 'New Discount'}</DialogTitle>
            <DialogDescription>
              {form.id ? 'Update this discount request.' : 'Create a percentage- or fixed-amount discount for a student.'}
            </DialogDescription>
          </DialogHeader>

          {saveError && <Alert variant="destructive"><AlertDescription>{saveError}</AlertDescription></Alert>}

          <div className="space-y-4 py-2">
            {form.id ? (
              <div className="space-y-2">
                <Label>Student</Label>
                <Input value={form.studentLabel} disabled />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Student</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search students…" value={studentSearch} onChange={e => setStudentSearch(e.target.value)} className="pl-8" />
                </div>
                <Select value={form.studentId} onValueChange={handleSelectStudent}>
                  <SelectTrigger><SelectValue placeholder={isLoadingStudents ? 'Searching…' : 'Select a student'} /></SelectTrigger>
                  <SelectContent>
                    {students.map(s => <SelectItem key={s.id} value={s.id}>{s.fullName} ({s.userCode})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Academic Year</Label>
                <Select value={form.academicYear} onValueChange={v => setForm(f => ({ ...f, academicYear: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACADEMIC_YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {typeOptions.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Discount Mode</Label>
                <Select value={form.discountMode} onValueChange={v => setForm(f => ({ ...f, discountMode: v as DiscountMode }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                    <SelectItem value="FIXED">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Value {form.discountMode === 'PERCENTAGE' ? '(%)' : '(amount)'}</Label>
                <Input
                  type="number"
                  value={form.value}
                  onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                  placeholder={form.discountMode === 'PERCENTAGE' ? 'e.g., 25' : 'e.g., 1000'}
                />
              </div>
            </div>

            {!form.id && studentInvoices.length > 0 && (
              <div className="space-y-2">
                <Label>Invoice (optional)</Label>
                <Select value={form.invoiceId || 'none'} onValueChange={v => setForm(f => ({ ...f, invoiceId: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific invoice</SelectItem>
                    {studentInvoices.map(inv => (
                      <SelectItem key={inv.id} value={inv.id}>{inv.invoiceNo} — Balance {money(inv.balanceAmount)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea
                rows={3}
                value={form.reason}
                onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="e.g., Merit scholarship for top academic performance."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFormDialog(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving || !form.value || !form.reason || (!form.id && !form.studentId)}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {form.id ? 'Save Changes' : 'Create Discount'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
