'use client'

import { money } from '@/lib/currency'
import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/layout/page-header'
import { AccessDenied } from '@/components/ui/access-denied'
import { useAuth } from '@/contexts/auth-context'
import { financeService } from '@/lib/services/finance'
import type { FinanceTransaction, TransactionStatus, GlAccount } from '@/lib/services/finance'
import {
  Plus, Search, CheckCircle, Clock, XCircle, Loader2, DollarSign, RefreshCw,
} from 'lucide-react'
import { SkeletonTableRows } from '@/components/ui/page-skeleton'

function fmt(val: string | number | undefined): string {
  const n = parseFloat(String(val ?? 0))
  return isNaN(n) ? '0.00' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function statusBadge(status: TransactionStatus) {
  switch (status) {
    case 'POSTED': return <Badge className="bg-green-100 text-green-800">Posted</Badge>
    case 'PENDING_APPROVAL': return <Badge className="bg-amber-100 text-amber-800">Pending</Badge>
    case 'REJECTED': return <Badge className="bg-red-100 text-red-800">Rejected</Badge>
    case 'REVERSED': return <Badge className="bg-gray-100 text-gray-800">Reversed</Badge>
    default: return <Badge variant="outline">{status}</Badge>
  }
}

export default function ExpensesPage() {
  const { can } = useAuth()
  const [expenses, setExpenses] = useState<FinanceTransaction[]>([])
  const [glAccounts, setGlAccounts] = useState<GlAccount[]>([])
  const [assetAccounts, setAssetAccounts] = useState<GlAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createError, setCreateError] = useState('')
  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    reference: '',
    categoryAccountId: '',
    paymentAccountId: '',
    notes: '',
  })

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const [txns, expAccts, assetAccts] = await Promise.all([
        financeService.getTransactions({ type: 'EXPENSE', limit: 100 }),
        financeService.getGLAccounts({ type: 'EXPENSE' }),
        financeService.getGLAccounts({ type: 'ASSET' }),
      ])
      setExpenses(txns.data)
      setGlAccounts(expAccts)
      setAssetAccounts(assetAccts)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load data. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  if (!can('finance.transaction.read')) return <AccessDenied />

  const handleCreate = async () => {
    if (!newExpense.description || !newExpense.amount) return
    setIsSubmitting(true)
    setCreateError('')
    const result = await financeService.createTransaction({
      type: 'EXPENSE',
      amount: newExpense.amount,
      description: newExpense.description,
      date: newExpense.date,
      reference: newExpense.reference || undefined,
      categoryAccountId: newExpense.categoryAccountId && newExpense.categoryAccountId !== 'none' ? newExpense.categoryAccountId : undefined,
      paymentAccountId: newExpense.paymentAccountId && newExpense.paymentAccountId !== 'none' ? newExpense.paymentAccountId : undefined,
    })
    if (result.error || !result.transaction) {
      setCreateError(result.error || 'Failed to create expense')
      setIsSubmitting(false)
      return
    }
    setNewExpense({ description: '', amount: '', date: new Date().toISOString().split('T')[0], reference: '', categoryAccountId: '', paymentAccountId: '', notes: '' })
    setIsCreateOpen(false)
    setIsSubmitting(false)
    loadData()
  }

  const handleApprove = async (exp: FinanceTransaction) => {
    await financeService.approveExpense(exp.id)
    loadData()
  }

  const handleReject = async (exp: FinanceTransaction) => {
    const reason = prompt('Reason for rejection:')
    if (!reason) return
    await financeService.rejectExpense(exp.id, reason)
    loadData()
  }

  const filtered = expenses.filter(e => {
    const q = searchQuery.toLowerCase()
    const matchSearch = !q || e.description.toLowerCase().includes(q) || e.reference.toLowerCase().includes(q)
    const matchStatus = filterStatus === 'all' || e.status === filterStatus
    return matchSearch && matchStatus
  })

  const totalAmount = expenses.reduce((s, e) => s + parseFloat(e.amount), 0)
  const pendingCount = expenses.filter(e => e.status === 'PENDING_APPROVAL').length
  const postedCount = expenses.filter(e => e.status === 'POSTED').length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expense Management"
        description="Create and track expense transactions"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadData} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            {can('finance.transaction.create') && (
              <Button onClick={() => { setCreateError(''); setIsCreateOpen(true) }}>
                <Plus className="h-4 w-4 mr-2" /> New Expense
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center justify-between pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Total Expenses</p>
              <p className="text-2xl font-bold">{money(totalAmount)}</p>
            </div>
            <div className="p-3 rounded-lg bg-primary/10"><DollarSign className="h-6 w-6 text-primary" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Pending Approval</p>
              <p className="text-2xl font-bold">{pendingCount}</p>
            </div>
            <div className="p-3 rounded-lg bg-amber-100"><Clock className="h-6 w-6 text-amber-600" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Posted</p>
              <p className="text-2xl font-bold">{postedCount}</p>
            </div>
            <div className="p-3 rounded-lg bg-green-100"><CheckCircle className="h-6 w-6 text-green-600" /></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by description or reference…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING_APPROVAL">Pending</SelectItem>
                <SelectItem value="POSTED">Posted</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="REVERSED">Reversed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Expenses ({filtered.length})</CardTitle>
          <CardDescription>{filtered.length} expenses found</CardDescription>
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
                  <TableHead>Reference</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <SkeletonTableRows rows={5} cols={7} />
                ) : (
                  <>
                {filtered.map(exp => (
                  <TableRow key={exp.id}>
                    <TableCell className="font-mono text-sm">{exp.reference}</TableCell>
                    <TableCell className="font-medium">{exp.description}</TableCell>
                    <TableCell>{exp.categoryAccount?.name ?? '—'}</TableCell>
                    <TableCell className="text-right font-semibold">{money(exp.amount)}</TableCell>
                    <TableCell className="text-muted-foreground">{exp.date}</TableCell>
                    <TableCell>{statusBadge(exp.status)}</TableCell>
                    <TableCell>
                      {can('finance.transaction.approve') && exp.status === 'PENDING_APPROVAL' && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="text-green-600 h-7 px-2" onClick={() => handleApprove(exp)}>
                            <CheckCircle className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600 h-7 px-2" onClick={() => handleReject(exp)}>
                            <XCircle className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No expenses found</TableCell>
                  </TableRow>
                )}
                  </>
                )}
              </TableBody>
            </Table>
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Expense</DialogTitle>
            <DialogDescription>Submit an expense transaction for posting or approval</DialogDescription>
          </DialogHeader>
          {createError && <Alert variant="destructive"><AlertDescription>{createError}</AlertDescription></Alert>}
          <div className="space-y-4 py-2">
            <div>
              <Label>Description</Label>
              <Input value={newExpense.description} onChange={e => setNewExpense(f => ({ ...f, description: e.target.value }))} placeholder="What is this expense for?" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Amount</Label>
                <Input type="number" value={newExpense.amount} onChange={e => setNewExpense(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" className="mt-1" />
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={newExpense.date} onChange={e => setNewExpense(f => ({ ...f, date: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Reference No. (optional)</Label>
              <Input value={newExpense.reference} onChange={e => setNewExpense(f => ({ ...f, reference: e.target.value }))} placeholder="e.g. INV-1001" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category Account (optional)</Label>
                <Select value={newExpense.categoryAccountId} onValueChange={v => setNewExpense(f => ({ ...f, categoryAccountId: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Expense account" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {glAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Payment Account (optional)</Label>
                <Select value={newExpense.paymentAccountId} onValueChange={v => setNewExpense(f => ({ ...f, paymentAccountId: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Cash / bank account" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {assetAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isSubmitting || !newExpense.description || !newExpense.amount}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Submit Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
