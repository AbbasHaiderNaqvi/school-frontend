'use client'

import { money } from '@/lib/currency'
import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { AccessDenied } from '@/components/ui/access-denied'
import { feeService } from '@/lib/services/fee'
import type { FeePayment, FeeInvoice, PaymentMethod } from '@/lib/services/fee'
import {
  Plus, Search, CreditCard, Banknote, Building2, Globe, Receipt,
  DollarSign, Smartphone, Loader2,
} from 'lucide-react'

function fmt(val: string | number | undefined): string {
  const n = parseFloat(String(val ?? 0))
  return isNaN(n) ? '0.00' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const METHOD_ICONS: Record<PaymentMethod, React.ElementType> = {
  CASH: Banknote,
  CARD: CreditCard,
  BANK_TRANSFER: Building2,
  ONLINE_PAYMENT: Globe,
  CHEQUE: Receipt,
  MOBILE_WALLET: Smartphone,
}

const METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  BANK_TRANSFER: 'Bank Transfer',
  ONLINE_PAYMENT: 'Online',
  CHEQUE: 'Cheque',
  MOBILE_WALLET: 'Mobile Wallet',
}

export default function PaymentsPage() {
  const { can } = useAuth()
  const [payments, setPayments] = useState<FeePayment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const [showDialog, setShowDialog] = useState(false)
  const [openInvoices, setOpenInvoices] = useState<FeeInvoice[]>([])
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [referenceNo, setReferenceNo] = useState('')
  const [saveError, setSaveError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [invoiceSearch, setInvoiceSearch] = useState('')

  const loadPayments = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const result = await feeService.getPayments({ limit: 100 })
      setPayments(result.data)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load data. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadPayments() }, [loadPayments])

  const openRecordDialog = async () => {
    setSaveError('')
    setSelectedInvoiceId('')
    setPaymentAmount('')
    setPaymentMethod('CASH')
    setPaymentDate(new Date().toISOString().split('T')[0])
    setReferenceNo('')
    setInvoiceSearch('')

    const result = await feeService.getInvoices({ limit: 100 })
    setOpenInvoices(result.data.filter(i => i.status === 'ISSUED' || i.status === 'PARTIAL' || i.status === 'OVERDUE'))
    setShowDialog(true)
  }

  const selectedInvoice = openInvoices.find(i => i.id === selectedInvoiceId)

  const handleSelectInvoice = (id: string) => {
    setSelectedInvoiceId(id)
    const inv = openInvoices.find(i => i.id === id)
    if (inv) setPaymentAmount(inv.balanceAmount)
  }

  const handleRecordPayment = async () => {
    if (!selectedInvoiceId || !paymentAmount) return
    setIsSaving(true)
    setSaveError('')
    const result = await feeService.recordPayment({
      invoiceId: selectedInvoiceId,
      amount: paymentAmount,
      paymentMethod,
      paymentDate,
      referenceNo: referenceNo || undefined,
    })
    if (result.error) {
      setSaveError(result.error)
      setIsSaving(false)
      return
    }
    setShowDialog(false)
    setIsSaving(false)
    loadPayments()
  }

  const filteredPayments = payments.filter(p => {
    if (!searchQuery) return true
    return p.referenceNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.paymentDate.includes(searchQuery)
  })

  const filteredInvoices = openInvoices.filter(i => {
    if (!invoiceSearch) return true
    const q = invoiceSearch.toLowerCase()
    return (i.studentName ?? '').toLowerCase().includes(q) ||
      i.invoiceNo.toLowerCase().includes(q) ||
      (i.className ?? '').toLowerCase().includes(q)
  })

  const totalCollected = payments.reduce((s, p) => s + parseFloat(p.amount), 0)
  const today = new Date().toISOString().split('T')[0]
  const todayPayments = payments.filter(p => p.paymentDate === today || p.createdAt.startsWith(today))
  const todayCollected = todayPayments.reduce((s, p) => s + parseFloat(p.amount), 0)

  if (!can('fees.payment.read')) return <AccessDenied />

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Payments" description="Record and manage fee payments" />
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Payments" description="Record and track fee payments" />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Collected</p>
              <p className="text-2xl font-bold">{money(totalCollected)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Receipt className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Today's Collection</p>
              <p className="text-2xl font-bold">{money(todayCollected)}</p>
              <p className="text-xs text-muted-foreground">{todayPayments.length} payments</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <Receipt className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Payments</p>
              <p className="text-2xl font-bold">{payments.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by reference or date…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        {can('fees.payment.create') && (
          <Button onClick={openRecordDialog}>
            <Plus className="mr-2 h-4 w-4" /> Record Payment
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payments ({payments.length})</CardTitle>
          <CardDescription>All recorded fee payments</CardDescription>
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
                <TableHead>Date</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map(p => {
                const MethodIcon = METHOD_ICONS[p.paymentMethod] ?? Receipt
                return (
                  <TableRow key={p.id}>
                    <TableCell className="text-muted-foreground">{p.paymentDate}</TableCell>
                    <TableCell className="font-mono text-sm">{p.invoiceId.slice(-8)}</TableCell>
                    <TableCell className="text-right font-semibold text-green-600">{money(p.amount)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MethodIcon className="h-4 w-4 text-muted-foreground" />
                        <span>{METHOD_LABELS[p.paymentMethod] ?? p.paymentMethod}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.referenceNo || '—'}</TableCell>
                    <TableCell className="text-sm">{p.status}</TableCell>
                  </TableRow>
                )
              })}
              {filteredPayments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No payments recorded yet</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>Select an invoice and record a payment</DialogDescription>
          </DialogHeader>
          {saveError && <Alert variant="destructive"><AlertDescription>{saveError}</AlertDescription></Alert>}
          <div className="space-y-4 py-2">
            <div>
              <Label>Search Invoice</Label>
              <Input placeholder="Search by student, class, or invoice no…" value={invoiceSearch} onChange={e => setInvoiceSearch(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Select Invoice</Label>
              <Select value={selectedInvoiceId} onValueChange={handleSelectInvoice}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select an invoice" /></SelectTrigger>
                <SelectContent>
                  {filteredInvoices.slice(0, 30).map(i => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.invoiceNo} — {i.studentName ?? 'Unknown'} — Balance: {money(i.balanceAmount)}
                    </SelectItem>
                  ))}
                  {filteredInvoices.length === 0 && (
                    <SelectItem value="__none" disabled>No open invoices found</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedInvoice && (
              <div className="p-4 bg-muted rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Student</span>
                  <span className="font-medium">{selectedInvoice.studentName ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Class</span>
                  <span className="font-medium">{selectedInvoice.className ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-medium">{money(selectedInvoice.totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paid</span>
                  <span className="font-medium text-green-600">{money(selectedInvoice.paidAmount)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-semibold">Balance Due</span>
                  <span className="font-bold text-orange-600">{money(selectedInvoice.balanceAmount)}</span>
                </div>
              </div>
            )}

            <div>
              <Label>Payment Amount</Label>
              <div className="relative mt-1">
                <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} className="pl-10" />
              </div>
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={v => setPaymentMethod(v as PaymentMethod)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="CARD">Card</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="ONLINE_PAYMENT">Online Payment</SelectItem>
                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                  <SelectItem value="MOBILE_WALLET">Mobile Wallet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payment Date</Label>
              <Input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Reference No. (optional)</Label>
              <Input value={referenceNo} onChange={e => setReferenceNo(e.target.value)} placeholder="e.g., TXN123456" className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleRecordPayment} disabled={isSaving || !selectedInvoiceId || !paymentAmount}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
