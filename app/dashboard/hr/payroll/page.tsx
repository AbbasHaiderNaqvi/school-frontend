'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/layout/page-header'
import { AccessDenied } from '@/components/ui/access-denied'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
import { hrService } from '@/lib/services/hr'
import type { PayrollRecord, PayrollSummary, Employee } from '@/lib/services/hr'
import { DEFAULT_CURRENCY, money, fmt } from '@/lib/currency'
import { requiredError, numberError, hasNoErrors } from '@/lib/validation'
import { Plus, Trash2, Loader2, RefreshCw, DollarSign, Users, CheckCircle, BookCheck } from 'lucide-react'
import { SkeletonTableRows } from '@/components/ui/page-skeleton'
import { Skeleton } from '@/components/ui/skeleton'

function recordStatus(r: PayrollRecord): { label: string; cls: string } {
  if (r.isActive) return { label: 'Active', cls: 'bg-green-100 text-green-800' }
  if (r.postedToFinanceAt) return { label: 'Posted', cls: 'bg-blue-100 text-blue-800' }
  return { label: 'Inactive', cls: 'bg-gray-100 text-gray-600' }
}

type KVRow = { key: string; value: string }

const EMPTY_FORM = {
  employeeId: '',
  effectiveDate: '',
  basicSalary: '',
  allowances: [] as KVRow[],
  deductions: [] as KVRow[],
}

function sumKV(rows: KVRow[]) {
  return rows.reduce((s, r) => s + (parseFloat(r.value) || 0), 0)
}

function toRecord(rows: KVRow[]): Record<string, number> {
  return Object.fromEntries(
    rows.filter(r => r.key.trim() && parseFloat(r.value) > 0)
        .map(r => [r.key.trim(), parseFloat(r.value)])
  )
}

function kvLabel(key: string) {
  return key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()
}

