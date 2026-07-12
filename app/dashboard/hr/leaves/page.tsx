'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import {
  hrService,
  type LeaveType,
  type LeaveApplication,
  type LeaveApplicationStatus,
  type LeaveBalanceEntry,
  type Employee,
} from '@/lib/services/hr'
import { PageHeader } from '@/components/layout/page-header'
import { AccessDenied } from '@/components/ui/access-denied'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { OverviewPageSkeleton } from '@/components/ui/page-skeleton'
import {
  Plus, Check, X, Edit, Trash2, Loader2, CalendarDays, ListChecks, Wallet2, Ban,
} from 'lucide-react'

const YEARS = ['2024', '2025', '2026', '2027']

function employeeLabel(e: Employee): string {
  return e.fullName ?? `${e.firstName} ${e.lastName}`
}

function statusBadgeVariant(status: LeaveApplicationStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'APPROVED') return 'default'
  if (status === 'REJECTED') return 'destructive'
  if (status === 'CANCELLED') return 'outline'
  return 'secondary'
}

// ── Leave Type form ──────────────────────────────────────────────────────────

type TypeFormState = {
  id: string | null
  name: string
  code: string
  description: string
  totalDaysAllowed: string
  isPaid: boolean
  carryForward: boolean
  maxCarryForwardDays: string
}

function blankTypeForm(): TypeFormState {
  return { id: null, name: '', code: '', description: '', totalDaysAllowed: '', isPaid: true, carryForward: false, maxCarryForwardDays: '0' }
}

