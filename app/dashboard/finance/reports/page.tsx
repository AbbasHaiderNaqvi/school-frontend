'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { financeService, type GlAccount } from '@/lib/services/finance'
import { PageHeader } from '@/components/layout/page-header'
import { AccessDenied } from '@/components/ui/access-denied'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ReportView } from '@/components/reports/report-view'
import { Loader2, RefreshCw, Scale, BookText, FileStack, TrendingUp, Landmark } from 'lucide-react'

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

export default function FinanceReportsPage() {
  const { can } = useAuth()
  const [activeTab, setActiveTab] = useState<ReportTab>('trial-balance')
  const [loadedTabs, setLoadedTabs] = useState<Set<ReportTab>>(new Set())

  const [glAccounts, setGlAccounts] = useState<GlAccount[]>([])

  // Trial balance
  const [trialAsOf, setTrialAsOf] = useState(todayStr())
  const [trialData, setTrialData] = useState<unknown>(null)
  const [trialLoading, setTrialLoading] = useState(false)

  // Ledger
  const [ledgerAccountId, setLedgerAccountId] = useState('')
  const [ledgerFrom, setLedgerFrom] = useState(firstOfMonthStr())
  const [ledgerTo, setLedgerTo] = useState(todayStr())
  const [ledgerData, setLedgerData] = useState<unknown>(null)
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
                <ReportView data={trialData} />
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
                <Select value={ledgerAccountId} onValueChange={setLedgerAccountId}>
                  <SelectTrigger id="ledger-account"><SelectValue placeholder="Select an account..." /></SelectTrigger>
                  <SelectContent>
                    {glAccounts.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <ReportView data={ledgerData} />
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
