'use client'

import { money } from '@/lib/currency'
import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/auth-context'
import { financeService } from '@/lib/services/finance'
import type { FinanceTransaction, TransactionType, GlAccount } from '@/lib/services/finance'
import { Plus, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Loader2, RefreshCw } from 'lucide-react'
import { SkeletonTableRows } from '@/components/ui/page-skeleton'

function fmt(val: string | number | undefined): string {
  const n = parseFloat(String(val ?? 0))
  return isNaN(n) ? '0.00' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const TYPE_COLORS: Record<TransactionType, string> = {
  INCOME: 'bg-green-100 text-green-800',
  EXPENSE: 'bg-red-100 text-red-800',
  TRANSFER: 'bg-blue-100 text-blue-800',
}

const STATUS_COLORS: Record<string, string> = {
  POSTED: 'bg-green-100 text-green-800',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-800',
  REJECTED: 'bg-red-100 text-red-800',
  REVERSED: 'bg-gray-100 text-gray-800',
}

export default function TransactionFlowPage() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([])
  const [glAccounts, setGlAccounts] = useState<GlAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [formData, setFormData] = useState({
    type: 'INCOME' as TransactionType,
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    categoryAccountId: '',
    paymentAccountId: '',
    fromAccountId: '',
    toAccountId: '',
  })

  const loadData = useCallback(async () => {
    setIsLoading(true)
    const [txns, accts] = await Promise.all([
      financeService.getTransactions({ limit: 100 }),
      financeService.getGLAccounts(),
    ])
    setTransactions(txns.data)
    setGlAccounts(accts)
    setIsLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const openAdd = () => {
    setFormData({
      type: 'INCOME',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      categoryAccountId: '',
      paymentAccountId: '',
      fromAccountId: '',
      toAccountId: '',
    })
    setSubmitError('')
    setShowDialog(true)
  }

  const handleSave = async () => {
    if (!formData.description || !formData.amount) return
    setIsSubmitting(true)
    setSubmitError('')
    const result = await financeService.createTransaction({
      type: formData.type,
      amount: formData.amount,
      description: formData.description,
      date: formData.date,
      categoryAccountId: formData.categoryAccountId || undefined,
      paymentAccountId: formData.paymentAccountId || undefined,
      fromAccountId: formData.type === 'TRANSFER' ? (formData.fromAccountId || undefined) : undefined,
      toAccountId: formData.type === 'TRANSFER' ? (formData.toAccountId || undefined) : undefined,
    })
    if (result.error || !result.transaction) {
      setSubmitError(result.error || 'Failed to create transaction')
      setIsSubmitting(false)
      return
    }
    setShowDialog(false)
    setIsSubmitting(false)
    loadData()
  }

  const totalIncome = transactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + parseFloat(t.amount), 0)
  const totalExpense = transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + parseFloat(t.amount), 0)
  const net = totalIncome - totalExpense

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transaction Flow</h1>
          <p className="text-muted-foreground">Add and manage financial transactions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" /> Add Transaction
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <ArrowDownLeft className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{money(totalIncome)}</p>
            <p className="text-xs text-muted-foreground">{transactions.filter(t => t.type === 'INCOME').length} transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expense</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{money(totalExpense)}</p>
            <p className="text-xs text-muted-foreground">{transactions.filter(t => t.type === 'EXPENSE').length} transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
            <ArrowLeftRight className={`h-4 w-4 ${net >= 0 ? 'text-green-600' : 'text-red-600'}`} />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${net >= 0 ? 'text-green-600' : 'text-red-600'}`}>{money(net)}</p>
            <p className="text-xs text-muted-foreground">Income minus expense</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>View and manage all financial transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <SkeletonTableRows rows={5} cols={7} />
              ) : transactions.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No transactions found</TableCell></TableRow>
              ) : (
                <>
                  {transactions.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="text-sm">{t.date}</TableCell>
                      <TableCell>
                        <Badge className={TYPE_COLORS[t.type]}>{t.type}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{t.description}</TableCell>
                      <TableCell className="text-muted-foreground">{t.categoryAccount?.name ?? '—'}</TableCell>
                      <TableCell className="text-right font-semibold">
                        <span className={t.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}>
                          {t.type === 'INCOME' ? '+' : '-'}{money(t.amount)}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-sm">{t.reference}</TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[t.status] ?? 'bg-gray-100 text-gray-800'}>{t.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Transaction</DialogTitle>
            <DialogDescription>Create a new financial transaction</DialogDescription>
          </DialogHeader>
          {submitError && <Alert variant="destructive"><AlertDescription>{submitError}</AlertDescription></Alert>}
          <div className="space-y-4 py-2">
            <div>
              <Label>Transaction Type</Label>
              <Select value={formData.type} onValueChange={v => setFormData(f => ({ ...f, type: v as TransactionType, categoryAccountId: '', fromAccountId: '', toAccountId: '' }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INCOME">Income</SelectItem>
                  <SelectItem value="EXPENSE">Expense</SelectItem>
                  <SelectItem value="TRANSFER">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Amount</Label>
                <Input type="number" placeholder="0.00" value={formData.amount} onChange={e => setFormData(f => ({ ...f, amount: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={formData.date} onChange={e => setFormData(f => ({ ...f, date: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Input placeholder="Transaction description" value={formData.description} onChange={e => setFormData(f => ({ ...f, description: e.target.value }))} className="mt-1" />
            </div>
            {formData.type !== 'TRANSFER' && (
              <div>
                <Label>Category Account (optional)</Label>
                <Select value={formData.categoryAccountId} onValueChange={v => setFormData(f => ({ ...f, categoryAccountId: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select GL account" /></SelectTrigger>
                  <SelectContent>
                    {glAccounts.filter(a => formData.type === 'INCOME' ? a.type === 'INCOME' : a.type === 'EXPENSE').map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {formData.type !== 'TRANSFER' && (
              <div>
                <Label>Payment Account (optional)</Label>
                <Select value={formData.paymentAccountId} onValueChange={v => setFormData(f => ({ ...f, paymentAccountId: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select payment account" /></SelectTrigger>
                  <SelectContent>
                    {glAccounts.filter(a => a.type === 'ASSET').map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {formData.type === 'TRANSFER' && (
              <>
                <div>
                  <Label>From Account</Label>
                  <Select value={formData.fromAccountId} onValueChange={v => setFormData(f => ({ ...f, fromAccountId: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Source account" /></SelectTrigger>
                    <SelectContent>
                      {glAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>To Account</Label>
                  <Select value={formData.toAccountId} onValueChange={v => setFormData(f => ({ ...f, toAccountId: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Destination account" /></SelectTrigger>
                    <SelectContent>
                      {glAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSubmitting || !formData.description || !formData.amount}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Add Transaction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
