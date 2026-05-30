'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { CheckCircle2, Users, DollarSign, Clock, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { usersService } from '@/lib/services/users'
import type { UserDropdownItem } from '@/lib/services/users'
import { feeService } from '@/lib/services/fee'
import type { FeeInvoice, FeePayment, PaymentMethod } from '@/lib/services/fee'

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

export default function CashierCounterPage() {
  const { user } = useAuth()
  const [students, setStudents] = useState<UserDropdownItem[]>([])
  const [selectedStudent, setSelectedStudent] = useState<UserDropdownItem | null>(null)
  const [studentInvoices, setStudentInvoices] = useState<FeeInvoice[]>([])
  const [todayPayments, setTodayPayments] = useState<FeePayment[]>([])
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

  const today = new Date().toISOString().split('T')[0]

  const loadStudents = useCallback(async () => {
    const list = await usersService.getDropdownStudents()
    setStudents(list)
  }, [])

  const loadTodayPayments = useCallback(async () => {
    const result = await feeService.getPayments({ from: today, to: today, limit: 100 })
    setTodayPayments(result.data)
  }, [today])

  useEffect(() => {
    const init = async () => {
      setIsLoading(true)
      await Promise.all([loadStudents(), loadTodayPayments()])
      setIsLoading(false)
    }
    init()
  }, [loadStudents, loadTodayPayments])

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
    setShowPaymentDialog(true)
  }

  const handleSubmitPayment = async () => {
    if (!selectedInvoice) return
    const amount = parseFloat(paymentData.amount)
    if (isNaN(amount) || amount <= 0) {
      setSubmitError('Please enter a valid amount')
      return
    }
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
    // Reload invoices and daily collection
    if (selectedStudent) {
      const inv = await feeService.getInvoices({ studentId: selectedStudent.id, limit: 50 })
      setStudentInvoices(inv.data.filter(i => OPEN_STATUSES.has(i.status)))
    }
    loadTodayPayments()
  }

  const filteredStudents = students.filter(s => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return s.fullName.toLowerCase().includes(q) || s.userCode.toLowerCase().includes(q)
  })

  const totalToday = todayPayments.reduce((s, p) => s + parseFloat(p.amount), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cashier Counter</h1>
          <p className="text-muted-foreground">Collect student fee payments</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Collected Today</p>
                <p className="text-xl font-bold">${fmt(totalToday)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Transactions Today</p>
                <p className="text-xl font-bold">{todayPayments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Students</p>
                <p className="text-xl font-bold">{students.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Collection Management</CardTitle>
          <CardDescription>Search for a student to collect fees</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="fees">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="fees">Collect Fees</TabsTrigger>
              <TabsTrigger value="collection">Today's Collection</TabsTrigger>
            </TabsList>

            <TabsContent value="fees" className="space-y-4 pt-4">
              {isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : selectedStudent ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-blue-50 p-4 rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Selected Student</p>
                      <p className="text-lg font-semibold">{selectedStudent.fullName}</p>
                      <p className="font-mono text-sm text-muted-foreground">{selectedStudent.userCode}</p>
                    </div>
                    <Button variant="outline" onClick={() => { setSelectedStudent(null); setStudentInvoices([]) }}>
                      Change Student
                    </Button>
                  </div>

                  {isInvoiceLoading ? (
                    <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                  ) : studentInvoices.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">No open invoices for this student</p>
                  ) : (
                    <div className="space-y-2">
                      {studentInvoices.map(inv => (
                        <div key={inv.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-semibold font-mono">{inv.invoiceNo}</p>
                            <p className="text-sm text-muted-foreground">Due: {inv.dueDate}</p>
                            <Badge className={
                              inv.status === 'OVERDUE' ? 'bg-red-100 text-red-700 mt-1' :
                              inv.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-700 mt-1' :
                              'bg-blue-100 text-blue-700 mt-1'
                            }>{inv.status}</Badge>
                          </div>
                          <div className="text-right space-y-1">
                            <p className="text-sm text-muted-foreground">Net: ${fmt(inv.netAmount)}</p>
                            <p className="text-sm text-muted-foreground">Paid: ${fmt(inv.paidAmount)}</p>
                            <p className="font-bold text-orange-600">Balance: ${fmt(inv.balanceAmount)}</p>
                            <Button size="sm" onClick={() => handlePayInvoice(inv)}>
                              <CheckCircle2 className="mr-1 h-4 w-4" /> Pay Now
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <Input
                    placeholder="Search student by name or code…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                  <div className="max-h-96 overflow-y-auto space-y-1">
                    {filteredStudents.map(s => (
                      <Button
                        key={s.id}
                        variant="outline"
                        onClick={() => handleSelectStudent(s)}
                        className="w-full justify-start"
                      >
                        <Users className="mr-2 h-4 w-4" />
                        <span>{s.fullName}</span>
                        <span className="ml-auto font-mono text-xs text-muted-foreground">{s.userCode}</span>
                      </Button>
                    ))}
                    {filteredStudents.length === 0 && (
                      <p className="text-center py-4 text-muted-foreground text-sm">No students found</p>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="collection" className="pt-4">
              {todayPayments.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No collections today</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {todayPayments.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-sm">{p.invoiceId.slice(-8)}</TableCell>
                        <TableCell><Badge variant="outline">{p.paymentMethod}</Badge></TableCell>
                        <TableCell className="text-sm font-mono">{p.referenceNo ?? '—'}</TableCell>
                        <TableCell className="text-right font-semibold text-green-600">${fmt(p.amount)}</TableCell>
                        <TableCell className="text-sm">{p.paymentDate}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              {selectedInvoice ? `Invoice ${selectedInvoice.invoiceNo} — Balance: $${fmt(selectedInvoice.balanceAmount)}` : ''}
            </DialogDescription>
          </DialogHeader>
          {submitError && <Alert variant="destructive"><AlertDescription>{submitError}</AlertDescription></Alert>}
          <div className="space-y-4 py-2">
            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                value={paymentData.amount}
                onChange={e => setPaymentData(d => ({ ...d, amount: e.target.value }))}
                placeholder="0.00"
                min="0"
                className="mt-1"
              />
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
              <CheckCircle2 className="mr-2 h-4 w-4" /> Record Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
