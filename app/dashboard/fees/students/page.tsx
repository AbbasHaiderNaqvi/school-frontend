'use client'

import { money } from '@/lib/currency'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Combobox } from '@/components/ui/combobox'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { feeService } from '@/lib/services/fee'
import type { StudentFeeAssignment, StudentFeeDetail, FeeInvoice } from '@/lib/services/fee'
import { academicsService } from '@/lib/services/academics'
import type { AcademicClass } from '@/lib/services/academics'
import { Search, Eye, Loader2 } from 'lucide-react'
import { SkeletonTableRows } from '@/components/ui/page-skeleton'
import { Skeleton } from '@/components/ui/skeleton'

function fmt(val: string | number | undefined): string {
  const n = parseFloat(String(val ?? 0))
  return isNaN(n) ? '0.00' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const STATUS_COLORS: Record<StudentFeeAssignment['status'], string> = {
  PAID: 'bg-green-100 text-green-700',
  PARTIAL: 'bg-yellow-100 text-yellow-700',
  OVERDUE: 'bg-red-100 text-red-700',
  PENDING: 'bg-gray-100 text-gray-700',
}

const INVOICE_STATUS_COLORS: Record<string, string> = {
  ISSUED: 'bg-blue-100 text-blue-700',
  PARTIAL: 'bg-yellow-100 text-yellow-700',
  PAID: 'bg-green-100 text-green-700',
  OVERDUE: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
  VOID: 'bg-gray-100 text-gray-500',
}

export default function StudentFeesPage() {
  const [assignments, setAssignments] = useState<StudentFeeAssignment[]>([])
  const [classes, setClasses] = useState<AcademicClass[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [selectedClass, setSelectedClass] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [detailStudent, setDetailStudent] = useState<StudentFeeDetail | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [showDetail, setShowDetail] = useState(false)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const [asgn, clsList] = await Promise.all([
        feeService.getStudentFees({ limit: 200 }),
        academicsService.getClasses({ limit: 100 }),
      ])
      setAssignments(asgn.data)
      setClasses(clsList.data)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load data. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const filtered = useMemo(() => {
    return assignments.filter(a => {
      const matchesClass = selectedClass === 'all' || a.classId === selectedClass
      const q = searchQuery.toLowerCase()
      const matchesSearch = !q || (a.studentName ?? '').toLowerCase().includes(q)
      return matchesClass && matchesSearch
    })
  }, [assignments, selectedClass, searchQuery])

  const handleViewDetail = async (a: StudentFeeAssignment) => {
    setIsDetailLoading(true)
    setShowDetail(true)
    const detail = await feeService.getStudentFeeDetail(a.studentId)
    setDetailStudent(detail)
    setIsDetailLoading(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Fees Management"
        description="View student fee assignments and payment history"
      />

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by student name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Combobox
              value={selectedClass}
              onValueChange={setSelectedClass}
              options={[{ value: 'all', label: 'All Classes' }, ...classes.map(c => ({ value: c.id, label: c.name }))]}
              placeholder="Filter by class"
              searchPlaceholder="Search classes…"
              emptyText="No classes found."
              className="w-48"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Student Fee Assignments ({filtered.length})</CardTitle>
          <CardDescription>Click a row to view full invoice and payment history</CardDescription>
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
                  <TableHead>Student</TableHead>
                  <TableHead>Academic Year</TableHead>
                  <TableHead className="text-right">Total Fee</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
                  <TableHead className="text-right">Net Amount</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <SkeletonTableRows rows={5} cols={9} />
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                      No students found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(a => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <p className="font-medium">{a.studentName ?? a.studentId.slice(-8)}</p>
                      </TableCell>
                      <TableCell className="text-sm">{a.academicYear}</TableCell>
                      <TableCell className="text-right font-medium">{money(a.totalFee)}</TableCell>
                      <TableCell className="text-right text-green-600">
                        {parseFloat(a.discountAmount) > 0 ? `-${money(a.discountAmount)}` : '—'}
                      </TableCell>
                      <TableCell className="text-right font-medium">{money(a.netAmount)}</TableCell>
                      <TableCell className="text-right text-green-600">{money(a.paidAmount)}</TableCell>
                      <TableCell className="text-right font-semibold text-orange-600">{money(a.balanceAmount)}</TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[a.status]}>{a.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => handleViewDetail(a)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
      </Card>

      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isDetailLoading ? 'Loading…' : detailStudent?.student.fullName ?? 'Student Detail'}
            </DialogTitle>
            <DialogDescription>
              {detailStudent && `${detailStudent.student.userCode} · ${detailStudent.student.className ?? ''}`}
            </DialogDescription>
          </DialogHeader>

          {isDetailLoading ? (
            <div className="space-y-3">{Array.from({length:5}).map((_,i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : detailStudent ? (
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Total Invoiced', value: `${money(detailStudent.summary.totalInvoiced)}`, color: 'text-blue-600' },
                  { label: 'Total Paid', value: `${money(detailStudent.summary.totalPaid)}`, color: 'text-green-600' },
                  { label: 'Discount', value: `${money(detailStudent.summary.totalDiscount)}`, color: 'text-purple-600' },
                  { label: 'Outstanding', value: `${money(detailStudent.summary.outstanding)}`, color: 'text-orange-600' },
                ].map(s => (
                  <div key={s.label} className="p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              <div>
                <h3 className="font-semibold mb-2">Invoices ({detailStudent.invoices.length})</h3>
                {detailStudent.invoices.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No invoices</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Paid</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailStudent.invoices.map((inv: FeeInvoice) => (
                        <TableRow key={inv.id}>
                          <TableCell className="font-mono text-sm">{inv.invoiceNo}</TableCell>
                          <TableCell className="text-sm">{inv.dueDate}</TableCell>
                          <TableCell className="text-right">{money(inv.netAmount)}</TableCell>
                          <TableCell className="text-right text-green-600">{money(inv.paidAmount)}</TableCell>
                          <TableCell className="text-right text-orange-600">{money(inv.balanceAmount)}</TableCell>
                          <TableCell>
                            <Badge className={INVOICE_STATUS_COLORS[inv.status] ?? ''}>{inv.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              <div>
                <h3 className="font-semibold mb-2">Payments ({detailStudent.payments.length})</h3>
                {detailStudent.payments.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No payments</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Reference</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailStudent.payments.map(p => (
                        <TableRow key={p.id}>
                          <TableCell className="text-sm">{p.paymentDate}</TableCell>
                          <TableCell><Badge variant="outline">{p.paymentMethod}</Badge></TableCell>
                          <TableCell className="text-right font-semibold text-green-600">{money(p.amount)}</TableCell>
                          <TableCell className="font-mono text-sm">{p.referenceNo ?? '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No detail found</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
