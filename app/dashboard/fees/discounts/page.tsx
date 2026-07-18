'use client'

import { useState, useEffect, useCallback } from 'react'
import { money } from '@/lib/currency'
import { useAuth } from '@/contexts/auth-context'
import { feeService, type FeeDiscount, type DiscountType, type DiscountMode, type DiscountStatus } from '@/lib/services/fee'
import { studentService, type StudentDropdownItem } from '@/lib/services/student'
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
import { Combobox } from '@/components/ui/combobox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { OverviewPageSkeleton } from '@/components/ui/page-skeleton'
import { numberError, requiredError, hasNoErrors } from '@/lib/validation'
import { Plus, Check, X, Edit, Trash2, Loader2, BadgePercent, Users } from 'lucide-react'

const ACADEMIC_YEARS = ['2024-2025', '2025-2026', '2026-2027']

const DISCOUNT_TYPES: Array<{ value: DiscountType; label: string }> = [
  { value: 'DISCOUNT', label: 'Discount' },
  { value: 'SCHOLARSHIP', label: 'Scholarship' },
  { value: 'WAIVER', label: 'Waiver' },
  { value: 'SIBLING_DISCOUNT', label: 'Sibling Discount' },
  { value: 'STAFF_DISCOUNT', label: 'Staff Discount' },
  { value: 'MERIT_BASED', label: 'Merit Based' },
  { value: 'NEED_BASED', label: 'Need Based' },
]

const ALL = '__all__'

function statusBadgeVariant(status: DiscountStatus): 'default' | 'secondary' | 'destructive' {
  if (status === 'APPROVED') return 'default'
  if (status === 'REJECTED') return 'destructive'
  return 'secondary'
}

function studentLabel(s: StudentDropdownItem): string {
  return s.admissionNumber ? `${s.name} (${s.admissionNumber})` : s.name
}

