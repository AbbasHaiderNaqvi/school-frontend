'use client'

import { useState, useEffect, useCallback } from 'react'
import { money } from '@/lib/currency'
import { useAuth } from '@/contexts/auth-context'
import { financeService, type GlAccount, type TrialBalanceRow, type LedgerRow } from '@/lib/services/finance'
import { PageHeader } from '@/components/layout/page-header'
import { AccessDenied } from '@/components/ui/access-denied'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Combobox } from '@/components/ui/combobox'
import { ReportView } from '@/components/reports/report-view'
import { Loader2, RefreshCw, Scale, BookText, FileStack, TrendingUp, Landmark, CheckCircle2, AlertTriangle } from 'lucide-react'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function firstOfMonthStr() {
  const d = new Date()
  d.setDate(1)
  return d.toISOString().slice(0, 10)
}

const TABS = ['trial-balance', 'ledger', 'statement', 'income-statement', 'balance-sheet'] as const
type ReportTab = typeof TABS[number]

function TrialBalanceReport({ rows, hideZero }: { rows: TrialBalanceRow[]; hideZero: boolean }) {
  const visible = hideZero
    ? rows.filter(r => parseFloat(r.debit) !== 0 || parseFloat(r.credit) !== 0)
    : rows
  const totalDebit = rows.reduce((s, r) => s + parseFloat(r.debit || '0'), 0)
  const totalCredit = rows.reduce((s, r) => s + parseFloat(r.credit || '0'), 0)
  const balanced = Math.abs(totalDebit - totalCredit) < 0.005

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-10">No data for this period.</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {balanced ? (
          <Badge className="bg-green-100 text-green-700 gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Balanced</Badge>
        ) : (
          <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Out of balance by {money(Math.abs(totalDebit - totalCredit))}</Badge>
        )}
        <span className="text-sm text-muted-foreground">{visible.length} of {rows.length} accounts shown</span>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Account</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map(r => (
              <TableRow key={r.glAccountId}>
                <TableCell className="font-mono text-sm">{r.code}</TableCell>
                <TableCell>{r.name}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">{parseFloat(r.debit) !== 0 ? money(r.debit) : '—'}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">{parseFloat(r.credit) !== 0 ? money(r.credit) : '—'}</TableCell>
              </TableRow>
            ))}
            <TableRow className="border-t-2 font-bold bg-muted/50">
              <TableCell colSpan={2}>Total</TableCell>
              <TableCell className="text-right font-mono tabular-nums">{money(totalDebit)}</TableCell>
              <TableCell className="text-right font-mono tabular-nums">{money(totalCredit)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function LedgerReport({ rows }: { rows: LedgerRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-10">No entries for this account in the selected period.</p>
  }

  const account = rows[0]
  const totalDebit = rows.reduce((s, r) => s + parseFloat(r.debit || '0'), 0)
  const totalCredit = rows.reduce((s, r) => s + parseFloat(r.credit || '0'), 0)

  let running = 0
  const withBalance = rows.map(r => {
    running += parseFloat(r.debit || '0') - parseFloat(r.credit || '0')
    return { ...r, runningBalance: running }
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="font-semibold">{account.code} — {account.name}</span>
        <span className="text-sm text-muted-foreground">{rows.length} entries</span>
        <span className="text-sm text-muted-foreground">Net movement: <span className={`font-mono font-medium ${running >= 0 ? 'text-green-600' : 'text-red-600'}`}>{money(running)}</span></span>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Entry No</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Memo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {withBalance.map((r, i) => (
              <TableRow key={`${r.journalEntryId}-${i}`}>
                <TableCell className="text-sm whitespace-nowrap">{r.date?.slice(0, 10)}</TableCell>
                <TableCell className="font-mono text-sm">{r.entryNo}</TableCell>
                <TableCell className="max-w-[280px] truncate" title={r.description}>{r.description}</TableCell>
                <TableCell className="max-w-[200px] truncate text-muted-foreground text-sm" title={r.memo ?? undefined}>{r.memo ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant={r.status === 'POSTED' ? 'default' : 'secondary'}>{r.status}</Badge>
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">{parseFloat(r.debit) !== 0 ? money(r.debit) : '—'}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">{parseFloat(r.credit) !== 0 ? money(r.credit) : '—'}</TableCell>
                <TableCell className={`text-right font-mono tabular-nums font-medium ${r.runningBalance < 0 ? 'text-red-600' : ''}`}>{money(r.runningBalance)}</TableCell>
              </TableRow>
            ))}
            <TableRow className="border-t-2 font-bold bg-muted/50">
              <TableCell colSpan={5}>Total</TableCell>
              <TableCell className="text-right font-mono tabular-nums">{money(totalDebit)}</TableCell>
              <TableCell className="text-right font-mono tabular-nums">{money(totalCredit)}</TableCell>
              <TableCell className={`text-right font-mono tabular-nums ${running < 0 ? 'text-red-600' : ''}`}>{money(running)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export default function FinanceReportsPage() {
  const { can } = useAuth()
  const [activeTab, setActiveTab] = useState<ReportTab>('trial-balance')
  const [loadedTabs, setLoadedTabs] = useState<Set<ReportTab>>(new Set())

  const [glAccounts, setGlAccounts] = useState<GlAccount[]>([])

  // Trial balance
  const [trialAsOf, setTrialAsOf] = useState(todayStr())
  const [trialData, setTrialData] = useState<TrialBalanceRow[] | null>(null)
  const [trialLoading, setTrialLoading] = useState(false)
  const [hideZero, setHideZero] = useState(true)

  // Ledger
  const [ledgerAccountId, setLedgerAccountId] = useState('')
  const [ledgerFrom, setLedgerFrom] = useState(firstOfMonthStr())
  const [ledgerTo, setLedgerTo] = useState(todayStr())
  const [ledgerData, setLedgerData] = useState<LedgerRow[] | null>(null)
  const [ledgerLoading, setLedgerLoading] = useState(false)

  // Statement
  const [statementFrom, setStatementFrom] = useState(firstOfMonthStr())
  const [statementTo, setStatementTo] = useState(todayStr())
  const [statementData, setStatementData] = useState<unknown>(null)
  const [statementLoading, setStatementLoading] = useState(false)

  // Income statement
  const [incomeFrom, setIncomeFrom] = useState(firstOfMonthStr())
  const [incomeTo, setIncomeTo] = useState(todayStr())
  const [incomeData, setIncomeData] = useState<unknown>(null)
  const [incomeLoading, setIncomeLoading] = useState(false)

  // Balance sheet
  const [balanceAsOf, setBalanceAsOf] = useState(todayStr())
  const [balanceData, setBalanceData] = useState<unknown>(null)
  const [balanceLoading, setBalanceLoading] = useState(false)

  useEffect(() => {
    financeService.getGLAccounts().then(setGlAccounts)
  }, [])

  const runTrialBalance = useCallback(async () => {
    setTrialLoading(true)
    setTrialData(await financeService.getTrialBalance({ asOf: trialAsOf || undefined }))
    setTrialLoading(false)
  }, [trialAsOf])

  const runLedger = useCallback(async () => {
    if (!ledgerAccountId) return
    setLedgerLoading(true)
    setLedgerData(await financeService.getLedger({ glAccountId: ledgerAccountId, from: ledgerFrom || undefined, to: ledgerTo || undefined }))
    setLedgerLoading(false)
  }, [ledgerAccountId, ledgerFrom, ledgerTo])

  const runStatement = useCallback(async () => {
    setStatementLoading(true)
    setStatementData(await financeService.getStatement({ from: statementFrom || undefined, to: statementTo || undefined }))
    setStatementLoading(false)
  }, [statementFrom, statementTo])

  const runIncomeStatement = useCallback(async () => {
    setIncomeLoading(true)
    setIncomeData(await financeService.getIncomeStatement({ from: incomeFrom || undefined, to: incomeTo || undefined }))
    setIncomeLoading(false)
  }, [incomeFrom, incomeTo])

  const runBalanceSheet = useCallback(async () => {
    setBalanceLoading(true)
    setBalanceData(await financeService.getBalanceSheet({ asOf: balanceAsOf || undefined }))
    setBalanceLoading(false)
  }, [balanceAsOf])

  // Lazily run each report the first time its tab is opened.
  useEffect(() => {
    if (loadedTabs.has(activeTab)) return
    setLoadedTabs(prev => new Set(prev).add(activeTab))
    if (activeTab === 'trial-balance') runTrialBalance()
    else if (activeTab === 'statement') runStatement()
    else if (activeTab === 'income-statement') runIncomeStatement()
    else if (activeTab === 'balance-sheet') runBalanceSheet()
    // Ledger needs an account first — left for the user to trigger explicitly.
  }, [activeTab, loadedTabs, runTrialBalance, runStatement, runIncomeStatement, runBalanceSheet])

  if (!can('finance.report.read')) return <AccessDenied />

  return (
    <div className="space-y-6">
      <PageHeader title="Financial Reports" description="Trial balance, ledger, and financial statements" />

      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as ReportTab)}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="trial-balance" className="gap-2"><Scale className="h-4 w-4" />Trial Balance</TabsTrigger>
          <TabsTrigger value="ledger" className="gap-2"><BookText className="h-4 w-4" />General Ledger</TabsTrigger>
          <TabsTrigger value="statement" className="gap-2"><FileStack className="h-4 w-4" />Statement</TabsTrigger>
          <TabsTrigger value="income-statement" className="gap-2"><TrendingUp className="h-4 w-4" />Income Statement</TabsTrigger>
          <TabsTrigger value="balance-sheet" className="gap-2"><Landmark className="h-4 w-4" />Balance Sheet</TabsTrigger>
        </TabsList>

        {/* Trial Balance */}
        <TabsContent value="trial-balance" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-6 flex flex-wrap items-end gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="trial-as-of">As of</Label>
                <Input id="trial-as-of" type="date" value={trialAsOf} onChange={e => setTrialAsOf(e.target.value)} className="w-44" />
              </div>
              <div className="flex items-center gap-2 pb-2">
                <Switch id="hide-zero" checked={hideZero} onCheckedChange={setHideZero} />
                <Label htmlFor="hide-zero" className="cursor-pointer">Hide zero balances</Label>
              </div>
              <Button onClick={runTrialBalance} disabled={trialLoading}>
                {trialLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Run Report
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              {trialLoading ? (
                <div className="flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : (
                <TrialBalanceReport rows={trialData ?? []} hideZero={hideZero} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* General Ledger */}
        <TabsContent value="ledger" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-6 flex flex-wrap items-end gap-4">
              <div className="space-y-1.5 min-w-[220px]">
                <Label htmlFor="ledger-account">GL Account</Label>
                <Combobox
                  value={ledgerAccountId}
                  onValueChange={setLedgerAccountId}
                  options={glAccounts.map(a => ({ value: a.id, label: `${a.code} — ${a.name}`, keywords: a.code }))}
                  placeholder="Select an account..."
                  searchPlaceholder="Search accounts…"
                  emptyText="No accounts found."
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ledger-from">From</Label>
                <Input id="ledger-from" type="date" value={ledgerFrom} onChange={e => setLedgerFrom(e.target.value)} className="w-44" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ledger-to">To</Label>
                <Input id="ledger-to" type="date" value={ledgerTo} onChange={e => setLedgerTo(e.target.value)} className="w-44" />
              </div>
              <Button onClick={runLedger} disabled={ledgerLoading || !ledgerAccountId}>
                {ledgerLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Run Report
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              {ledgerLoading ? (
                <div className="flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : !ledgerAccountId ? (
                <p className="text-sm text-muted-foreground text-center py-10">Select a GL account to view its ledger.</p>
              ) : (
                <LedgerReport rows={ledgerData ?? []} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statement */}
        <TabsContent value="statement" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-6 flex flex-wrap items-end gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="statement-from">From</Label>
                <Input id="statement-from" type="date" value={statementFrom} onChange={e => setStatementFrom(e.target.value)} className="w-44" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="statement-to">To</Label>
                <Input id="statement-to" type="date" value={statementTo} onChange={e => setStatementTo(e.target.value)} className="w-44" />
              </div>
              <Button onClick={runStatement} disabled={statementLoading}>
                {statementLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Run Report
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              {statementLoading ? (
                <div className="flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : (
                <ReportView data={statementData} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Income Statement */}
        <TabsContent value="income-statement" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-6 flex flex-wrap items-end gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="income-from">From</Label>
                <Input id="income-from" type="date" value={incomeFrom} onChange={e => setIncomeFrom(e.target.value)} className="w-44" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="income-to">To</Label>
                <Input id="income-to" type="date" value={incomeTo} onChange={e => setIncomeTo(e.target.value)} className="w-44" />
              </div>
              <Button onClick={runIncomeStatement} disabled={incomeLoading}>
                {incomeLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Run Report
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              {incomeLoading ? (
                <div className="flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : (
                <ReportView data={incomeData} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Balance Sheet */}
        <TabsContent value="balance-sheet" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-6 flex flex-wrap items-end gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="balance-as-of">As of</Label>
                <Input id="balance-as-of" type="date" value={balanceAsOf} onChange={e => setBalanceAsOf(e.target.value)} className="w-44" />
              </div>
              <Button onClick={runBalanceSheet} disabled={balanceLoading}>
                {balanceLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Run Report
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              {balanceLoading ? (
                <div className="flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : (
                <ReportView data={balanceData} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
