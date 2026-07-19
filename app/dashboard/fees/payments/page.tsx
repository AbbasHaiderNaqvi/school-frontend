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
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { AccessDenied } from '@/components/ui/access-denied'
import { SkeletonTableRows } from '@/components/ui/page-skeleton'
import { feeService } from '@/lib/services/fee'
import type { FeePayment, FeeInvoice, FeeReceipt, ReceiptPrintData, PaymentMethod } from '@/lib/services/fee'
import { printReceipt, downloadReceipt } from '@/lib/receipt-print'
import { numberError, requiredError, hasNoErrors } from '@/lib/validation'
import {
  Plus, Search, CreditCard, Banknote, Building2, Globe, Receipt,
  DollarSign, Smartphone, Loader2, Printer, Download, CheckCircle2,
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const [savedReceipt, setSavedReceipt] = useState<FeeReceipt | null>(null)
  const [savedPrintData, setSavedPrintData] = useState<ReceiptPrintData | null>(null)

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
    setFieldErrors({})
    setSavedReceipt(null)
    setSavedPrintData(null)
    setSelectedInvoiceId('')
    setPaymentAmount('')
    setPaymentMethod('CASH')
    setPaymentDate(new Date().toISOString().split('T')[0])
    setReferenceNo('')

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

  const validate = (): boolean => {
    const errors: Record<string, string> = {}
    const invoiceErr = requiredError(selectedInvoiceId, 'Invoice')
    if (invoiceErr) errors.selectedInvoiceId = invoiceErr
    const amountErr = numberError(paymentAmount, { required: true, min: 0.01, label: 'Payment amount' })
    if (amountErr) errors.paymentAmount = amountErr
    setFieldErrors(errors)
    return hasNoErrors(errors)
  }

  const handleRecordPayment = async () => {
    if (!selectedInvoiceId || !paymentAmount) return
    if (!validate()) return
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
    setIsSaving(false)
    loadPayments()
    // Keep the dialog open in a success state so the cashier can print the receipt.
    if (result.receipt) {
      setSavedReceipt(result.receipt)
      feeService.getReceiptPrintData(result.receipt.id).then(setSavedPrintData).catch(() => {})
    } else {
      setShowDialog(false)
    }
  }

  const filteredPayments = payments.filter(p => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return p.referenceNo?.toLowerCase().includes(q) ||
      p.paymentDate.includes(searchQuery) ||
      p.invoiceNo?.toLowerCase().includes(q) ||
      p.studentName?.toLowerCase().includes(q)
  })

  const completedPayments = payments.filter(p => p.status === 'COMPLETED')
  const totalCollected = completedPayments.reduce((s, p) => s + parseFloat(p.amount), 0)
  const today = new Date().toISOString().split('T')[0]
  const todayPayments = completedPayments.filter(p => p.paymentDate === today || p.createdAt?.startsWith(today))
  const todayCollected = todayPayments.reduce((s, p) => s + parseFloat(p.amount), 0)

  if (!can('fees.payment.read')) return <AccessDenied />

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

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by student, invoice, reference, or date…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        {can('fees.payment.create') && (
          <Button onClick={openRecordDialog} className="w-full sm:w-auto">
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
                <TableHead>Student</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <SkeletonTableRows rows={6} cols={7} />
              ) : (
                <>
              {filteredPayments.map(p => {
                const MethodIcon = METHOD_ICONS[p.paymentMethod] ?? Receipt
                return (
                  <TableRow key={p.id}>
                    <TableCell className="text-muted-foreground">{p.paymentDate}</TableCell>
                    <TableCell className="font-mono text-sm">{p.invoiceNo ?? p.invoiceId.slice(-8)}</TableCell>
                    <TableCell>{p.studentName ?? '—'}</TableCell>
                    <TableCell className={`text-right font-semibold ${p.status === 'COMPLETED' ? 'text-green-600' : 'text-muted-foreground line-through'}`}>{money(p.amount)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MethodIcon className="h-4 w-4 text-muted-foreground" />
                        <span>{METHOD_LABELS[p.paymentMethod] ?? p.paymentMethod}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.referenceNo || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === 'COMPLETED' ? 'default' : p.status === 'REVERSED' || p.status === 'VOIDED' ? 'destructive' : 'secondary'}>
                        {p.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
              {filteredPayments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No payments recorded yet</TableCell>
                </TableRow>
              )}
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{savedReceipt ? 'Payment Recorded' : 'Record Payment'}</DialogTitle>
            <DialogDescription>
              {savedReceipt ? `Receipt ${savedReceipt.receiptNo} was generated` : 'Select an invoice and record a payment'}
            </DialogDescription>
          </DialogHeader>
          {savedReceipt ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center py-4 gap-2">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
                <p className="font-semibold text-lg">{money(savedReceipt.amount)} collected</p>
                <p className="text-sm text-muted-foreground font-mono">{savedReceipt.receiptNo}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowDialog(false)}>Done</Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={!savedPrintData}
                  onClick={() => savedPrintData && downloadReceipt(savedPrintData)}
                >
                  <Download className="h-4 w-4 mr-2" /> Download
                </Button>
                <Button
                  className="flex-1"
                  disabled={!savedPrintData}
                  onClick={() => savedPrintData && printReceipt(savedPrintData)}
                >
                  {savedPrintData ? <Printer className="h-4 w-4 mr-2" /> : <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Print
                </Button>
              </div>
            </div>
          ) : (
            <>
          {saveError && <Alert variant="destructive"><AlertDescription>{saveError}</AlertDescription></Alert>}
          <div className="space-y-4 py-2">
            <div>
              <Label>Select Invoice</Label>
              <Combobox
                value={selectedInvoiceId}
                onValueChange={handleSelectInvoice}
                options={openInvoices.map(i => ({
                  value: i.id,
                  label: `${i.invoiceNo} — ${i.studentName ?? 'Unknown'} — Balance: ${money(i.balanceAmount)}`,
                  keywords: `${i.studentName ?? ''} ${i.className ?? ''}`,
                }))}
                placeholder="Select an invoice"
                searchPlaceholder="Search by student, class, or invoice no…"
                emptyText="No open invoices found."
                className={`mt-1 ${fieldErrors.selectedInvoiceId ? 'border-destructive' : ''}`}
              />
              {fieldErrors.selectedInvoiceId && <p className="text-xs text-destructive mt-1">{fieldErrors.selectedInvoiceId}</p>}
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
                <Input
                  type="number"
                  min={0}
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  className={`pl-10 ${fieldErrors.paymentAmount ? 'border-destructive' : ''}`}
                />
              </div>
              {fieldErrors.paymentAmount && <p className="text-xs text-destructive mt-1">{fieldErrors.paymentAmount}</p>}
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
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
