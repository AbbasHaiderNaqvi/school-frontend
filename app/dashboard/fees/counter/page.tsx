'use client'

import { money } from '@/lib/currency'
import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, Search, Users, Loader2 } from 'lucide-react'
import { SkeletonTableRows } from '@/components/ui/page-skeleton'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/contexts/auth-context'
import { usersService } from '@/lib/services/users'
import type { UserDropdownItem } from '@/lib/services/users'
import { feeService } from '@/lib/services/fee'
import type { FeeInvoice, PaymentMethod } from '@/lib/services/fee'
import { numberError, hasNoErrors } from '@/lib/validation'

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

export default function FeeCounterPage() {
  const { user } = useAuth()
  const [students, setStudents] = useState<UserDropdownItem[]>([])
  const [selectedStudent, setSelectedStudent] = useState<UserDropdownItem | null>(null)
  const [studentInvoices, setStudentInvoices] = useState<FeeInvoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isInvoiceLoading, setIsInvoiceLoading] = useState(false)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<FeeInvoice | null>(null)
  const [paymentData, setPaymentData] = useState({
    amount: '',
    paymentMethod: 'CASH' as PaymentMethod,
    referenceNo: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const today = new Date().toISOString().split('T')[0]

  const loadStudents = useCallback(async () => {
    setIsLoading(true)
    const list = await usersService.getDropdownStudents()
    setStudents(list)
    setIsLoading(false)
  }, [])

  useEffect(() => { loadStudents() }, [loadStudents])

  const handleSelectStudent = async (student: UserDropdownItem) => {
    setSelectedStudent(student)
    setStudentInvoices([])
    setIsInvoiceLoading(true)
    const result = await feeService.getInvoices({ studentId: student.id, limit: 50 })
    setStudentInvoices(result.data.filter(inv => OPEN_STATUSES.has(inv.status)))
    setIsInvoiceLoading(false)
  }

  const handlePayInvoice = (invoice: FeeInvoice) => {
    setSelectedInvoice(invoice)
    setPaymentData({
      amount: invoice.balanceAmount,
      paymentMethod: 'CASH',
      referenceNo: '',
    })
    setSubmitError('')
    setFieldErrors({})
    setShowPaymentDialog(true)
  }

  const validate = (): boolean => {
    const errors: Record<string, string> = {}
    const amountErr = numberError(paymentData.amount, { required: true, min: 0.01, label: 'Payment amount' })
    if (amountErr) errors.amount = amountErr
    setFieldErrors(errors)
    return hasNoErrors(errors)
  }

  const handleSubmitPayment = async () => {
    if (!selectedInvoice) return
    if (!validate()) return
    setIsSubmitting(true)
    setSubmitError('')
    const result = await feeService.recordPayment({
      invoiceId: selectedInvoice.id,
      amount: paymentData.amount,
      paymentMethod: paymentData.paymentMethod,
      paymentDate: today,
      referenceNo: paymentData.referenceNo || undefined,
      receivedByUserId: user?.id,
    })
    if (result.error || !result.payment) {
      setSubmitError(result.error || 'Failed to record payment')
      setIsSubmitting(false)
      return
    }
    setShowPaymentDialog(false)
    setIsSubmitting(false)
    if (selectedStudent) {
      const inv = await feeService.getInvoices({ studentId: selectedStudent.id, limit: 50 })
      setStudentInvoices(inv.data.filter(i => OPEN_STATUSES.has(i.status)))
    }
  }

  const filteredStudents = students.filter(s => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return s.fullName.toLowerCase().includes(q) || s.userCode.toLowerCase().includes(q)
  })

  const totalBalance = studentInvoices.reduce((s, inv) => s + parseFloat(inv.balanceAmount), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Fee Counter — Payment Collection</h1>
        <p className="text-muted-foreground">Record fee payments and generate receipts</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Search Student</CardTitle>
            <CardDescription>Find student by name or code</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or code…"
                className="pl-10"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            {isLoading ? (
              <div className="space-y-3">{Array.from({length:5}).map((_,i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : (
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {filteredStudents.map(s => (
                  <Button
                    key={s.id}
                    variant={selectedStudent?.id === s.id ? 'default' : 'outline'}
                    className="w-full justify-start"
                    onClick={() => handleSelectStudent(s)}
                  >
                    <Users className="mr-2 h-4 w-4 flex-shrink-0" />
                    <div className="text-left min-w-0">
                      <div className="font-medium truncate">{s.fullName}</div>
                      <div className="text-xs font-mono">{s.userCode}</div>
                    </div>
                  </Button>
                ))}
                {filteredStudents.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-4">No students found</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              {selectedStudent ? `${selectedStudent.fullName}'s Open Invoices` : 'Select a Student'}
            </CardTitle>
            {selectedStudent && (
              <CardDescription>
                Code: {selectedStudent.userCode}
                {totalBalance > 0 && ` · Total balance: ${money(totalBalance)}`}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {!selectedStudent ? (
              <p className="text-center text-muted-foreground py-8">Select a student to view their open invoices</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isInvoiceLoading ? (
                    <SkeletonTableRows rows={5} cols={7} />
                  ) : studentInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No open invoices for this student</TableCell>
                    </TableRow>
                  ) : studentInvoices.map(inv => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-sm font-semibold">{inv.invoiceNo}</TableCell>
                      <TableCell className="text-sm">{inv.dueDate}</TableCell>
                      <TableCell className="text-right">{money(inv.netAmount)}</TableCell>
                      <TableCell className="text-right text-green-600">{money(inv.paidAmount)}</TableCell>
                      <TableCell className="text-right font-bold text-orange-600">{money(inv.balanceAmount)}</TableCell>
                      <TableCell>
                        <Badge className={
                          inv.status === 'OVERDUE' ? 'bg-red-100 text-red-700' :
                          inv.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        }>{inv.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={() => handlePayInvoice(inv)}>
                          <CheckCircle2 className="mr-1 h-4 w-4" /> Pay
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Fee Payment</DialogTitle>
            <DialogDescription>
              {selectedInvoice && `Invoice ${selectedInvoice.invoiceNo} — Balance: ${money(selectedInvoice.balanceAmount)}`}
            </DialogDescription>
          </DialogHeader>
          {submitError && <Alert variant="destructive"><AlertDescription>{submitError}</AlertDescription></Alert>}
          <div className="space-y-4 py-2">
            <div>
              <Label>Payment Amount</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={paymentData.amount}
                onChange={e => setPaymentData(d => ({ ...d, amount: e.target.value }))}
                className={`mt-1 ${fieldErrors.amount ? 'border-destructive' : ''}`}
                min={0}
              />
              {fieldErrors.amount && <p className="text-xs text-destructive mt-1">{fieldErrors.amount}</p>}
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={paymentData.paymentMethod} onValueChange={v => setPaymentData(d => ({ ...d, paymentMethod: v as PaymentMethod }))}>
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
                placeholder="Cheque / reference number"
                value={paymentData.referenceNo}
                onChange={e => setPaymentData(d => ({ ...d, referenceNo: e.target.value }))}
                className="mt-1"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowPaymentDialog(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleSubmitPayment} disabled={isSubmitting || !paymentData.amount}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <CheckCircle2 className="mr-2 h-4 w-4" /> Process & Print
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