type FormState = {
  id: string | null
  studentId: string
  studentLabel: string
  academicYear: string
  type: DiscountType
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

type BulkFormState = {
  studentIds: string[]
  academicYear: string
  type: DiscountType
  discountMode: DiscountMode
  value: string
  reason: string
}

function blankBulkForm(): BulkFormState {
  return {
    studentIds: [],
    academicYear: '2025-2026',
    type: 'SIBLING_DISCOUNT',
    discountMode: 'PERCENTAGE',
    value: '',
    reason: '',
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
  const [typeFilter, setTypeFilter] = useState<DiscountType | 'all'>('all')
  const [studentFilter, setStudentFilter] = useState('')

  const [studentsDropdown, setStudentsDropdown] = useState<StudentDropdownItem[]>([])

  const [showFormDialog, setShowFormDialog] = useState(false)
  const [form, setForm] = useState<FormState>(blankForm())
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const [studentInvoices, setStudentInvoices] = useState<Array<{ id: string; invoiceNo: string; balanceAmount: string }>>([])

  const [showBulkDialog, setShowBulkDialog] = useState(false)
  const [bulkForm, setBulkForm] = useState<BulkFormState>(blankBulkForm())
  const [bulkPickerId, setBulkPickerId] = useState('')
  const [isBulkSaving, setIsBulkSaving] = useState(false)
  const [bulkError, setBulkError] = useState('')
  const [bulkFieldErrors, setBulkFieldErrors] = useState<Record<string, string>>({})
  const [bulkResult, setBulkResult] = useState<number | null>(null)

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  const loadDiscounts = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const res = await feeService.getDiscounts({
        limit: 100,
        status: statusFilter === 'all' ? undefined : statusFilter,
        type: typeFilter === 'all' ? undefined : typeFilter,
        studentId: studentFilter || undefined,
      })
      setDiscounts(res.data)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load discounts. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, typeFilter, studentFilter])

  useEffect(() => { loadDiscounts() }, [loadDiscounts])

  // Student profiles (never the users list) — per the dropdown-first rule.
  useEffect(() => {
    studentService.getStudentsDropdown().then(setStudentsDropdown)
  }, [])

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
    setSaveError('')
    setFieldErrors({})
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
    setFieldErrors({})
    setShowFormDialog(true)
  }

  const handleSelectStudent = (studentId: string) => {
    const student = studentsDropdown.find(s => s.id === studentId)
    setForm(f => ({ ...f, studentId, studentLabel: student ? studentLabel(student) : studentId, invoiceId: '' }))
  }

  const validate = (): boolean => {
    const errors: Record<string, string> = {}
    if (!form.id) {
      const studentErr = requiredError(form.studentId, 'Student')
      if (studentErr) errors.studentId = studentErr
    }
    const isPercentage = form.discountMode === 'PERCENTAGE'
    const valueErr = numberError(form.value, {
      required: true,
      min: 0,
      max: isPercentage ? 100 : undefined,
      label: isPercentage ? 'Percentage' : 'Amount',
    })
    if (valueErr) errors.value = valueErr
    const reasonErr = requiredError(form.reason, 'Reason')
    if (reasonErr) errors.reason = reasonErr
    setFieldErrors(errors)
    return hasNoErrors(errors)
  }

  const isValid = !!form.value && !!form.reason && (!!form.id || !!form.studentId)

  const handleSave = async () => {
    if (!isValid || !validate()) return
    setIsSaving(true)
    setSaveError('')

    if (form.id) {
      const updated = await feeService.updateDiscount(form.id, {
        academicYear: form.academicYear,
        type: form.type,
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
        type: form.type,
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

  const openBulk = () => {
    setBulkForm(blankBulkForm())
    setBulkPickerId('')
    setBulkError('')
    setBulkFieldErrors({})
    setBulkResult(null)
    setShowBulkDialog(true)
  }

  const addBulkStudent = (studentId: string) => {
    if (!studentId || bulkForm.studentIds.includes(studentId)) return
    setBulkForm(f => ({ ...f, studentIds: [...f.studentIds, studentId] }))
    setBulkPickerId('')
  }

  const removeBulkStudent = (studentId: string) => {
    setBulkForm(f => ({ ...f, studentIds: f.studentIds.filter(id => id !== studentId) }))
  }

  const validateBulk = (): boolean => {
    const errors: Record<string, string> = {}
    if (bulkForm.studentIds.length === 0) errors.studentIds = 'Select at least one student.'
    const isPercentage = bulkForm.discountMode === 'PERCENTAGE'
    const valueErr = numberError(bulkForm.value, {
      required: true,
      min: 0,
      max: isPercentage ? 100 : undefined,
      label: isPercentage ? 'Percentage' : 'Amount',
    })
    if (valueErr) errors.value = valueErr
    const reasonErr = requiredError(bulkForm.reason, 'Reason')
    if (reasonErr) errors.reason = reasonErr
    setBulkFieldErrors(errors)
    return hasNoErrors(errors)
  }

  const isBulkValid = bulkForm.studentIds.length > 0 && !!bulkForm.value && !!bulkForm.reason

  const handleBulkSave = async () => {
    if (!isBulkValid || !validateBulk()) return
    setIsBulkSaving(true)
    setBulkError('')
    setBulkResult(null)

    const result = await feeService.createDiscountsBulk({
      studentIds: bulkForm.studentIds,
      academicYear: bulkForm.academicYear,
      type: bulkForm.type,
      discountMode: bulkForm.discountMode,
      value: bulkForm.value,
      reason: bulkForm.reason,
    })

    setIsBulkSaving(false)
    if (result.error) { setBulkError(result.error); return }

    setBulkResult(result.discounts.length)
    await loadDiscounts()
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
        <div className="flex gap-2 flex-wrap items-center">
          <Select value={statusFilter} onValueChange={v => setStatusFilter(v as DiscountStatus | 'all')}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={v => setTypeFilter(v as DiscountType | 'all')}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {DISCOUNT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Combobox
            value={studentFilter}
            onValueChange={setStudentFilter}
            options={studentsDropdown.map(s => ({ value: s.id, label: studentLabel(s) }))}
            placeholder="Filter by student"
            searchPlaceholder="Search students…"
            emptyText="No students found."
            className="w-56"
          />
        </div>
        <div className="flex gap-2">
          {canDiscount('create') && (
            <Button variant="outline" onClick={openBulk}>
              <Users className="mr-2 h-4 w-4" /> Bulk Assign
            </Button>
          )}
          {canDiscount('create') && (
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> New Discount
            </Button>
          )}
        </div>
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

      {/* Single create/edit dialog */}
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
                <Combobox
                  value={form.studentId}
                  onValueChange={handleSelectStudent}
                  options={studentsDropdown.map(s => ({ value: s.id, label: studentLabel(s) }))}
                  placeholder="Select a student"
                  searchPlaceholder="Search students…"
                  emptyText="No students found."
                  className={fieldErrors.studentId ? 'border-destructive' : ''}
                />
                {fieldErrors.studentId && <p className="text-xs text-destructive mt-1">{fieldErrors.studentId}</p>}
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
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as DiscountType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DISCOUNT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
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
                  min={0}
                  max={form.discountMode === 'PERCENTAGE' ? 100 : undefined}
                  value={form.value}
                  onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                  placeholder={form.discountMode === 'PERCENTAGE' ? 'e.g., 25' : 'e.g., 1000'}
                  className={fieldErrors.value ? 'border-destructive' : ''}
                />
                {fieldErrors.value && <p className="text-xs text-destructive mt-1">{fieldErrors.value}</p>}
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
                className={fieldErrors.reason ? 'border-destructive' : ''}
              />
              {fieldErrors.reason && <p className="text-xs text-destructive mt-1">{fieldErrors.reason}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFormDialog(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving || !isValid}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {form.id ? 'Save Changes' : 'Create Discount'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk assign dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Assign Discount</DialogTitle>
            <DialogDescription>Apply the same discount or scholarship to a group of students at once — e.g. a sibling discount for a whole family.</DialogDescription>
          </DialogHeader>

          {bulkError && <Alert variant="destructive"><AlertDescription>{bulkError}</AlertDescription></Alert>}
          {bulkResult !== null && (
            <Alert><AlertDescription>Created {bulkResult} discount{bulkResult === 1 ? '' : 's'}.</AlertDescription></Alert>
          )}

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Students</Label>
              <Combobox
                value={bulkPickerId}
                onValueChange={addBulkStudent}
                options={studentsDropdown
                  .filter(s => !bulkForm.studentIds.includes(s.id))
                  .map(s => ({ value: s.id, label: studentLabel(s) }))}
                placeholder="Add a student…"
                searchPlaceholder="Search students…"
                emptyText="No students found."
                className={bulkFieldErrors.studentIds ? 'border-destructive' : ''}
              />
              {bulkFieldErrors.studentIds && <p className="text-xs text-destructive mt-1">{bulkFieldErrors.studentIds}</p>}
              {bulkForm.studentIds.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {bulkForm.studentIds.map(id => {
                    const s = studentsDropdown.find(x => x.id === id)
                    return (
                      <Badge key={id} variant="secondary" className="gap-1 pr-1">
                        {s ? studentLabel(s) : id}
                        <button type="button" onClick={() => removeBulkStudent(id)} className="ml-1 rounded-full hover:bg-muted-foreground/20">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Academic Year</Label>
                <Select value={bulkForm.academicYear} onValueChange={v => setBulkForm(f => ({ ...f, academicYear: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACADEMIC_YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={bulkForm.type} onValueChange={v => setBulkForm(f => ({ ...f, type: v as DiscountType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DISCOUNT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Discount Mode</Label>
                <Select value={bulkForm.discountMode} onValueChange={v => setBulkForm(f => ({ ...f, discountMode: v as DiscountMode }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                    <SelectItem value="FIXED">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Value {bulkForm.discountMode === 'PERCENTAGE' ? '(%)' : '(amount)'}</Label>
                <Input
                  type="number"
                  min={0}
                  max={bulkForm.discountMode === 'PERCENTAGE' ? 100 : undefined}
                  value={bulkForm.value}
                  onChange={e => setBulkForm(f => ({ ...f, value: e.target.value }))}
                  placeholder={bulkForm.discountMode === 'PERCENTAGE' ? 'e.g., 25' : 'e.g., 1000'}
                  className={bulkFieldErrors.value ? 'border-destructive' : ''}
                />
                {bulkFieldErrors.value && <p className="text-xs text-destructive mt-1">{bulkFieldErrors.value}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea
                rows={3}
                value={bulkForm.reason}
                onChange={e => setBulkForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="e.g., Sibling discount for the 2025-2026 session."
                className={bulkFieldErrors.reason ? 'border-destructive' : ''}
              />
              {bulkFieldErrors.reason && <p className="text-xs text-destructive mt-1">{bulkFieldErrors.reason}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDialog(false)} disabled={isBulkSaving}>Close</Button>
            <Button onClick={handleBulkSave} disabled={isBulkSaving || !isBulkValid}>
              {isBulkSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Assign to {bulkForm.studentIds.length || 0} Student{bulkForm.studentIds.length === 1 ? '' : 's'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