export default function PayrollPage() {
  const { can } = useAuth()

  const [records, setRecords] = useState<PayrollRecord[]>([])
  const [total, setTotal] = useState(0)
  const [summary, setSummary] = useState<PayrollSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [employees, setEmployees] = useState<Employee[]>([])

  const [dialogOpen, setDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [kvErrors, setKvErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState(EMPTY_FORM)

  const [detailRecord, setDetailRecord] = useState<PayrollRecord | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const [result, sum] = await Promise.all([
        hrService.getPayroll({ limit: 200 }),
        hrService.getPayrollSummary().catch(() => null),
      ])
      setRecords(result.data)
      setTotal(result.total)
      setSummary(sum)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load payroll records.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    hrService.getEmployees({ limit: 500 }).then(r => setEmployees(r.data)).catch(() => {})
  }, [])

  useEffect(() => { loadData() }, [loadData])

  if (!can('hr.payroll.read')) return <AccessDenied />

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setSubmitError('')
    setFieldErrors({})
    setKvErrors({})
    setDialogOpen(true)
  }

  const setKV = (
    section: 'allowances' | 'deductions',
    idx: number,
    field: 'key' | 'value',
    val: string
  ) => {
    setForm(f => {
      const rows = [...f[section]]
      rows[idx] = { ...rows[idx], [field]: val }
      return { ...f, [section]: rows }
    })
  }

  const addKV = (section: 'allowances' | 'deductions') =>
    setForm(f => ({ ...f, [section]: [...f[section], { key: '', value: '' }] }))

  const removeKV = (section: 'allowances' | 'deductions', idx: number) =>
    setForm(f => ({ ...f, [section]: f[section].filter((_, i) => i !== idx) }))

  const previewNet =
    (parseFloat(form.basicSalary) || 0) + sumKV(form.allowances) - sumKV(form.deductions)

  const isValid = !!form.employeeId && !!form.effectiveDate && !!form.basicSalary

  const validate = (): boolean => {
    const errors: Record<string, string> = {}
    const employeeErr = requiredError(form.employeeId, 'Employee')
    if (employeeErr) errors.employeeId = employeeErr
    const effectiveDateErr = requiredError(form.effectiveDate, 'Effective date')
    if (effectiveDateErr) errors.effectiveDate = effectiveDateErr
    const basicSalaryErr = numberError(form.basicSalary, { required: true, min: 0, label: 'Basic salary' })
    if (basicSalaryErr) errors.basicSalary = basicSalaryErr

    const kErrors: Record<string, string> = {}
    ;(['allowances', 'deductions'] as const).forEach(section => {
      form[section].forEach((row, idx) => {
        if (!row.key.trim() && !row.value.trim()) return
        const valueErr = numberError(row.value, { required: true, min: 0, label: 'Amount' })
        if (valueErr) kErrors[`${section}-${idx}`] = valueErr
      })
    })

    setFieldErrors(errors)
    setKvErrors(kErrors)
    return hasNoErrors(errors) && hasNoErrors(kErrors)
  }

  const handleSave = async () => {
    if (!isValid || !validate()) return
    setIsSubmitting(true)
    setSubmitError('')
    const result = await hrService.createPayroll({
      employeeId: form.employeeId,
      effectiveDate: form.effectiveDate,
      basicSalary: parseFloat(form.basicSalary),
      allowances: toRecord(form.allowances),
      deductions: toRecord(form.deductions),
      currency: DEFAULT_CURRENCY.code,
    })
    if (result.error || !result.record) {
      setSubmitError(result.error || 'Operation failed')
      setIsSubmitting(false)
      return
    }
    setDialogOpen(false)
    setIsSubmitting(false)
    loadData()
  }

  const openDetail = async (r: PayrollRecord) => {
    setDetailRecord(r)
    setIsLoadingDetail(true)
    try {
      const full = await hrService.getPayrollById(r.id)
      if (full) setDetailRecord(full)
    } finally {
      setIsLoadingDetail(false)
    }
  }

  const activeRecords = records.filter(r => r.isActive)
  const postedRecords = records.filter(r => r.postedToFinanceAt)
  const totalBasic = summary?.totalBasicSalary ?? activeRecords.reduce((s, r) => s + r.basicSalary, 0)
  const totalNet = summary?.totalNetSalary ?? activeRecords.reduce((s, r) => s + r.netSalary, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll"
        description="Manage employee salary structures"
        action={
          can('hr.payroll.create') && (
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={loadData} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" /> Add Salary Structure
              </Button>
            </div>
          )
        }
      />

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Structures</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
            <p className="text-xs text-muted-foreground">{activeRecords.length} active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Basic</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{money(totalBasic)}</div>
            <p className="text-xs text-muted-foreground">active records only</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Net</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{money(totalNet)}</div>
            <p className="text-xs text-muted-foreground">active records only</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Posted to Finance</CardTitle>
            <BookCheck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{postedRecords.length}</div>
            <p className="text-xs text-muted-foreground">journal entries created</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Salary Structures ({total})</CardTitle>
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
                <TableHead>Employee</TableHead>
                <TableHead>Effective Date</TableHead>
                <TableHead className="text-right">Basic</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Net Salary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <SkeletonTableRows rows={5} cols={7} />
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No payroll records found.
                  </TableCell>
                </TableRow>
              ) : (
                records.map(r => {
                  const st = recordStatus(r)
                  return (
                    <TableRow key={r.id} className={r.isActive ? '' : 'opacity-60'}>
                      <TableCell>
                        <p className="font-medium text-sm">{r.employeeName ?? r.employeeId}</p>
                        <p className="text-xs text-muted-foreground">{r.employeeCode}{r.departmentName ? ` · ${r.departmentName}` : ''}</p>
                      </TableCell>
                      <TableCell className="text-sm">{r.effectiveDate}</TableCell>
                      <TableCell className="text-right text-sm">{money(r.basicSalary)}</TableCell>
                      <TableCell className="text-right text-sm text-green-700">{money(r.grossSalary)}</TableCell>
                      <TableCell className="text-right font-semibold text-sm">{money(r.netSalary)}</TableCell>
                      <TableCell>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st.cls}`}>
                          {st.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => openDetail(r)}>
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Salary Structure</DialogTitle>
            <DialogDescription>Define basic salary, allowances, and deductions for an employee.</DialogDescription>
          </DialogHeader>
          {submitError && (
            <Alert variant="destructive"><AlertDescription>{submitError}</AlertDescription></Alert>
          )}
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label>Employee <span className="text-destructive">*</span></Label>
                <Combobox
                  value={form.employeeId}
                  onValueChange={v => setForm(f => ({ ...f, employeeId: v }))}
                  options={employees.map(e => ({ value: e.id, label: `${e.firstName} ${e.lastName}`, keywords: e.email }))}
                  placeholder="Select employee"
                  searchPlaceholder="Search employees…"
                  emptyText="No employees found."
                  className={`mt-1 ${fieldErrors.employeeId ? 'border-destructive' : ''}`}
                />
                {fieldErrors.employeeId && <p className="text-xs text-destructive mt-1">{fieldErrors.employeeId}</p>}
              </div>
              <div>
                <Label>Effective Date <span className="text-destructive">*</span></Label>
                <Input
                  type="date"
                  value={form.effectiveDate}
                  onChange={e => setForm(f => ({ ...f, effectiveDate: e.target.value }))}
                  className={`mt-1 ${fieldErrors.effectiveDate ? 'border-destructive' : ''}`}
                />
                {fieldErrors.effectiveDate && <p className="text-xs text-destructive mt-1">{fieldErrors.effectiveDate}</p>}
              </div>
              <div>
                <Label>Basic Salary ({DEFAULT_CURRENCY.code}) <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  min={0}
                  value={form.basicSalary}
                  onChange={e => setForm(f => ({ ...f, basicSalary: e.target.value }))}
                  placeholder="e.g. 50000"
                  className={`mt-1 ${fieldErrors.basicSalary ? 'border-destructive' : ''}`}
                />
                {fieldErrors.basicSalary && <p className="text-xs text-destructive mt-1">{fieldErrors.basicSalary}</p>}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Allowances</h3>
                <Button type="button" variant="ghost" size="sm" onClick={() => addKV('allowances')}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-2">
                {form.allowances.map((row, i) => (
                  <div key={i}>
                    <div className="flex gap-2 items-center">
                      <Input
                        placeholder="Label (e.g. houseRent)"
                        value={row.key}
                        onChange={e => setKV('allowances', i, 'key', e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        min={0}
                        placeholder="Amount"
                        value={row.value}
                        onChange={e => setKV('allowances', i, 'value', e.target.value)}
                        className={`w-32 ${kvErrors[`allowances-${i}`] ? 'border-destructive' : ''}`}
                      />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeKV('allowances', i)}>
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                    {kvErrors[`allowances-${i}`] && <p className="text-xs text-destructive mt-1">{kvErrors[`allowances-${i}`]}</p>}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Deductions</h3>
                <Button type="button" variant="ghost" size="sm" onClick={() => addKV('deductions')}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-2">
                {form.deductions.map((row, i) => (
                  <div key={i}>
                    <div className="flex gap-2 items-center">
                      <Input
                        placeholder="Label (e.g. providentFund)"
                        value={row.key}
                        onChange={e => setKV('deductions', i, 'key', e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        min={0}
                        placeholder="Amount"
                        value={row.value}
                        onChange={e => setKV('deductions', i, 'value', e.target.value)}
                        className={`w-32 ${kvErrors[`deductions-${i}`] ? 'border-destructive' : ''}`}
                      />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeKV('deductions', i)}>
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                    {kvErrors[`deductions-${i}`] && <p className="text-xs text-destructive mt-1">{kvErrors[`deductions-${i}`]}</p>}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-muted px-4 py-3 flex justify-between text-sm font-medium">
              <span>Estimated Net Salary</span>
              <span>{DEFAULT_CURRENCY.symbol} {fmt(previewNet)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={isSubmitting || !isValid}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailRecord} onOpenChange={open => !open && setDetailRecord(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Salary Breakdown</DialogTitle>
            <DialogDescription>
              {detailRecord?.employeeName} — {detailRecord?.effectiveDate}
            </DialogDescription>
          </DialogHeader>
          {isLoadingDetail ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : detailRecord && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Basic Salary</span>
                <span className="font-medium">{money(detailRecord.basicSalary)}</span>
              </div>
              {Object.entries(detailRecord.allowances).map(([k, v]) => (
                <div key={k} className="flex justify-between text-green-700">
                  <span>+ {kvLabel(k)}</span>
                  <span>{money(v)}</span>
                </div>
              ))}
              {Object.entries(detailRecord.deductions).map(([k, v]) => (
                <div key={k} className="flex justify-between text-red-700">
                  <span>- {kvLabel(k)}</span>
                  <span>{money(v)}</span>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between">
                <span className="text-muted-foreground">Gross Salary</span>
                <span className="text-green-700 font-medium">{money(detailRecord.grossSalary)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Net Salary</span>
                <span>{money(detailRecord.netSalary)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between text-muted-foreground text-xs">
                <span>Status</span>
                <span className={`font-medium px-2 py-0.5 rounded-full ${recordStatus(detailRecord).cls}`}>
                  {recordStatus(detailRecord).label}
                </span>
              </div>
              {detailRecord.postedToFinanceAt && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Posted to Finance</span>
                  <span>{new Date(detailRecord.postedToFinanceAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
