'use client'

import { money } from '@/lib/currency'
import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Combobox } from '@/components/ui/combobox'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { PageHeader } from '@/components/layout/page-header'
import { AccessDenied } from '@/components/ui/access-denied'
import { useAuth } from '@/contexts/auth-context'
import { financeService } from '@/lib/services/finance'
import type { Budget, GlAccount, BudgetChangeRequest } from '@/lib/services/finance'
import { Plus, Search, Loader2, Wallet, MoreHorizontal, Edit, GitPullRequestArrow, Send, Check, X, PlayCircle } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SkeletonTableRows } from '@/components/ui/page-skeleton'
import { numberError, requiredError, hasNoErrors } from '@/lib/validation'

function fmt(val: string | number | undefined): string {
  const n = parseFloat(String(val ?? 0))
  return isNaN(n) ? '0.00' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function BudgetsPage() {
  const { can } = useAuth()
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [glAccounts, setGlAccounts] = useState<GlAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createError, setCreateError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [newBudget, setNewBudget] = useState({
    name: '',
    glAccountId: '',
    allocatedAmount: '',
    startDate: '',
    endDate: '',
  })

  // Edit (name/status only — allocation changes go through change requests)
  const [editBudget, setEditBudget] = useState<Budget | null>(null)
  const [editName, setEditName] = useState('')
  const [editStatus, setEditStatus] = useState('ACTIVE')
  const [editError, setEditError] = useState('')
  const [isEditSaving, setIsEditSaving] = useState(false)

  // Change requests
  const [changeRequests, setChangeRequests] = useState<BudgetChangeRequest[]>([])
  const [isCrLoading, setIsCrLoading] = useState(true)
  const [crError, setCrError] = useState('')
  const [crActionId, setCrActionId] = useState<string | null>(null)
  const [crSuccess, setCrSuccess] = useState('')
  const [requestBudget, setRequestBudget] = useState<Budget | null>(null)
  const [requestToAllocated, setRequestToAllocated] = useState('')
  const [requestReason, setRequestReason] = useState('')
  const [requestError, setRequestError] = useState('')
  const [isRequestSaving, setIsRequestSaving] = useState(false)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const [buds, accts] = await Promise.all([
        financeService.getBudgets(),
        financeService.getGLAccounts({ type: 'EXPENSE' }),
      ])
      setBudgets(buds)
      setGlAccounts(accts)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load data. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadChangeRequests = useCallback(async () => {
    setIsCrLoading(true)
    setCrError('')
    try {
      setChangeRequests(await financeService.getBudgetChangeRequests())
    } catch (err) {
      setCrError(err instanceof Error ? err.message : 'Failed to load change requests.')
    } finally {
      setIsCrLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => { loadChangeRequests() }, [loadChangeRequests])

  const openEdit = (b: Budget) => {
    setEditBudget(b)
    setEditName(b.name)
    setEditStatus(b.status ?? 'ACTIVE')
    setEditError('')
  }

  const handleUpdateBudget = async () => {
    if (!editBudget || !editName.trim()) return
    if (editStatus === 'CLOSED' && editBudget.status !== 'CLOSED' &&
        !confirm(`Close "${editBudget.name}"? Closing a budget is permanent — it cannot be reopened.`)) return
    setIsEditSaving(true)
    setEditError('')
    const result = await financeService.updateBudget(editBudget.id, { name: editName.trim(), status: editStatus })
    setIsEditSaving(false)
    if (result.error || !result.budget) { setEditError(result.error || 'Failed to update budget'); return }
    setEditBudget(null)
    loadData()
  }

  const openRequestChange = (b: Budget) => {
    setRequestBudget(b)
    setRequestToAllocated(b.allocated ?? '')
    setRequestReason('')
    setRequestError('')
  }

  const handleCreateChangeRequest = async () => {
    if (!requestBudget || !requestToAllocated || !requestReason.trim()) return
    setIsRequestSaving(true)
    setRequestError('')
    const result = await financeService.createBudgetChangeRequest({
      budgetId: requestBudget.id,
      toAllocated: requestToAllocated,
      reason: requestReason.trim(),
    })
    setIsRequestSaving(false)
    if (result.error || !result.request) { setRequestError(result.error || 'Failed to create change request'); return }
    setRequestBudget(null)
    loadChangeRequests()
  }

  const handleCrAction = async (cr: BudgetChangeRequest, action: 'submit' | 'approve' | 'reject' | 'apply') => {
    let reason: string | undefined
    if (action === 'reject') {
      const input = prompt('Reason for rejecting this change request (min 5 characters):')
      if (input === null) return
      reason = input.trim()
      if (reason.length < 5) { setCrError('A rejection reason of at least 5 characters is required.'); return }
    } else if (action === 'apply') {
      if (!confirm('Apply this change request? The budget allocation will be updated.')) return
    }
    setCrActionId(cr.id)
    setCrError('')
    setCrSuccess('')
    const result = await financeService.actOnBudgetChangeRequest(cr.id, action, reason)
    setCrActionId(null)
    if (!result.success) { setCrError(result.error || `Failed to ${action} change request`); return }
    setCrSuccess(`Change request ${action === 'submit' ? 'submitted' : action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'applied'}.`)
    setTimeout(() => setCrSuccess(''), 4000)
    loadChangeRequests()
    if (action === 'apply') loadData()
  }

  const validate = (): boolean => {
    const errors: Record<string, string> = {}
    const nameErr = requiredError(newBudget.name, 'Budget name')
    if (nameErr) errors.name = nameErr
    const glAccountErr = requiredError(newBudget.glAccountId, 'GL account')
    if (glAccountErr) errors.glAccountId = glAccountErr
    const amountErr = numberError(newBudget.allocatedAmount, { required: true, min: 0, label: 'Allocated amount' })
    if (amountErr) errors.allocatedAmount = amountErr
    const startDateErr = requiredError(newBudget.startDate, 'Start date')
    if (startDateErr) errors.startDate = startDateErr
    const endDateErr = requiredError(newBudget.endDate, 'End date')
    if (endDateErr) errors.endDate = endDateErr
    setFieldErrors(errors)
    return hasNoErrors(errors)
  }

  const handleCreate = async () => {
    if (!newBudget.name || !newBudget.glAccountId || !newBudget.allocatedAmount || !newBudget.startDate || !newBudget.endDate) return
    if (!validate()) return
    setIsSubmitting(true)
    setCreateError('')
    const result = await financeService.createBudget({
      name: newBudget.name,
      glAccountId: newBudget.glAccountId,
      allocatedAmount: newBudget.allocatedAmount,
      startDate: newBudget.startDate,
      endDate: newBudget.endDate,
    })
    if (result.error || !result.budget) {
      setCreateError(result.error || 'Failed to create budget')
      setIsSubmitting(false)
      return
    }
    setNewBudget({ name: '', glAccountId: '', allocatedAmount: '', startDate: '', endDate: '' })
    setIsCreateOpen(false)
    setIsSubmitting(false)
    loadData()
  }

  if (!can('finance.budget.read')) return <AccessDenied />

  const filtered = budgets.filter(b => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return b.name.toLowerCase().includes(q) ||
      b.categoryName?.toLowerCase().includes(q) ||
      b.categoryCode?.toLowerCase().includes(q)
  })

  const totalAllocated = budgets.reduce((s, b) => s + parseFloat(b.allocated || '0'), 0)
  const totalSpent = budgets.reduce((s, b) => s + parseFloat(b.spent || '0'), 0)
  const totalRemaining = budgets.reduce((s, b) => s + parseFloat(b.remaining || '0'), 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budget Management"
        description="Create and monitor budgets by GL account"
        action={
          can('finance.budget.create') ? (
            <Button onClick={() => { setCreateError(''); setFieldErrors({}); setIsCreateOpen(true) }}>
              <Plus className="h-4 w-4 mr-2" /> New Budget
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center justify-between pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Total Budgets</p>
              <p className="text-2xl font-bold">{budgets.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-primary/10"><Wallet className="h-6 w-6 text-primary" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Total Allocated</p>
              <p className="text-2xl font-bold">{money(totalAllocated)}</p>
            </div>
            <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30"><Wallet className="h-6 w-6 text-green-600" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Total Spent</p>
              <p className="text-2xl font-bold">{money(totalSpent)}</p>
            </div>
            <div className="p-3 rounded-lg bg-orange-100 dark:bg-orange-900/30"><Wallet className="h-6 w-6 text-orange-600" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Total Remaining</p>
              <p className="text-2xl font-bold">{money(totalRemaining)}</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30"><Wallet className="h-6 w-6 text-blue-600" /></div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="budgets">
        <TabsList>
          <TabsTrigger value="budgets">Budgets ({budgets.length})</TabsTrigger>
          <TabsTrigger value="change-requests">Change Requests ({changeRequests.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="budgets" className="space-y-6 mt-4">
      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name or expense account…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Budgets ({filtered.length})</CardTitle>
          <CardDescription>{filtered.length} budgets found</CardDescription>
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
                <TableHead>Name</TableHead>
                <TableHead>Expense Account</TableHead>
                <TableHead className="text-right">Allocated</TableHead>
                <TableHead className="text-right">Spent</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead className="w-40">Utilization</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <SkeletonTableRows rows={5} cols={9} />
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No budgets found</TableCell>
                </TableRow>
              ) : (
                filtered.map(b => {
                  const allocated = parseFloat(b.allocated || '0')
                  const spent = parseFloat(b.spent || '0')
                  const pct = allocated > 0 ? Math.min(100, (spent / allocated) * 100) : 0
                  return (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {b.categoryCode ? `${b.categoryCode} — ${b.categoryName}` : (b.categoryName ?? '—')}
                      </TableCell>
                      <TableCell className="text-right font-semibold">{money(b.allocated)}</TableCell>
                      <TableCell className="text-right text-orange-600">{money(b.spent)}</TableCell>
                      <TableCell className={`text-right font-medium ${parseFloat(b.remaining) < 0 ? 'text-red-600' : 'text-green-600'}`}>{money(b.remaining)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-orange-500' : 'bg-green-500'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-9 text-right">{Math.round(pct)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {b.startDate?.slice(0, 10)} → {b.endDate?.slice(0, 10)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={b.status === 'ACTIVE' ? 'default' : 'secondary'}>{b.status ?? '—'}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {can('finance.budget.update') && (
                              <DropdownMenuItem onClick={() => openEdit(b)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit Name / Status
                              </DropdownMenuItem>
                            )}
                            {can('finance.budget.create') && b.status === 'ACTIVE' && (
                              <DropdownMenuItem onClick={() => openRequestChange(b)}>
                                <GitPullRequestArrow className="mr-2 h-4 w-4" /> Request Allocation Change
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="change-requests" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Budget Change Requests</CardTitle>
              <CardDescription>Reallocation requests: draft → submit → approve/reject → apply</CardDescription>
            </CardHeader>
            <CardContent>
              {crError && <Alert variant="destructive" className="mb-4"><AlertDescription>{crError}</AlertDescription></Alert>}
              {crSuccess && <Alert className="mb-4"><AlertDescription>{crSuccess}</AlertDescription></Alert>}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Budget</TableHead>
                    <TableHead className="text-right">From</TableHead>
                    <TableHead className="text-right">To</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isCrLoading ? (
                    <SkeletonTableRows rows={5} cols={7} />
                  ) : changeRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No change requests yet. Use "Request Allocation Change" on a budget to create one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    changeRequests.map(cr => {
                      const status = String(cr.status ?? '').toUpperCase()
                      const busy = crActionId === cr.id
                      const budgetName = cr.budgetName ?? budgets.find(b => b.id === cr.budgetId)?.name ?? cr.budgetId
                      return (
                        <TableRow key={cr.id}>
                          <TableCell className="font-medium">{budgetName}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{cr.fromAllocated ? money(cr.fromAllocated) : '—'}</TableCell>
                          <TableCell className="text-right font-semibold">{money(cr.toAllocated)}</TableCell>
                          <TableCell className="max-w-[240px] truncate text-muted-foreground" title={cr.reason}>{cr.reason ?? '—'}</TableCell>
                          <TableCell>
                            <Badge variant={
                              status === 'APPLIED' ? 'default'
                              : status === 'APPROVED' ? 'default'
                              : status === 'REJECTED' ? 'destructive'
                              : 'secondary'
                            }>{status || '—'}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{typeof cr.createdAt === 'string' ? cr.createdAt.slice(0, 10) : '—'}</TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mt-2" />}
                              {!busy && status === 'DRAFT' && (
                                <Button variant="outline" size="sm" onClick={() => handleCrAction(cr, 'submit')}>
                                  <Send className="h-3.5 w-3.5 mr-1.5" /> Submit
                                </Button>
                              )}
                              {!busy && (status === 'SUBMITTED' || status === 'PENDING' || status === 'PENDING_APPROVAL') && (
                                <>
                                  <Button variant="outline" size="sm" onClick={() => handleCrAction(cr, 'approve')}>
                                    <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-600" /> Approve
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => handleCrAction(cr, 'reject')}>
                                    <X className="h-3.5 w-3.5 mr-1.5 text-destructive" /> Reject
                                  </Button>
                                </>
                              )}
                              {!busy && status === 'APPROVED' && (
                                <Button size="sm" onClick={() => handleCrAction(cr, 'apply')}>
                                  <PlayCircle className="h-3.5 w-3.5 mr-1.5" /> Apply
                                </Button>
                              )}
                              {!busy && !['DRAFT', 'SUBMITTED', 'PENDING', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'APPLIED'].includes(status) && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleCrAction(cr, 'submit')}><Send className="mr-2 h-4 w-4" /> Submit</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleCrAction(cr, 'approve')}><Check className="mr-2 h-4 w-4" /> Approve</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleCrAction(cr, 'reject')}><X className="mr-2 h-4 w-4" /> Reject</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleCrAction(cr, 'apply')}><PlayCircle className="mr-2 h-4 w-4" /> Apply</DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit budget (name/status only) */}
      <Dialog open={!!editBudget} onOpenChange={open => !open && setEditBudget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Budget</DialogTitle>
            <DialogDescription>
              Only the name and status can be changed here. To change the allocated amount, use "Request Allocation Change".
            </DialogDescription>
          </DialogHeader>
          {editError && <Alert variant="destructive"><AlertDescription>{editError}</AlertDescription></Alert>}
          <div className="space-y-4 py-2">
            <div>
              <Label>Name</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
              {editStatus === 'CLOSED' && editBudget?.status !== 'CLOSED' && (
                <p className="text-xs text-destructive mt-1">Closing a budget is permanent — it cannot be reopened.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditBudget(null)} disabled={isEditSaving}>Cancel</Button>
            <Button onClick={handleUpdateBudget} disabled={isEditSaving || !editName.trim()}>
              {isEditSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request allocation change */}
      <Dialog open={!!requestBudget} onOpenChange={open => !open && setRequestBudget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Allocation Change</DialogTitle>
            <DialogDescription>
              {requestBudget && `${requestBudget.name} — currently allocated ${money(requestBudget.allocated)}`}
            </DialogDescription>
          </DialogHeader>
          {requestError && <Alert variant="destructive"><AlertDescription>{requestError}</AlertDescription></Alert>}
          <div className="space-y-4 py-2">
            <div>
              <Label>New Allocated Amount</Label>
              <Input
                type="number"
                min={0}
                value={requestToAllocated}
                onChange={e => setRequestToAllocated(e.target.value)}
                placeholder="150000.00"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Reason</Label>
              <Textarea
                rows={3}
                value={requestReason}
                onChange={e => setRequestReason(e.target.value)}
                placeholder="e.g. Electricity bills increased unexpectedly"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestBudget(null)} disabled={isRequestSaving}>Cancel</Button>
            <Button onClick={handleCreateChangeRequest} disabled={isRequestSaving || !requestToAllocated || !requestReason.trim()}>
              {isRequestSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Create Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Budget</DialogTitle>
            <DialogDescription>Set up a new budget allocation linked to a GL account</DialogDescription>
          </DialogHeader>
          {createError && <Alert variant="destructive"><AlertDescription>{createError}</AlertDescription></Alert>}
          <div className="space-y-4 py-2">
            <div>
              <Label>Budget Name</Label>
              <Input
                value={newBudget.name}
                onChange={e => setNewBudget(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g., Salaries 2025"
                className={`mt-1 ${fieldErrors.name ? 'border-destructive' : ''}`}
              />
              {fieldErrors.name && <p className="text-xs text-destructive mt-1">{fieldErrors.name}</p>}
            </div>
            <div>
              <Label>GL Account (Expense)</Label>
              <Combobox
                value={newBudget.glAccountId}
                onValueChange={v => setNewBudget(f => ({ ...f, glAccountId: v }))}
                options={glAccounts.map(a => ({ value: a.id, label: `${a.code} — ${a.name}`, keywords: a.code }))}
                placeholder="Select expense account"
                searchPlaceholder="Search accounts…"
                emptyText="No accounts found."
                className={`mt-1 ${fieldErrors.glAccountId ? 'border-destructive' : ''}`}
              />
              {fieldErrors.glAccountId && <p className="text-xs text-destructive mt-1">{fieldErrors.glAccountId}</p>}
            </div>
            <div>
              <Label>Allocated Amount</Label>
              <Input
                type="number"
                min={0}
                value={newBudget.allocatedAmount}
                onChange={e => setNewBudget(f => ({ ...f, allocatedAmount: e.target.value }))}
                placeholder="0.00"
                className={`mt-1 ${fieldErrors.allocatedAmount ? 'border-destructive' : ''}`}
              />
              {fieldErrors.allocatedAmount && <p className="text-xs text-destructive mt-1">{fieldErrors.allocatedAmount}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={newBudget.startDate}
                  onChange={e => setNewBudget(f => ({ ...f, startDate: e.target.value }))}
                  className={`mt-1 ${fieldErrors.startDate ? 'border-destructive' : ''}`}
                />
                {fieldErrors.startDate && <p className="text-xs text-destructive mt-1">{fieldErrors.startDate}</p>}
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={newBudget.endDate}
                  onChange={e => setNewBudget(f => ({ ...f, endDate: e.target.value }))}
                  className={`mt-1 ${fieldErrors.endDate ? 'border-destructive' : ''}`}
                />
                {fieldErrors.endDate && <p className="text-xs text-destructive mt-1">{fieldErrors.endDate}</p>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isSubmitting || !newBudget.name || !newBudget.glAccountId || !newBudget.allocatedAmount || !newBudget.startDate || !newBudget.endDate}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Create Budget
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
