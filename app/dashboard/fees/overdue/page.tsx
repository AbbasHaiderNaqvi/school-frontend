'use client'

import { useState, useEffect, useCallback } from 'react'
import { money } from '@/lib/currency'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/layout/page-header'
import { AccessDenied } from '@/components/ui/access-denied'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SkeletonTableRows } from '@/components/ui/page-skeleton'
import { feeService, type FeeInvoice } from '@/lib/services/fee'
import { academicsService, type AcademicClass } from '@/lib/services/academics'
import { ACADEMIC_YEARS } from '@/lib/academic-years'
import { AlarmClock, RefreshCw, Loader2, AlertTriangle, Users } from 'lucide-react'

const ALL = '__all__'

// The defaulters endpoint's row shape isn't documented — render whatever
// columns come back, same dynamic-table pattern as finance/periods.
const HIDDEN_KEYS = new Set(['id', 'tenant_id', 'tenantId', 'student_id', 'studentId', 'class_id', 'classId'])

function humanizeKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, c => c.toUpperCase())
}

function looksLikeAmount(key: string): boolean {
  return /amount|balance|total|outstanding|due|paid|fee/i.test(key)
}

function formatCell(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (looksLikeAmount(key) && (typeof value === 'string' || typeof value === 'number') && !isNaN(parseFloat(String(value)))) {
    return money(value as string | number)
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export default function OverdueFeesPage() {
  const { can } = useAuth()

  const [invoices, setInvoices] = useState<FeeInvoice[]>([])
  const [total, setTotal] = useState(0)
  const [defaulters, setDefaulters] = useState<Record<string, unknown>[]>([])
  const [classes, setClasses] = useState<AcademicClass[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDefaultersLoading, setIsDefaultersLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [defaultersError, setDefaultersError] = useState('')

  const [classFilter, setClassFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')

  const [showApplyConfirm, setShowApplyConfirm] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [applyError, setApplyError] = useState('')
  const [applyResult, setApplyResult] = useState<{ processed: number; applied: number; skipped: number } | null>(null)

  const loadOverdue = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const result = await feeService.getOverdueInvoices({
        limit: 100,
        classId: classFilter || undefined,
        academicYear: yearFilter || undefined,
      })
      setInvoices(result.data)
      setTotal(result.total)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load overdue invoices.')
    } finally {
      setIsLoading(false)
    }
  }, [classFilter, yearFilter])

  const loadDefaulters = useCallback(async () => {
    setIsDefaultersLoading(true)
    setDefaultersError('')
    try {
      const rows = await feeService.getDefaulters({
        classId: classFilter || undefined,
        academicYear: yearFilter || undefined,
      })
      setDefaulters(rows)
    } catch (err) {
      setDefaultersError(err instanceof Error ? err.message : 'Failed to load defaulters.')
    } finally {
      setIsDefaultersLoading(false)
    }
  }, [classFilter, yearFilter])

  useEffect(() => {
    academicsService.getClasses({ limit: 200 }).then(res => setClasses(res.data)).catch(() => {})
  }, [])
  useEffect(() => { loadOverdue() }, [loadOverdue])
  useEffect(() => { loadDefaulters() }, [loadDefaulters])

  if (!can('fees.invoice.read')) return <AccessDenied />

  const handleApplyLateFees = async () => {
    setIsApplying(true)
    setApplyError('')
    setApplyResult(null)
    const result = await feeService.applyLateFees()
    setIsApplying(false)
    setShowApplyConfirm(false)
    if (result.error || !result.data) {
      setApplyError(result.error || 'Failed to apply late fees')
      return
    }
    setApplyResult(result.data)
    loadOverdue()
  }

  const totalOutstanding = invoices.reduce((s, i) => s + parseFloat(i.balanceAmount || '0'), 0)

  const defaulterColumns = Array.from(
    defaulters.reduce((set, row) => {
      Object.keys(row).forEach(k => { if (!HIDDEN_KEYS.has(k)) set.add(k) })
      return set
    }, new Set<string>())
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overdue & Late Fees"
        description="Overdue invoice management and late fee automation"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => { loadOverdue(); loadDefaulters() }} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            {can('fees.invoice.update') && (
              <Button onClick={() => { setApplyError(''); setShowApplyConfirm(true) }}>
                <AlarmClock className="mr-2 h-4 w-4" /> Apply Late Fees
              </Button>
            )}
          </div>
        }
      />

      {applyError && <Alert variant="destructive"><AlertDescription>{applyError}</AlertDescription></Alert>}
      {applyResult && (
        <Alert>
          <AlertDescription>
            Late fees run complete — processed {applyResult.processed}, applied {applyResult.applied}, skipped {applyResult.skipped}.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Overdue Invoices</p>
              <p className="text-2xl font-bold">{total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <Users className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Outstanding Balance</p>
              <p className="text-2xl font-bold">{money(totalOutstanding)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Combobox
          value={classFilter || ALL}
          onValueChange={v => setClassFilter(v === ALL ? '' : v)}
          options={[
            { value: ALL, label: 'All Classes' },
            ...classes.map(c => ({ value: c.id, label: c.name })),
          ]}
          placeholder="All Classes"
          searchPlaceholder="Search classes…"
          emptyText="No classes found."
          className="w-full sm:w-56"
        />
        <Select value={yearFilter || ALL} onValueChange={v => setYearFilter(v === ALL ? '' : v)}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="All Years" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Years</SelectItem>
            {ACADEMIC_YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="overdue">
        <TabsList>
          <TabsTrigger value="overdue">Overdue Invoices ({total})</TabsTrigger>
          <TabsTrigger value="defaulters">Defaulters ({defaulters.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overdue" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Overdue Invoices</CardTitle>
              <CardDescription>Invoices past their due date with an unpaid balance</CardDescription>
            </CardHeader>
            <CardContent>
              {loadError && <Alert variant="destructive" className="mb-4"><AlertDescription>{loadError}</AlertDescription></Alert>}
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <SkeletonTableRows rows={6} cols={8} />
                  ) : invoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                        <AlarmClock className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        No overdue invoices
                      </TableCell>
                    </TableRow>
                  ) : (
                    invoices.map(inv => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono text-sm">{inv.invoiceNo}</TableCell>
                        <TableCell className="font-medium">{inv.studentName ?? '—'}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{inv.className ?? '—'}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{inv.dueDate}</TableCell>
                        <TableCell className="text-right">{money(inv.totalAmount)}</TableCell>
                        <TableCell className="text-right text-green-600">{money(inv.paidAmount)}</TableCell>
                        <TableCell className="text-right font-semibold text-red-600">{money(inv.balanceAmount)}</TableCell>
                        <TableCell><Badge variant="destructive">{inv.status}</Badge></TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="defaulters" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Defaulters</CardTitle>
              <CardDescription>Students with outstanding overdue balances</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {defaultersError && <Alert variant="destructive" className="mb-4"><AlertDescription>{defaultersError}</AlertDescription></Alert>}
              {isDefaultersLoading ? (
                <Table>
                  <TableBody><SkeletonTableRows rows={6} cols={5} /></TableBody>
                </Table>
              ) : defaulters.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  No defaulters found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      {defaulterColumns.map(c => (
                        <TableHead key={c} className={looksLikeAmount(c) ? 'text-right' : ''}>{humanizeKey(c)}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {defaulters.map((row, i) => (
                      <TableRow key={(row.id as string) ?? i}>
                        {defaulterColumns.map(c => (
                          <TableCell key={c} className={looksLikeAmount(c) ? 'text-right font-medium' : 'text-sm'}>
                            {formatCell(c, row[c])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Apply Late Fees confirmation */}
      <AlertDialog open={showApplyConfirm} onOpenChange={setShowApplyConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply late fees to overdue invoices?</AlertDialogTitle>
            <AlertDialogDescription>
              This runs the late-fee automation using the rules configured in Fee Settings (type, amount, grace days, cap).
              Invoices already charged are skipped — the run is safe to repeat.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isApplying}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApplyLateFees} disabled={isApplying}>
              {isApplying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Apply Late Fees
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
