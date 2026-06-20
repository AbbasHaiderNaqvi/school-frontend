'use client'

import { money } from '@/lib/currency'
import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { financeService } from '@/lib/services/finance'
import type { FinanceTransaction, TransactionType, TransactionStatus, GlAccount } from '@/lib/services/finance'
import { Search, TrendingDown, TrendingUp, DollarSign, AlertCircle, Loader2, Plus, RefreshCw } from 'lucide-react'

function fmt(val: string | number | undefined): string {
  const n = parseFloat(String(val ?? 0))
  return isNaN(n) ? '0.00' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const TYPE_COLORS: Record<TransactionType, string> = {
  INCOME: 'bg-green-100 text-green-800',
  EXPENSE: 'bg-red-100 text-red-800',
  TRANSFER: 'bg-blue-100 text-blue-800',
}

const STATUS_COLORS: Record<TransactionStatus, string> = {
  POSTED: 'bg-green-50 text-green-700 border-green-200',
  PENDING_APPROVAL: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
  REVERSED: 'bg-gray-50 text-gray-700 border-gray-200',
}

const EMPTY_FORM = {
  type: 'EXPENSE' as TransactionType,
  amount: '',
  date: new Date().toISOString().split('T')[0],
  description: '',
  reference: '',
  categoryAccountId: '',
  paymentAccountId: '',
  fromAccountId: '',
  toAccountId: '',
  transferMode: 'VIA_MASTER' as 'VIA_MASTER' | 'DIRECT',
}

export default function AllTransactionsPage() {
  const { can } = useAuth()
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  // GL accounts for the create dialog
  const [allAccounts, setAllAccounts] = useState<GlAccount[]>([])

  // Create dialog
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createError, setCreateError] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const result = await financeService.getTransactions({
        limit: 200,
        type: filterType !== 'all' ? (filterType as TransactionType) : undefined,
        status: filterStatus !== 'all' ? (filterStatus as TransactionStatus) : undefined,
      })
      setTransactions(result.data)
      setTotal(result.total)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load data. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [filterType, filterStatus])

  useEffect(() => { loadData() }, [loadData])

  const openCreate = async () => {
    setForm(EMPTY_FORM)
    setCreateError('')
    setIsCreateOpen(true)
    if (allAccounts.length === 0) {
      try {
        const accts = await financeService.getGLAccounts()
        setAllAccounts(accts)
      } catch {
        // non-fatal — dropdowns will be empty
      }
    }
  }

  const handleCreate = async () => {
    if (!form.description || !form.amount || !form.date) return
    setIsSubmitting(true)
    setCreateError('')

    const id = (v: string) => (v && v !== 'none' ? v : undefined)

    const payload =
      form.type === 'TRANSFER'
        ? {
            type: form.type,
            amount: form.amount,
            description: form.description,
            date: form.date,
            reference: form.reference || undefined,
            fromAccountId: id(form.fromAccountId),
            toAccountId: id(form.toAccountId),
            transferMode: form.transferMode,
          }
        : {
            type: form.type,
            amount: form.amount,
            description: form.description,
            date: form.date,
            reference: form.reference || undefined,
            categoryAccountId: id(form.categoryAccountId),
            paymentAccountId: id(form.paymentAccountId),
          }

    const result = await financeService.createTransaction(payload)
    if (result.error || !result.transaction) {
      setCreateError(result.error || 'Failed to create transaction')
      setIsSubmitting(false)
      return
    }
    setIsCreateOpen(false)
    setIsSubmitting(false)
    loadData()
  }

  // Derived account lists from allAccounts
  const incomeAccounts  = allAccounts.filter(a => a.type === 'INCOME')
  const expenseAccounts = allAccounts.filter(a => a.type === 'EXPENSE')
  const assetAccounts   = allAccounts.filter(a => a.type === 'ASSET')
  const categoryAccounts = form.type === 'INCOME' ? incomeAccounts : expenseAccounts

  const filtered = transactions.filter(t => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return t.description.toLowerCase().includes(q) ||
      t.reference.toLowerCase().includes(q) ||
      (t.categoryAccount?.name ?? '').toLowerCase().includes(q)
  })

  const totalIncome  = transactions.filter(t => t.type === 'INCOME'  && t.status === 'POSTED').reduce((s, t) => s + parseFloat(t.amount), 0)
  const totalExpense = transactions.filter(t => t.type === 'EXPENSE' && t.status === 'POSTED').reduce((s, t) => s + parseFloat(t.amount), 0)
  const pendingCount = transactions.filter(t => t.status === 'PENDING_APPROVAL').length
  const net = totalIncome - totalExpense

  return (
    <div className="space-y-6">
      <PageHeader
        title="All Transactions"
        description="Complete financial transaction history"
        action={
          can('finance.transaction.create') && (
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={loadData} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" /> New Transaction
              </Button>
            </div>
          )
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Income</p>
                <p className="text-xl font-bold text-green-600">{money(totalIncome)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingDown className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Expense</p>
                <p className="text-xl font-bold text-red-600">{money(totalExpense)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <DollarSign className={`h-5 w-5 ${net >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              <div>
                <p className="text-sm text-muted-foreground">Net</p>
                <p className={`text-xl font-bold ${net >= 0 ? 'text-green-600' : 'text-red-600'}`}>{money(net)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-xl font-bold text-yellow-600">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transactions ({total})</CardTitle>
          <CardDescription>All financial transactions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadError && (
            <Alert variant="destructive">
              <AlertDescription>{loadError}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search description, reference…" className="pl-10" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="INCOME">Income</SelectItem>
                <SelectItem value="EXPENSE">Expense</SelectItem>
                <SelectItem value="TRANSFER">Transfer</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="POSTED">Posted</SelectItem>
                <SelectItem value="PENDING_APPROVAL">Pending</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="REVERSED">Reversed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No transactions found</TableCell>
                  </TableRow>
                ) : (
                  filtered.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="text-sm">{t.date}</TableCell>
                      <TableCell><Badge className={TYPE_COLORS[t.type]}>{t.type}</Badge></TableCell>
                      <TableCell className="font-medium">{t.description}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {t.categoryAccount?.name ?? t.fromAccount?.name ?? '—'}
                        {t.toAccount && <span className="text-xs"> → {t.toAccount.name}</span>}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        <span className={t.type === 'INCOME' ? 'text-green-600' : t.type === 'EXPENSE' ? 'text-red-600' : 'text-blue-600'}>
                          {t.type === 'INCOME' ? '+' : t.type === 'EXPENSE' ? '-' : ''}{money(t.amount)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_COLORS[t.status]}>{t.status.replace('_', ' ')}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono">{t.reference}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
          <p className="text-xs text-muted-foreground">Showing {filtered.length} of {transactions.length} transactions</p>
        </CardContent>
      </Card>

      {/* Create Transaction Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Transaction</DialogTitle>
            <DialogDescription>Record a financial transaction</DialogDescription>
          </DialogHeader>

          {createError && <Alert variant="destructive"><AlertDescription>{createError}</AlertDescription></Alert>}

          <div className="space-y-4 py-1">
            {/* Type */}
            <div>
              <Label>Transaction Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as TransactionType, categoryAccountId: '', paymentAccountId: '', fromAccountId: '', toAccountId: '' }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INCOME">Income</SelectItem>
                  <SelectItem value="EXPENSE">Expense</SelectItem>
                  <SelectItem value="TRANSFER">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div>
              <Label>Description</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Transaction description" className="mt-1" />
            </div>

            {/* Amount + Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Amount</Label>
                <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" className="mt-1" />
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="mt-1" />
              </div>
            </div>

            {/* Reference */}
            <div>
              <Label>Reference No. (optional)</Label>
              <Input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="e.g. INV-1001" className="mt-1" />
            </div>

            {/* INCOME / EXPENSE specific fields */}
            {form.type !== 'TRANSFER' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category Account (optional)</Label>
                  <Select value={form.categoryAccountId} onValueChange={v => setForm(f => ({ ...f, categoryAccountId: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select account" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {categoryAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Payment Account (optional)</Label>
                  <Select value={form.paymentAccountId} onValueChange={v => setForm(f => ({ ...f, paymentAccountId: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Cash / bank" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {assetAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* TRANSFER specific fields */}
            {form.type === 'TRANSFER' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>From Account</Label>
                    <Select value={form.fromAccountId} onValueChange={v => setForm(f => ({ ...f, fromAccountId: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Source account" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {allAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>To Account</Label>
                    <Select value={form.toAccountId} onValueChange={v => setForm(f => ({ ...f, toAccountId: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Destination account" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {allAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Transfer Mode</Label>
                  <Select value={form.transferMode} onValueChange={v => setForm(f => ({ ...f, transferMode: v as 'VIA_MASTER' | 'DIRECT' }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VIA_MASTER">Via Master</SelectItem>
                      <SelectItem value="DIRECT">Direct</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isSubmitting || !form.description || !form.amount || !form.date}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create Transaction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
