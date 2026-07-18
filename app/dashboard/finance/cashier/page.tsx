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
import { Combobox } from '@/components/ui/combobox'
import { Badge } from '@/components/ui/badge'
import { Plus, Loader2 } from 'lucide-react'
import { SkeletonTableRows } from '@/components/ui/page-skeleton'
import { useAuth } from '@/contexts/auth-context'
import { financeService } from '@/lib/services/finance'
import type { FinanceTransaction, TransactionType, GlAccount } from '@/lib/services/finance'
import { numberError, hasNoErrors } from '@/lib/validation'

function fmt(val: string | number | undefined): string {
  const n = parseFloat(String(val ?? 0))
  return isNaN(n) ? '0.00' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function CashierPage() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([])
  const [glAccounts, setGlAccounts] = useState<GlAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState({
    type: 'INCOME' as TransactionType,
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    paymentAccountId: '',
    categoryAccountId: '',
    reference: '',
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

  const validate = (): boolean => {
    const errors: Record<string, string> = {}
    const amountErr = numberError(formData.amount, { required: true, min: 0, label: 'Amount' })
    if (amountErr) errors.amount = amountErr
    setFieldErrors(errors)
    return hasNoErrors(errors)
  }

  const handleAddTransaction = async () => {
    if (!formData.amount || !formData.description || !validate()) return
    setIsSubmitting(true)
    setSubmitError('')
    const result = await financeService.createTransaction({
      type: formData.type,
      amount: formData.amount,
      description: formData.description,
      date: formData.date,
      paymentAccountId: formData.paymentAccountId || undefined,
      categoryAccountId: formData.categoryAccountId || undefined,
    })
    if (result.error || !result.transaction) {
      setSubmitError(result.error || 'Failed to record transaction')
      setIsSubmitting(false)
      return
    }
    setFormData({ type: 'INCOME', amount: '', description: '', date: new Date().toISOString().split('T')[0], paymentAccountId: '', categoryAccountId: '', reference: '' })
    setIsDialogOpen(false)
    setIsSubmitting(false)
    loadData()
  }

  const TYPE_COLORS: Record<TransactionType, string> = {
    INCOME: 'bg-green-100 text-green-800',
    EXPENSE: 'bg-red-100 text-red-800',
    TRANSFER: 'bg-blue-100 text-blue-800',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cashier — Transaction Management</h1>
          <p className="text-muted-foreground">Record and manage cash transactions</p>
        </div>
        <Button onClick={() => { setSubmitError(''); setFieldErrors({}); setIsDialogOpen(true) }}>
          <Plus className="h-4 w-4 mr-2" /> Add Transaction
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>All transactions recorded by cashier and accountants</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
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
                <SkeletonTableRows rows={5} cols={7} />
              </TableBody>
            </Table>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No transactions recorded yet</div>
          ) : (
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
                {transactions.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="text-sm">{t.date}</TableCell>
                    <TableCell><Badge className={TYPE_COLORS[t.type]}>{t.type}</Badge></TableCell>
                    <TableCell className="font-medium">{t.description}</TableCell>
                    <TableCell className="text-muted-foreground">{t.categoryAccount?.name ?? '—'}</TableCell>
                    <TableCell className="text-right font-semibold">{money(t.amount)}</TableCell>
                    <TableCell className="font-mono text-sm">{t.reference}</TableCell>
                    <TableCell><Badge variant="outline">{t.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record New Transaction</DialogTitle>
            <DialogDescription>Enter transaction details to record a new financial entry</DialogDescription>
          </DialogHeader>
          {submitError && <Alert variant="destructive"><AlertDescription>{submitError}</AlertDescription></Alert>}
          <div className="space-y-4 py-2">
            <div>
              <Label>Type</Label>
              <Select value={formData.type} onValueChange={v => setFormData(f => ({ ...f, type: v as TransactionType }))}>
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
                <Input
                  type="number"
                  min={0}
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={e => setFormData(f => ({ ...f, amount: e.target.value }))}
                  className={`mt-1 ${fieldErrors.amount ? 'border-destructive' : ''}`}
                />
                {fieldErrors.amount && <p className="text-xs text-destructive mt-1">{fieldErrors.amount}</p>}
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
            <div>
              <Label>Payment Account (optional)</Label>
              <Combobox
                value={formData.paymentAccountId}
                onValueChange={v => setFormData(f => ({ ...f, paymentAccountId: v }))}
                options={glAccounts.filter(a => a.type === 'ASSET').map(a => ({ value: a.id, label: `${a.code} — ${a.name}`, keywords: a.code }))}
                placeholder="Cash / Bank account"
                searchPlaceholder="Search accounts…"
                emptyText="No accounts found."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleAddTransaction} disabled={isSubmitting || !formData.amount || !formData.description}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Record Transaction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
