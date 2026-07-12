'use client'

import { useState, useEffect, useCallback } from 'react'
import { money } from '@/lib/currency'
import { useAuth } from '@/contexts/auth-context'
import { financeService, type FiscalPeriod } from '@/lib/services/finance'
import { PageHeader } from '@/components/layout/page-header'
import { AccessDenied } from '@/components/ui/access-denied'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { OverviewPageSkeleton } from '@/components/ui/page-skeleton'
import { Lock, LockOpen, Loader2, CalendarClock } from 'lucide-react'

// No sample response shape was given for /finance/periods, so rather than
// guess field names, this renders whatever keys actually come back — same
// approach as components/reports/report-view.tsx.

function humanizeKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/^./, c => c.toUpperCase())
    .trim()
}

const AMOUNT_HINTS = ['amount', 'balance', 'total', 'income', 'expense']

function looksLikeAmount(key: string): boolean {
  const k = key.toLowerCase()
  return AMOUNT_HINTS.some(h => k.includes(h))
}

function looksLikeDate(key: string, value: unknown): boolean {
  if (typeof value !== 'string') return false
  const k = key.toLowerCase()
  return (k.includes('date') || k.endsWith('at')) && !isNaN(Date.parse(value))
}

function formatCell(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (looksLikeDate(key, value)) return new Date(value as string).toLocaleDateString()
  if (looksLikeAmount(key) && (typeof value === 'string' || typeof value === 'number')) return money(value as string | number)
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

const STATUS_KEYS = ['status', 'state']
const CLOSED_BOOL_KEYS = ['isClosed', 'is_closed', 'closed']
const HIDDEN_KEYS = new Set(['id', 'name', 'label', 'periodName', 'title', ...STATUS_KEYS, ...CLOSED_BOOL_KEYS])

function isPeriodClosed(row: FiscalPeriod): boolean {
  for (const key of STATUS_KEYS) {
    const v = row[key]
    if (typeof v === 'string') return v.toUpperCase() === 'CLOSED'
  }
  for (const key of CLOSED_BOOL_KEYS) {
    const v = row[key]
    if (typeof v === 'boolean') return v
  }
  return false
}

function periodLabel(row: FiscalPeriod): string {
  for (const key of ['name', 'label', 'periodName', 'title']) {
    const v = row[key]
    if (typeof v === 'string' && v) return v
  }
  if (row.year && row.month) return `${row.year}-${String(row.month).padStart(2, '0')}`
  if (typeof row.startDate === 'string') return row.startDate
  if (typeof row.start_date === 'string') return row.start_date
  return String(row.id)
}

export default function FiscalPeriodsPage() {
  const { can } = useAuth()
  const [periods, setPeriods] = useState<FiscalPeriod[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')

  const loadPeriods = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const data = await financeService.getPeriods()
      setPeriods(data)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load fiscal periods.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadPeriods() }, [loadPeriods])

  const handleClose = async (p: FiscalPeriod) => {
    if (!confirm(`Close "${periodLabel(p)}"? No further transactions can be posted to it until reopened.`)) return
    setActionLoadingId(p.id)
    setActionError('')
    const result = await financeService.closePeriod(p.id)
    setActionLoadingId(null)
    if (!result.success) { setActionError(result.error || 'Failed to close period'); return }
    await loadPeriods()
  }

  const handleReopen = async (p: FiscalPeriod) => {
    if (!confirm(`Reopen "${periodLabel(p)}"? This allows new transactions to be posted to it again.`)) return
    setActionLoadingId(p.id)
    setActionError('')
    const result = await financeService.reopenPeriod(p.id)
    setActionLoadingId(null)
    if (!result.success) { setActionError(result.error || 'Failed to reopen period'); return }
    await loadPeriods()
  }

  if (!can('finance.period.read')) return <AccessDenied />

  if (isLoading) return <OverviewPageSkeleton />

  const columns = Array.from(
    periods.reduce((set, row) => {
      Object.keys(row).forEach(k => { if (!HIDDEN_KEYS.has(k)) set.add(k) })
      return set
    }, new Set<string>())
  )

  return (
    <div className="space-y-6">
      <PageHeader title="Fiscal Periods" description="Open and close accounting periods to control when transactions can be posted" />

      {loadError && <Alert variant="destructive"><AlertDescription>{loadError}</AlertDescription></Alert>}
      {actionError && <Alert variant="destructive"><AlertDescription>{actionError}</AlertDescription></Alert>}

      <Card>
        <CardContent className="pt-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                {columns.map(c => (
                  <TableHead key={c} className={looksLikeAmount(c) ? 'text-right' : ''}>{humanizeKey(c)}</TableHead>
                ))}
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {periods.map(p => {
                const closed = isPeriodClosed(p)
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{periodLabel(p)}</TableCell>
                    {columns.map(c => (
                      <TableCell key={c} className={looksLikeAmount(c) ? 'text-right' : ''}>{formatCell(c, p[c])}</TableCell>
                    ))}
                    <TableCell>
                      <Badge variant={closed ? 'outline' : 'default'}>{closed ? 'Closed' : 'Open'}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {closed
                        ? can('finance.period.reopen') && (
                            <Button variant="outline" size="sm" onClick={() => handleReopen(p)} disabled={actionLoadingId === p.id}>
                              {actionLoadingId === p.id ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <LockOpen className="h-3.5 w-3.5 mr-1.5" />}
                              Reopen
                            </Button>
                          )
                        : can('finance.period.close') && (
                            <Button variant="outline" size="sm" onClick={() => handleClose(p)} disabled={actionLoadingId === p.id}>
                              {actionLoadingId === p.id ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Lock className="h-3.5 w-3.5 mr-1.5" />}
                              Close
                            </Button>
                          )}
                    </TableCell>
                  </TableRow>
                )
              })}
              {periods.length === 0 && (
                <TableRow>
                  <TableCell colSpan={columns.length + 3} className="text-center text-muted-foreground py-12">
                    <CalendarClock className="mx-auto h-10 w-10 text-muted-foreground/50 mb-2" />
                    No fiscal periods found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
