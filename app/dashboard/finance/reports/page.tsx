'use client'

import { useAuth } from '@/contexts/auth-context'
import { useEffect, useState, useCallback } from 'react'
import { financeService } from '@/lib/services/finance'
import type { FinanceTransaction, GlAccount, Budget } from '@/lib/services/finance'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Filter } from 'lucide-react'

function fmt(val: string | number | undefined): string {
  const n = parseFloat(String(val ?? 0))
  return isNaN(n) ? '0.00' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const TYPE_COLORS: Record<string, string> = {
  ASSET: 'bg-green-100 text-green-800',
  LIABILITY: 'bg-red-100 text-red-800',
  EQUITY: 'bg-purple-100 text-purple-800',
  INCOME: 'bg-blue-100 text-blue-800',
  EXPENSE: 'bg-orange-100 text-orange-800',
}

export default function FinancialReportsPage() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([])
  const [glAccounts, setGlAccounts] = useState<GlAccount[]>([])
  const [expenses, setExpenses] = useState<FinanceTransaction[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState({ from: '', to: '' })

  const loadData = useCallback(async () => {
    setIsLoading(true)
    const [txns, accts, expns, buds] = await Promise.all([
      financeService.getTransactions({ limit: 200 }),
      financeService.getGLAccounts(),
      financeService.getTransactions({ type: 'EXPENSE', limit: 200 }),
      financeService.getBudgets(),
    ])
    setTransactions(txns.data)
    setGlAccounts(accts)
    setExpenses(expns.data)
    setBudgets(buds)
    setIsLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const filteredTransactions = transactions.filter(t => {
    if (dateFilter.from && t.date < dateFilter.from) return false
    if (dateFilter.to && t.date > dateFilter.to) return false
    return true
  })

  const filteredExpenses = expenses.filter(e => {
    if (dateFilter.from && e.date < dateFilter.from) return false
    if (dateFilter.to && e.date > dateFilter.to) return false
    return true
  })

  const totalAssets = glAccounts.filter(a => a.type === 'ASSET').reduce((s, a) => s + parseFloat(a.balance || '0'), 0)
  const totalLiabilities = glAccounts.filter(a => a.type === 'LIABILITY').reduce((s, a) => s + parseFloat(a.balance || '0'), 0)
  const totalIncome = glAccounts.filter(a => a.type === 'INCOME').reduce((s, a) => s + parseFloat(a.balance || '0'), 0)
  const totalExpense = glAccounts.filter(a => a.type === 'EXPENSE').reduce((s, a) => s + parseFloat(a.balance || '0'), 0)
  const totalAllocated = budgets.reduce((s, b) => s + parseFloat(b.allocatedAmount), 0)

  if (isLoading) {
    return (
      <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Financial Reports</h1>
        <p className="text-muted-foreground">View financial statements and transaction history</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Assets</p>
            <p className="text-2xl font-bold text-blue-600">${fmt(totalAssets)}</p>
            <p className="text-xs text-muted-foreground mt-1">{glAccounts.filter(a => a.type === 'ASSET').length} accounts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Liabilities</p>
            <p className="text-2xl font-bold text-red-600">${fmt(totalLiabilities)}</p>
            <p className="text-xs text-muted-foreground mt-1">{glAccounts.filter(a => a.type === 'LIABILITY').length} accounts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Income</p>
            <p className="text-2xl font-bold text-green-600">${fmt(totalIncome)}</p>
            <p className="text-xs text-muted-foreground mt-1">{glAccounts.filter(a => a.type === 'INCOME').length} accounts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Expenses</p>
            <p className="text-2xl font-bold text-orange-600">${fmt(totalExpense)}</p>
            <p className="text-xs text-muted-foreground mt-1">{glAccounts.filter(a => a.type === 'EXPENSE').length} accounts</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="accounts" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="accounts">GL Accounts</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="budgets">Budgets</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts">
          <Card>
            <CardHeader>
              <CardTitle>General Ledger Accounts</CardTitle>
              <CardDescription>All active GL accounts and their balances</CardDescription>
            </CardHeader>
            <CardContent>
              {glAccounts.filter(a => a.isActive).length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No active accounts</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {glAccounts.filter(a => a.isActive).sort((a, b) => a.type.localeCompare(b.type)).map(a => (
                      <TableRow key={a.id}>
                        <TableCell className="font-mono font-semibold">{a.code}</TableCell>
                        <TableCell>{a.name}</TableCell>
                        <TableCell><Badge className={TYPE_COLORS[a.type]}>{a.type}</Badge></TableCell>
                        <TableCell className="text-right font-semibold">${fmt(a.balance)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>All journal entries and transactions</CardDescription>
              <div className="flex gap-4 mt-4">
                <div className="flex-1">
                  <Label className="text-xs">From Date</Label>
                  <Input type="date" value={dateFilter.from} onChange={e => setDateFilter(f => ({ ...f, from: e.target.value }))} />
                </div>
                <div className="flex-1">
                  <Label className="text-xs">To Date</Label>
                  <Input type="date" value={dateFilter.to} onChange={e => setDateFilter(f => ({ ...f, to: e.target.value }))} />
                </div>
                <div className="flex items-end">
                  <Button size="sm" variant="outline" onClick={() => setDateFilter({ from: '', to: '' })}>
                    <Filter className="h-4 w-4 mr-1" /> Clear
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredTransactions.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No transactions found</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map(t => (
                      <TableRow key={t.id}>
                        <TableCell className="text-sm">{t.date}</TableCell>
                        <TableCell><Badge variant="outline">{t.type}</Badge></TableCell>
                        <TableCell className="font-medium">{t.description}</TableCell>
                        <TableCell className="text-muted-foreground">{t.categoryAccount?.name ?? '—'}</TableCell>
                        <TableCell className="text-right font-semibold">${fmt(t.amount)}</TableCell>
                        <TableCell><Badge variant="outline">{t.status}</Badge></TableCell>
                        <TableCell className="font-mono text-sm">{t.reference}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses">
          <Card>
            <CardHeader>
              <CardTitle>Expense Summary</CardTitle>
              <CardDescription>All expense transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredExpenses.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No expenses found</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenses.map(e => (
                      <TableRow key={e.id}>
                        <TableCell className="text-sm">{e.date}</TableCell>
                        <TableCell className="max-w-xs truncate font-medium">{e.description}</TableCell>
                        <TableCell>{e.categoryAccount?.name ? <Badge variant="outline" className="text-xs">{e.categoryAccount.name}</Badge> : '—'}</TableCell>
                        <TableCell className="text-right font-semibold">${fmt(e.amount)}</TableCell>
                        <TableCell><Badge variant="outline">{e.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budgets">
          <Card>
            <CardHeader>
              <CardTitle>Budget Overview</CardTitle>
              <CardDescription>Budget allocation summary</CardDescription>
            </CardHeader>
            <CardContent>
              {budgets.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No budgets created</p>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-blue-50">
                      <p className="text-xs text-muted-foreground">Total Allocated</p>
                      <p className="text-lg font-bold text-blue-600">${fmt(totalAllocated)}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-50">
                      <p className="text-xs text-muted-foreground">Total Budgets</p>
                      <p className="text-lg font-bold">{budgets.length}</p>
                    </div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>GL Account</TableHead>
                        <TableHead className="text-right">Allocated</TableHead>
                        <TableHead>Start</TableHead>
                        <TableHead>End</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {budgets.map(b => (
                        <TableRow key={b.id}>
                          <TableCell className="font-medium">{b.name}</TableCell>
                          <TableCell className="font-mono text-sm">{b.glAccountId.slice(-8)}</TableCell>
                          <TableCell className="text-right font-semibold">${fmt(b.allocatedAmount)}</TableCell>
                          <TableCell>{b.startDate}</TableCell>
                          <TableCell>{b.endDate}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
