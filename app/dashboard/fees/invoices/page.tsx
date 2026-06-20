'use client'

import { money } from '@/lib/currency'
import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import type { FeeInvoice, InvoiceStatus, PaymentMethod } from '@/lib/services/fee'
import { Search, CreditCard, Loader2 } from 'lucide-react'

function fmt(val: string | number | undefined): string {
  const n = parseFloat(String(val ?? 0))
  return isNaN(n) ? '0.00' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function statusVariant(status: InvoiceStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'PAID') return 'default'
  if (status === 'OVERDUE') return 'destructive'
  if (status === 'PARTIAL') return 'secondary'
  return 'outline'
}

export default function InvoicesPage() {
  const { can } = useAuth()
  const [invoices, setInvoices] = useState<FeeInvoice[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<FeeInvoice | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [referenceNo, setReferenceNo] = useState('')
  const [paymentError, setPaymentError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadInvoices = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const result = await feeService.getInvoices({
        limit: 100,
        status: filterStatus !== 'all' ? (filterStatus as InvoiceStatus) : undefined,
      })
      setInvoices(result.data)
      setTotal(result.total)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load data. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [filterStatus])

  useEffect(() => { loadInvoices() }, [loadInvoices])

  const openPaymentDialog = (invoice: FeeInvoice) => {
    setSelectedInvoice(invoice)
    setPaymentAmount(invoice.balanceAmount)
    setPaymentMethod('CASH')
    setPaymentDate(new Date().toISOString().split('T')[0])
    setReferenceNo('')
    setPaymentError('')
    setIsPaymentOpen(true)
  }

  const handleRecordPayment = async () => {
    if (!selectedInvoice || !paymentAmount) return
    setIsSubmitting(true)
    setPaymentError('')
    const result = await feeService.recordPayment({
      invoiceId: selectedInvoice.id,
      amount: paymentAmount,
      paymentMethod,
      paymentDate,
      referenceNo: referenceNo || undefined,
    })
    if (result.error) {
      setPaymentError(result.error)
      setIsSubmitting(false)
      return
    }
    setIsPaymentOpen(false)
    setIsSubmitting(false)
    loadInvoices()
  }

  const filtered = invoices.filter(i => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (i.studentName ?? '').toLowerCase().includes(q) ||
      (i.className ?? '').toLowerCase().includes(q) ||
      i.invoiceNo.toLowerCase().includes(q)
  })

  if (!can('fees.invoice.read')) return <AccessDenied />

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Fee Invoices" description="Manage student fee invoices" />
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Fee Invoices" description="Manage student fee invoices and payments" />

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by student, class, or invoice no…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="ISSUED">Issued</SelectItem>
            <SelectItem value="PARTIAL">Partial</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="OVERDUE">Overdue</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader><CardTitle>Invoices ({total})</CardTitle></CardHeader>
        <CardContent>
          {loadError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{loadError}</AlertDescription>
            </Alert>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice No</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(invoice => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-mono text-sm">{invoice.invoiceNo}</TableCell>
                  <TableCell className="font-medium">{invoice.studentName ?? '—'}</TableCell>
                  <TableCell>{invoice.className ?? '—'}</TableCell>
                  <TableCell>{invoice.dueDate}</TableCell>
                  <TableCell className="text-right">{money(invoice.totalAmount)}</TableCell>
                  <TableCell className="text-right text-green-600">{money(invoice.paidAmount)}</TableCell>
                  <TableCell className={`text-right ${parseFloat(invoice.balanceAmount) > 0 ? 'text-red-600' : ''}`}>
                    {money(invoice.balanceAmount)}
                  </TableCell>
                  <TableCell><Badge variant={statusVariant(invoice.status)}>{invoice.status}</Badge></TableCell>
                  <TableCell>
                    {can('fees.payment.create') && (invoice.status === 'ISSUED' || invoice.status === 'PARTIAL' || invoice.status === 'OVERDUE') && (
                      <Button variant="outline" size="sm" onClick={() => openPaymentDialog(invoice)}>
                        <CreditCard className="h-4 w-4 mr-1" /> Pay
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No invoices found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              {selectedInvoice && `Invoice ${selectedInvoice.invoiceNo} — ${selectedInvoice.studentName ?? ''}`}
            </DialogDescription>
          </DialogHeader>
          {paymentError && <Alert variant="destructive"><AlertDescription>{paymentError}</AlertDescription></Alert>}
          {selectedInvoice && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg text-sm">
                <div><p className="text-muted-foreground">Total</p><p className="font-bold">{money(selectedInvoice.totalAmount)}</p></div>
                <div><p className="text-muted-foreground">Paid</p><p className="font-bold text-green-600">{money(selectedInvoice.paidAmount)}</p></div>
                <div><p className="text-muted-foreground">Discount</p><p className="font-bold">{money(selectedInvoice.discountAmount)}</p></div>
                <div><p className="text-muted-foreground">Balance</p><p className="font-bold text-red-600">{money(selectedInvoice.balanceAmount)}</p></div>
              </div>
              <div>
                <Label>Payment Amount</Label>
                <Input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} className="mt-1" />
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
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleRecordPayment} disabled={isSubmitting || !paymentAmount}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