export default function LeavesPage() {
  const { can, user } = useAuth()
  const canLeaveType = (action: string) => can(`hr.leave_type.${action}`)
  const canLeaveApplication = (action: string) => can(`hr.leave_application.${action}`)
  const canLeaveBalance = (action: string) => can(`hr.leave_balance.${action}`)

  const [activeTab, setActiveTab] = useState('applications')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  // ── Applications state ──────────────────────────────────────────────────────
  const [applications, setApplications] = useState<LeaveApplication[]>([])
  const [statusFilter, setStatusFilter] = useState<LeaveApplicationStatus | 'all'>('all')
  const [isLoadingApplications, setIsLoadingApplications] = useState(false)
  const [showApplyDialog, setShowApplyDialog] = useState(false)
  const [applyForm, setApplyForm] = useState({ employeeId: '', leaveTypeId: '', startDate: '', endDate: '', reason: '' })
  const [isApplying, setIsApplying] = useState(false)
  const [applyError, setApplyError] = useState('')
  const [reviewingId, setReviewingId] = useState<string | null>(null)

  // ── Leave Types state ────────────────────────────────────────────────────────
  const [typeForm, setTypeForm] = useState<TypeFormState | null>(null)
  const [isSavingType, setIsSavingType] = useState(false)
  const [typeSaveError, setTypeSaveError] = useState('')
  const [deletingTypeId, setDeletingTypeId] = useState<string | null>(null)

  // ── Balances state ───────────────────────────────────────────────────────────
  const [balanceEmployeeId, setBalanceEmployeeId] = useState('')
  const [balanceYear, setBalanceYear] = useState('2025')
  const [balances, setBalances] = useState<LeaveBalanceEntry[]>([])
  const [isLoadingBalances, setIsLoadingBalances] = useState(false)
  const [balanceError, setBalanceError] = useState('')
  const [showAllocateDialog, setShowAllocateDialog] = useState(false)
  const [allocateForm, setAllocateForm] = useState({ leaveTypeId: '', year: '2025', days: '' })
  const [isAllocating, setIsAllocating] = useState(false)
  const [allocateError, setAllocateError] = useState('')

  const loadBase = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const [empData, typesData] = await Promise.all([
        hrService.getEmployees({ limit: 200 }),
        hrService.getLeaveTypes(),
      ])
      setEmployees(empData.data)
      setLeaveTypes(typesData)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load data. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadBase() }, [loadBase])

  const loadApplications = useCallback(async () => {
    setIsLoadingApplications(true)
    try {
      const res = await hrService.getLeaveApplications({ limit: 100, status: statusFilter === 'all' ? undefined : statusFilter })
      setApplications(res.data)
    } finally {
      setIsLoadingApplications(false)
    }
  }, [statusFilter])

  useEffect(() => { if (activeTab === 'applications') loadApplications() }, [activeTab, loadApplications])

  const reloadLeaveTypes = useCallback(async () => {
    const types = await hrService.getLeaveTypes()
    setLeaveTypes(types)
  }, [])

  // ── Applications actions ─────────────────────────────────────────────────────

  const openApply = () => {
    setApplyForm({ employeeId: user?.linkedId ?? '', leaveTypeId: '', startDate: '', endDate: '', reason: '' })
    setApplyError('')
    setShowApplyDialog(true)
  }

  const handleApply = async () => {
    if (!applyForm.employeeId || !applyForm.leaveTypeId || !applyForm.startDate || !applyForm.endDate) return
    setIsApplying(true)
    setApplyError('')
    const result = await hrService.createLeaveApplication({
      employeeId: applyForm.employeeId,
      leaveTypeId: applyForm.leaveTypeId,
      startDate: applyForm.startDate,
      endDate: applyForm.endDate,
      reason: applyForm.reason || undefined,
    })
    if (result.error || !result.application) {
      setApplyError(result.error || 'Failed to submit leave application')
      setIsApplying(false)
      return
    }
    await loadApplications()
    setShowApplyDialog(false)
    setIsApplying(false)
  }

  const handleReview = async (a: LeaveApplication, decision: 'APPROVED' | 'REJECTED' | 'CANCELLED') => {
    const verb = decision === 'APPROVED' ? 'approve' : decision === 'REJECTED' ? 'reject' : 'cancel'
    let comment: string | undefined
    if (decision === 'REJECTED' || decision === 'CANCELLED') {
      const input = prompt(`Reason to ${verb} this leave application:`)
      if (input === null) return
      comment = input || undefined
    } else if (!confirm(`Approve this leave application for ${a.employeeName ?? 'this employee'}?`)) {
      return
    }
    setReviewingId(a.id)
    const result = await hrService.reviewLeaveApplication(a.id, decision, comment)
    setReviewingId(null)
    if (result.error) alert(result.error)
    await loadApplications()
  }

  // ── Leave Type actions ───────────────────────────────────────────────────────

  const openCreateType = () => { setTypeForm(blankTypeForm()); setTypeSaveError('') }
  const openEditType = (t: LeaveType) => {
    setTypeForm({
      id: t.id,
      name: t.name,
      code: t.code,
      description: t.description ?? '',
      totalDaysAllowed: String(t.totalDaysAllowed),
      isPaid: t.isPaid,
      carryForward: t.carryForward,
      maxCarryForwardDays: String(t.maxCarryForwardDays),
    })
    setTypeSaveError('')
  }

  const handleSaveType = async () => {
    if (!typeForm || !typeForm.name || !typeForm.code || !typeForm.totalDaysAllowed) return
    setIsSavingType(true)
    setTypeSaveError('')

    if (typeForm.id) {
      const updated = await hrService.updateLeaveType(typeForm.id, {
        name: typeForm.name,
        code: typeForm.code,
        description: typeForm.description || undefined,
        totalDaysAllowed: Number(typeForm.totalDaysAllowed),
        isPaid: typeForm.isPaid,
        carryForward: typeForm.carryForward,
        maxCarryForwardDays: Number(typeForm.maxCarryForwardDays || 0),
      })
      if (!updated) { setTypeSaveError('Failed to update leave type'); setIsSavingType(false); return }
    } else {
      const result = await hrService.createLeaveType({
        name: typeForm.name,
        code: typeForm.code,
        description: typeForm.description || undefined,
        totalDaysAllowed: Number(typeForm.totalDaysAllowed),
        isPaid: typeForm.isPaid,
        carryForward: typeForm.carryForward,
        maxCarryForwardDays: Number(typeForm.maxCarryForwardDays || 0),
      })
      if (result.error || !result.leaveType) {
        setTypeSaveError(result.error || 'Failed to create leave type')
        setIsSavingType(false)
        return
      }
    }

    await reloadLeaveTypes()
    setTypeForm(null)
    setIsSavingType(false)
  }

  const handleDeleteType = async (t: LeaveType) => {
    if (!confirm(`Delete leave type "${t.name}"? This cannot be undone.`)) return
    setDeletingTypeId(t.id)
    await hrService.deleteLeaveType(t.id)
    await reloadLeaveTypes()
    setDeletingTypeId(null)
  }

  // ── Balances actions ─────────────────────────────────────────────────────────

  const loadBalances = useCallback(async () => {
    if (!balanceEmployeeId) return
    setIsLoadingBalances(true)
    setBalanceError('')
    try {
      const data = await hrService.getLeaveBalance(balanceEmployeeId, balanceYear)
      setBalances(data)
    } catch (err) {
      setBalanceError(err instanceof Error ? err.message : 'Failed to load leave balance.')
    } finally {
      setIsLoadingBalances(false)
    }
  }, [balanceEmployeeId, balanceYear])

  const openAllocate = () => {
    if (!balanceEmployeeId) return
    setAllocateForm({ leaveTypeId: '', year: balanceYear, days: '' })
    setAllocateError('')
    setShowAllocateDialog(true)
  }

  const handleAllocate = async () => {
    if (!balanceEmployeeId || !allocateForm.leaveTypeId || !allocateForm.year || !allocateForm.days) return
    setIsAllocating(true)
    setAllocateError('')
    const result = await hrService.allocateLeaveType({
      employeeId: balanceEmployeeId,
      leaveTypeId: allocateForm.leaveTypeId,
      year: allocateForm.year,
      days: Number(allocateForm.days),
    })
    setIsAllocating(false)
    if (!result.success) { setAllocateError(result.error || 'Failed to allocate leave'); return }
    setShowAllocateDialog(false)
    await loadBalances()
  }

  if (!canLeaveApplication('read')) return <AccessDenied />

  if (isLoading) return <OverviewPageSkeleton />

  return (
    <div className="space-y-6">
      <PageHeader title="Leave Management" description="Leave types, applications, approvals, and employee balances" />

      {loadError && <Alert variant="destructive"><AlertDescription>{loadError}</AlertDescription></Alert>}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="applications" className="gap-2"><ListChecks className="h-4 w-4" />Applications</TabsTrigger>
          <TabsTrigger value="types" className="gap-2"><CalendarDays className="h-4 w-4" />Leave Types</TabsTrigger>
          <TabsTrigger value="balances" className="gap-2"><Wallet2 className="h-4 w-4" />Balances</TabsTrigger>
        </TabsList>

        {/* Applications */}
        <TabsContent value="applications" className="space-y-4 mt-4">
          <div className="flex justify-between items-center gap-2 flex-wrap">
            <Select value={statusFilter} onValueChange={v => setStatusFilter(v as LeaveApplicationStatus | 'all')}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            {canLeaveApplication('create') && (
              <Button onClick={openApply}><Plus className="mr-2 h-4 w-4" /> Apply for Leave</Button>
            )}
          </div>

          <Card>
            <CardContent className="pt-6 overflow-x-auto">
              {isLoadingApplications ? (
                <div className="flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Leave Type</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applications.map(a => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.employeeName ?? a.employeeId}</TableCell>
                        <TableCell>{a.leaveTypeName ?? leaveTypes.find(t => t.id === a.leaveTypeId)?.name ?? a.leaveTypeId}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(a.startDate).toLocaleDateString()} – {new Date(a.endDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{a.days ?? '—'}</TableCell>
                        <TableCell className="max-w-[220px] truncate text-muted-foreground" title={a.reason}>{a.reason || '—'}</TableCell>
                        <TableCell><Badge variant={statusBadgeVariant(a.status)}>{a.status}</Badge></TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            {a.status === 'PENDING' && canLeaveApplication('approve') && (
                              <Button variant="ghost" size="icon" onClick={() => handleReview(a, 'APPROVED')} disabled={reviewingId === a.id} title="Approve">
                                {reviewingId === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-emerald-600" />}
                              </Button>
                            )}
                            {a.status === 'PENDING' && canLeaveApplication('reject') && (
                              <Button variant="ghost" size="icon" onClick={() => handleReview(a, 'REJECTED')} disabled={reviewingId === a.id} title="Reject">
                                <X className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                            {a.status === 'PENDING' && canLeaveApplication('cancel') && (
                              <Button variant="ghost" size="icon" onClick={() => handleReview(a, 'CANCELLED')} disabled={reviewingId === a.id} title="Cancel">
                                <Ban className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {applications.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                          <ListChecks className="mx-auto h-10 w-10 text-muted-foreground/50 mb-2" />
                          No leave applications found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leave Types */}
        <TabsContent value="types" className="space-y-4 mt-4">
          <div className="flex justify-end">
            {canLeaveType('create') && (
              <Button onClick={openCreateType}><Plus className="mr-2 h-4 w-4" /> Add Leave Type</Button>
            )}
          </div>

          <Card>
            <CardContent className="pt-6 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead className="text-right">Days Allowed</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Carry Forward</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveTypes.map(t => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <div className="font-medium">{t.name}</div>
                        {t.description && <div className="text-xs text-muted-foreground">{t.description}</div>}
                      </TableCell>
                      <TableCell><Badge variant="secondary">{t.code}</Badge></TableCell>
                      <TableCell className="text-right">{t.totalDaysAllowed}</TableCell>
                      <TableCell>{t.isPaid ? 'Yes' : 'No'}</TableCell>
                      <TableCell>{t.carryForward ? `Up to ${t.maxCarryForwardDays} days` : 'No'}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          {canLeaveType('update') && (
                            <Button variant="ghost" size="icon" onClick={() => openEditType(t)}><Edit className="h-3.5 w-3.5" /></Button>
                          )}
                          {canLeaveType('delete') && (
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteType(t)} disabled={deletingTypeId === t.id}>
                              {deletingTypeId === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {leaveTypes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-12">No leave types defined yet.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Balances */}
        <TabsContent value="balances" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-end gap-4 flex-wrap">
                <div className="space-y-1.5 min-w-[240px]">
                  <Label>Employee</Label>
                  <Select value={balanceEmployeeId} onValueChange={setBalanceEmployeeId}>
                    <SelectTrigger><SelectValue placeholder="Select an employee" /></SelectTrigger>
                    <SelectContent>
                      {employees.map(e => <SelectItem key={e.id} value={e.id}>{employeeLabel(e)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Year</Label>
                  <Select value={balanceYear} onValueChange={setBalanceYear}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={loadBalances} disabled={!balanceEmployeeId || isLoadingBalances}>
                  {isLoadingBalances && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  View Balance
                </Button>
                {canLeaveBalance('allocate') && (
                  <Button variant="outline" onClick={openAllocate} disabled={!balanceEmployeeId}>
                    <Plus className="mr-2 h-4 w-4" /> Allocate Leave
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {balanceError && <Alert variant="destructive"><AlertDescription>{balanceError}</AlertDescription></Alert>}

          <Card>
            <CardContent className="pt-6 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Leave Type</TableHead>
                    <TableHead className="text-right">Allocated</TableHead>
                    <TableHead className="text-right">Used</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {balances.map((b, i) => (
                    <TableRow key={b.leaveTypeId ?? i}>
                      <TableCell className="font-medium">{b.leaveTypeName ?? b.leaveTypeCode ?? '—'}</TableCell>
                      <TableCell className="text-right">{b.allocatedDays}</TableCell>
                      <TableCell className="text-right">{b.usedDays}</TableCell>
                      <TableCell className="text-right">{b.pendingDays ?? '—'}</TableCell>
                      <TableCell className="text-right font-semibold">{b.remainingDays ?? (b.allocatedDays - b.usedDays)}</TableCell>
                    </TableRow>
                  ))}
                  {balances.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                        <Wallet2 className="mx-auto h-10 w-10 text-muted-foreground/50 mb-2" />
                        {balanceEmployeeId ? 'No balance data loaded yet — click "View Balance".' : 'Select an employee to view their leave balance.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Apply for Leave dialog */}
      <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Apply for Leave</DialogTitle>
            <DialogDescription>Submit a new leave application</DialogDescription>
          </DialogHeader>

          {applyError && <Alert variant="destructive"><AlertDescription>{applyError}</AlertDescription></Alert>}

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={applyForm.employeeId} onValueChange={v => setApplyForm(f => ({ ...f, employeeId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select an employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map(e => <SelectItem key={e.id} value={e.id}>{employeeLabel(e)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Leave Type</Label>
              <Select value={applyForm.leaveTypeId} onValueChange={v => setApplyForm(f => ({ ...f, leaveTypeId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select a leave type" /></SelectTrigger>
                <SelectContent>
                  {leaveTypes.map(t => <SelectItem key={t.id} value={t.id}>{t.name} ({t.code})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={applyForm.startDate} onChange={e => setApplyForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={applyForm.endDate} onChange={e => setApplyForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea rows={3} value={applyForm.reason} onChange={e => setApplyForm(f => ({ ...f, reason: e.target.value }))} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApplyDialog(false)} disabled={isApplying}>Cancel</Button>
            <Button
              onClick={handleApply}
              disabled={isApplying || !applyForm.employeeId || !applyForm.leaveTypeId || !applyForm.startDate || !applyForm.endDate}
            >
              {isApplying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave Type create/edit dialog */}
      <Dialog open={typeForm !== null} onOpenChange={o => { if (!o) setTypeForm(null) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{typeForm?.id ? 'Edit Leave Type' : 'Add Leave Type'}</DialogTitle>
            <DialogDescription>Define a leave category employees can apply for</DialogDescription>
          </DialogHeader>

          {typeForm && (
            <>
              {typeSaveError && <Alert variant="destructive"><AlertDescription>{typeSaveError}</AlertDescription></Alert>}

              <div className="space-y-4 py-2">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input value={typeForm.name} onChange={e => setTypeForm(f => f && ({ ...f, name: e.target.value }))} placeholder="e.g., Annual Leave" />
                  </div>
                  <div className="space-y-2">
                    <Label>Code</Label>
                    <Input value={typeForm.code} onChange={e => setTypeForm(f => f && ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="e.g., ANNUAL" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Textarea rows={2} value={typeForm.description} onChange={e => setTypeForm(f => f && ({ ...f, description: e.target.value }))} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Total Days Allowed</Label>
                    <Input type="number" value={typeForm.totalDaysAllowed} onChange={e => setTypeForm(f => f && ({ ...f, totalDaysAllowed: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Carry Forward Days</Label>
                    <Input
                      type="number"
                      value={typeForm.maxCarryForwardDays}
                      onChange={e => setTypeForm(f => f && ({ ...f, maxCarryForwardDays: e.target.value }))}
                      disabled={!typeForm.carryForward}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <Label>Paid Leave</Label>
                  <Switch checked={typeForm.isPaid} onCheckedChange={checked => setTypeForm(f => f && ({ ...f, isPaid: checked }))} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <Label>Allow Carry Forward</Label>
                  <Switch checked={typeForm.carryForward} onCheckedChange={checked => setTypeForm(f => f && ({ ...f, carryForward: checked }))} />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setTypeForm(null)} disabled={isSavingType}>Cancel</Button>
                <Button onClick={handleSaveType} disabled={isSavingType || !typeForm.name || !typeForm.code || !typeForm.totalDaysAllowed}>
                  {isSavingType && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {typeForm.id ? 'Save Changes' : 'Create Leave Type'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Allocate Leave dialog */}
      <Dialog open={showAllocateDialog} onOpenChange={setShowAllocateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Allocate Leave</DialogTitle>
            <DialogDescription>Assign a leave type's days to {employees.find(e => e.id === balanceEmployeeId) ? employeeLabel(employees.find(e => e.id === balanceEmployeeId)!) : 'this employee'} for a year</DialogDescription>
          </DialogHeader>

          {allocateError && <Alert variant="destructive"><AlertDescription>{allocateError}</AlertDescription></Alert>}

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Leave Type</Label>
              <Select value={allocateForm.leaveTypeId} onValueChange={v => setAllocateForm(f => ({ ...f, leaveTypeId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select a leave type" /></SelectTrigger>
                <SelectContent>
                  {leaveTypes.map(t => <SelectItem key={t.id} value={t.id}>{t.name} ({t.code})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Year</Label>
                <Select value={allocateForm.year} onValueChange={v => setAllocateForm(f => ({ ...f, year: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Days</Label>
                <Input type="number" value={allocateForm.days} onChange={e => setAllocateForm(f => ({ ...f, days: e.target.value }))} placeholder="e.g., 21" />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAllocateDialog(false)} disabled={isAllocating}>Cancel</Button>
            <Button onClick={handleAllocate} disabled={isAllocating || !allocateForm.leaveTypeId || !allocateForm.days}>
              {isAllocating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Allocate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
