'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { usersService } from '@/lib/services/users'
import type { UserDropdownItem } from '@/lib/services/users'
import { feeService } from '@/lib/services/fee'
import type { FeeInvoice, PaymentMethod, FeeReceipt, ReceiptPrintData } from '@/lib/services/fee'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Search, Receipt, Loader2, CheckCircle2, Download } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

function fmt(val: string | number | undefined): string {
  const n = parseFloat(String(val ?? 0))
  return isNaN(n) ? '0.00' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'ONLINE_PAYMENT', label: 'Online Payment' },
  { value: 'MOBILE_WALLET', label: 'Mobile Wallet' },
]

const OPEN_STATUSES = new Set(['ISSUED', 'PARTIAL', 'OVERDUE'])

export default function FeeCollectionPage() {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [students, setStudents] = useState<UserDropdownItem[]>([])
  const [selectedStudent, setSelectedStudent] = useState<UserDropdownItem | null>(null)
  const [studentInvoices, setStudentInvoices] = useState<FeeInvoice[]>([])
  const [selectedInvoice, setSelectedInvoice] = useState<FeeInvoice | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH')
  const [referenceNo, setReferenceNo] = useState('')
  const [receiptDialog, setReceiptDialog] = useState(false)
  const [lastReceipt, setLastReceipt] = useState<ReceiptPrintData | null>(null)
  const [loading, setLoading] = useState(false)
  const [invoiceLoading, setInvoiceLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  const loadStudents = useCallback(async () => {
    setLoading(true)
    const list = await usersService.getDropdownStudents()
    setStudents(list)
    setLoading(false)
  }, [])

  useEffect(() => { loadStudents() }, [loadStudents])

  const filteredStudents = students.filter(s => {
    if (!searchQuery) return false
    const q = searchQuery.toLowerCase()
    return s.fullName.toLowerCase().includes(q) || s.userCode.toLowerCase().includes(q)
  })

  const handleSelectStudent = async (student: UserDropdownItem) => {
    setSelectedStudent(student)
    setStudentInvoices([])
    setSelectedInvoice(null)
    setInvoiceLoading(true)
    const result = await feeService.getInvoices({ studentId: student.id, limit: 50 })
    const open = result.data.filter(inv => OPEN_STATUSES.has(inv.status))
    setStudentInvoices(open)
    if (open.length === 1) {
      setSelectedInvoice(open[0])
      setPaymentAmount(open[0].balanceAmount)
    }
    setInvoiceLoading(false)
  }

  const handleSelectInvoice = (inv: FeeInvoice) => {
    setSelectedInvoice(inv)
    setPaymentAmount(inv.balanceAmount)
    setSubmitError('')
  }

  const handleCollectPayment = async () => {
    if (!selectedInvoice) return
    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0) {
      setSubmitError('Please enter a valid amount')
      return
    }
    setIsSubmitting(true)
    setSubmitError('')
    const result = await feeService.recordPayment({
      invoiceId: selectedInvoice.id,
      amount: paymentAmount,
      paymentMethod,
      paymentDate: today,
      referenceNo: referenceNo || undefined,
      receivedByUserId: user?.id,
    })
    if (result.error || !result.payment) {
      setSubmitError(result.error || 'Failed to record payment')
      setIsSubmitting(false)
      return
    }
    // Fetch receipt print data
    if (result.receipt) {
      const printData = await feeService.getReceiptPrintData(result.receipt.id)
      setLastReceipt(printData)
      setReceiptDialog(true)
    }
    // Reload invoices
    const inv = await feeService.getInvoices({ studentId: selectedInvoice.studentId, limit: 50 })
    setStudentInvoices(inv.data.filter(i => OPEN_STATUSES.has(i.status)))
    setSelectedInvoice(null)
    setPaymentAmount('')
    setReferenceNo('')
    setIsSubmitting(false)
  }

  const handleDownloadReceipt = () => {
    if (!lastReceipt) return
    const lines = lastReceipt.lines.map(l =>
      `<tr><td style="padding:4px 8px">${l.componentName}</td><td style="padding:4px 8px;text-align:right">$${fmt(l.amount)}</td></tr>`
    ).join('')
    const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:480px;margin:40px auto;padding:24px;border:1px solid #ddd;border-radius:8px">
      <div style="text-align:center;margin-bottom:24px;border-bottom:1px solid #eee;padding-bottom:16px">
        <h2 style="margin:0">${lastReceipt.tenant.name}</h2>
      </div>
      <h3 style="text-align:center;letter-spacing:2px">FEE RECEIPT</h3>
      <p style="text-align:center;color:#666;font-size:13px">Receipt No: ${lastReceipt.receiptNo}</p>
      <table style="width:100%;margin:16px 0;background:#f9f9f9;border-radius:4px">
        <tr><td style="padding:4px 8px;font-weight:bold">Student</td><td style="padding:4px 8px">${lastReceipt.student.fullName}</td></tr>
        <tr><td style="padding:4px 8px;font-weight:bold">Code</td><td style="padding:4px 8px">${lastReceipt.student.userCode}</td></tr>
      </table>
      ${lines ? `<table style="width:100%;margin:16px 0"><thead><tr><th style="text-align:left;padding:4px 8px">Component</th><th style="text-align:right;padding:4px 8px">Amount</th></tr></thead><tbody>${lines}</tbody></table>` : ''}
      <table style="width:100%;margin:16px 0;background:#e8f4fd;border-radius:4px">
        <tr><td style="padding:4px 8px;font-weight:bold">Method</td><td style="padding:4px 8px">${lastReceipt.payment.method}</td></tr>
        <tr style="border-top:2px solid #ccc"><td style="padding:8px;font-size:18px;font-weight:bold">Amount Paid</td><td style="padding:8px;font-size:18px;font-weight:bold;text-align:right">$${fmt(lastReceipt.payment.amount)}</td></tr>
      </table>
    </body></html>`
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Receipt_${lastReceipt.receiptNo}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Fee Collection</h1>
        <p className="text-muted-foreground">Collect fees and generate receipts</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Search Student</CardTitle>
            <CardDescription>Find student to collect fees</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Type name or code to search…"
                className="pl-10"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            {loading ? (
              <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {searchQuery && filteredStudents.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No students found</p>
                )}
                {filteredStudents.map(s => (
                  <Button
                    key={s.id}
                    variant={selectedStudent?.id === s.id ? 'default' : 'outline'}
                    className="w-full justify-start"
                    onClick={() => handleSelectStudent(s)}
                  >
                    <div className="text-left min-w-0">
                      <div className="font-medium truncate">{s.fullName}</div>
                      <div className="font-mono text-xs">{s.userCode}</div>
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>
              {selectedStudent ? `${selectedStudent.fullName} — Open Invoices` : 'Select a Student'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedStudent ? (
              <p className="text-center text-muted-foreground py-8">Search and select a student</p>
            ) : invoiceLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : studentInvoices.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No open invoices</p>
            ) : (
              <>
                <div className="space-y-2">
                  {studentInvoices.map(inv => (
                    <div
                      key={inv.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedInvoice?.id === inv.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                      onClick={() => handleSelectInvoice(inv)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-mono font-semibold">{inv.invoiceNo}</p>
                          <p className="text-xs text-muted-foreground">Due: {inv.dueDate}</p>
                        </div>
                        <div className="text-right">
                          <Badge className={
                            inv.status === 'OVERDUE' ? 'bg-red-100 text-red-700' :
                            inv.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-blue-100 text-blue-700'
                          }>{inv.status}</Badge>
                          <p className="text-sm font-bold text-orange-600 mt-1">Balance: ${fmt(inv.balanceAmount)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedInvoice && (
                  <div className="space-y-3 border-t pt-4">
                    <h3 className="font-semibold">Payment for {selectedInvoice.invoiceNo}</h3>
                    {submitError && <Alert variant="destructive"><AlertDescription>{submitError}</AlertDescription></Alert>}
                    <div>
                      <Label>Amount</Label>
                      <Input
                        type="number"
                        value={paymentAmount}
                        onChange={e => setPaymentAmount(e.target.value)}
                        className="mt-1"
                        placeholder="0.00"
                        min="0"
                      />
                    </div>
                    <div>
                      <Label>Payment Method</Label>
                      <Select value={paymentMethod} onValueChange={v => setPaymentMethod(v as PaymentMethod)}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PAYMENT_METHODS.map(m => (
                            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Reference No (optional)</Label>
                      <Input
                        placeholder="Cheque / reference no"
                        value={referenceNo}
                        onChange={e => setReferenceNo(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <Button
                      className="w-full"
                      onClick={handleCollectPayment}
                      disabled={isSubmitting || !paymentAmount}
                    >
                      {isSubmitting
                        ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing…</>
                        : <><CheckCircle2 className="h-4 w-4 mr-2" /><Receipt className="h-4 w-4 mr-2" />Collect & Generate Receipt</>}
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={receiptDialog} onOpenChange={setReceiptDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Payment Successful</DialogTitle>
            <DialogDescription>
              {lastReceipt ? `Receipt #${lastReceipt.receiptNo}` : ''}
            </DialogDescription>
          </DialogHeader>
          {lastReceipt && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg text-center">
                <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="font-bold text-green-700 text-lg">${fmt(lastReceipt.payment.amount)} Collected</p>
                <p className="text-sm text-green-600">{lastReceipt.payment.method} · {lastReceipt.payment.paymentDate}</p>
              </div>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="font-medium">Student:</span>
                  <span>{lastReceipt.student.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Invoice:</span>
                  <span className="font-mono">{lastReceipt.invoice.invoiceNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Balance After:</span>
                  <span>${fmt(lastReceipt.invoice.balanceAfterPayment)}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setReceiptDialog(false)}>Close</Button>
                <Button className="flex-1" onClick={handleDownloadReceipt}>
                  <Download className="h-4 w-4 mr-2" /> Download Receipt
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
