'use client'

import { money } from '@/lib/currency'
import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/layout/page-header'
import { StatCard } from '@/components/dashboard/stat-card'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { financeService } from '@/lib/services/finance'
import type { GlAccount, FinanceOverview } from '@/lib/services/finance'
import { DollarSign, TrendingUp, TrendingDown, Wallet, ArrowRight, PieChart } from 'lucide-react'
import { OverviewPageSkeleton } from '@/components/ui/page-skeleton'
import Link from 'next/link'

function fmt(val: string | number | undefined): string {
  const n = parseFloat(String(val ?? 0))
  return isNaN(n) ? '0.00' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function FinanceOverviewPage() {
  const { user } = useAuth()
  const [overview, setOverview] = useState<FinanceOverview | null>(null)
  const [accounts, setAccounts] = useState<GlAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setLoadError('')
      try {
        const [ov, accs] = await Promise.all([
          financeService.getOverview(),
          financeService.getGLAccounts(),
        ])
        setOverview(ov)
        setAccounts(accs)
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load data. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [user?.tenantId])

  if (isLoading) {
    return <OverviewPageSkeleton />
  }

  const totalIncome = parseFloat(overview?.totalIncome ?? '0')
  const totalExpense = parseFloat(overview?.totalExpense ?? '0')
  const netBalance = parseFloat(overview?.netBalance ?? '0')
  const cashBalance = parseFloat(overview?.cashBalance ?? '0')
  const pendingCount = overview?.pendingApprovalCount ?? 0
  const totalForBar = totalIncome + totalExpense || 1

  const assetAccounts = accounts.filter(a => a.type === 'ASSET')
  const incomeAccounts = accounts.filter(a => a.type === 'INCOME')
  const expenseAccounts = accounts.filter(a => a.type === 'EXPENSE')

  return (
    <div className="space-y-6">
      <PageHeader title="Finance Overview" description="Financial summary and reports" />

      {loadError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Income" value={`${money(totalIncome)}`} description="Revenue collected" icon={TrendingUp} />
        <StatCard title="Total Expenses" value={`${money(totalExpense)}`} description="Money spent" icon={TrendingDown} />
        <StatCard title="Net Balance" value={`${money(netBalance)}`} description={netBalance >= 0 ? 'Surplus' : 'Deficit'} icon={Wallet} />
        <StatCard title="Cash Balance" value={`${money(cashBalance)}`} description="Available cash" icon={DollarSign} />
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { href: '/dashboard/finance/gl', icon: PieChart, label: 'General Ledger', sub: `${accounts.length} accounts` },
          { href: '/dashboard/finance/transactions-flow', icon: ArrowRight, label: 'Transactions', sub: 'Record entries' },
          { href: '/dashboard/finance/expenses', icon: TrendingDown, label: 'Expenses', sub: `${pendingCount} pending` },
          { href: '/dashboard/finance/budgets', icon: Wallet, label: 'Budgets', sub: 'Track spending' },
        ].map(({ href, icon: Icon, label, sub }) => (
          <Link key={href} href={href}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><Icon className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="font-medium text-foreground">{label}</p>
                  <p className="text-sm text-muted-foreground">{sub}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Asset Accounts */}
        <Card>
          <CardHeader>
            <CardTitle>Asset Accounts</CardTitle>
            <CardDescription>Cash and receivables</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {assetAccounts.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No asset accounts</p>}
              {assetAccounts.map(a => (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div><p className="font-medium">{a.name}</p><p className="text-xs text-muted-foreground">{a.code}</p></div>
                  <span className="font-bold text-green-600">{money(a.balance)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Income vs Expense */}
        <Card>
          <CardHeader>
            <CardTitle>Income vs Expenses</CardTitle>
            <CardDescription>Revenue and spending breakdown</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-1 text-sm"><span>Income</span><span className="text-green-600">{money(totalIncome)}</span></div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: `${(totalIncome / totalForBar) * 100}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1 text-sm"><span>Expenses</span><span className="text-red-600">{money(totalExpense)}</span></div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-red-500 rounded-full" style={{ width: `${(totalExpense / totalForBar) * 100}%` }} />
              </div>
            </div>
            <div className="pt-3 border-t flex justify-between font-medium">
              <span>Net Balance</span>
              <span className={netBalance >= 0 ? 'text-green-600' : 'text-red-600'}>{money(netBalance)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Income Sources */}
        <Card>
          <CardHeader><CardTitle>Income Sources</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {incomeAccounts.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No income accounts</p>}
              {incomeAccounts.map(a => (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div><p className="font-medium">{a.name}</p><p className="text-xs text-muted-foreground">{a.code}</p></div>
                  <span className="font-bold text-blue-600">{money(a.balance)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Expense Categories */}
        <Card>
          <CardHeader><CardTitle>Expense Categories</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {expenseAccounts.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No expense accounts</p>}
              {expenseAccounts.map(a => (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div><p className="font-medium">{a.name}</p><p className="text-xs text-muted-foreground">{a.code}</p></div>
                  <span className="font-bold text-orange-600">{money(a.balance)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
