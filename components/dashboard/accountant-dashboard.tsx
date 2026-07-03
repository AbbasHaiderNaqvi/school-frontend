'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/layout/page-header'
import { StatCard } from '@/components/dashboard/stat-card'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { feeService, financeService } from '@/lib/services'
import type { Invoice } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Receipt,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'

export function AccountantDashboard() {
  const { user, tenant } = useAuth()
  const [feeStats, setFeeStats] = useState({
    totalCollected: 0,
    totalPending: 0,
    totalOverdue: 0,
    overdueCount: 0,
  })
  const [financeStats, setFinanceStats] = useState({
    totalAssets: 0,
    totalLiabilities: 0,
    totalIncome: 0,
    totalExpenses: 0,
    netIncome: 0,
  })
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      if (!user?.tenantId) return

      const [feeData, financeData, invoices] = await Promise.all([
        feeService.getFeeSummary(user.tenantId),
        financeService.getFinancialSummary(user.tenantId),
        feeService.getInvoices(user.tenantId),
      ])

      setFeeStats({
        totalCollected: feeData.totalCollected || 0,
        totalPending: feeData.totalPending || 0,
        totalOverdue: feeData.totalOverdue || 0,
        overdueCount: feeData.overdueCount || 0,
      })
      setFinanceStats({
        totalAssets: financeData.totalAssets || 0,
        totalLiabilities: financeData.totalLiabilities || 0,
        totalIncome: financeData.totalIncome || 0,
        totalExpenses: financeData.totalExpenses || 0,
        netIncome: financeData.netIncome || 0,
      })
      setRecentInvoices(invoices.slice(0, 5))
      setIsLoading(false)
    }
    loadData()
  }, [user?.tenantId])

  const getStatusColor = (status: Invoice['status']) => {
    switch (status) {
      case 'paid':
        return 'default'
      case 'partial':
        return 'secondary'
      case 'overdue':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-52" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[0, 1].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-36" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Skeleton key={j} className="h-12 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Finance Dashboard" 
        description={tenant?.name || 'Financial Overview'} 
      />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Collected"
          value={formatCurrency(feeStats.totalCollected)}
          description="Fee payments received"
          icon={DollarSign}
        />
        <StatCard
          title="Pending Fees"
          value={formatCurrency(feeStats.totalPending)}
          description="Outstanding amount"
          icon={Receipt}
        />
        <StatCard
          title="Net Income"
          value={formatCurrency(financeStats.netIncome)}
          description="Income - Expenses"
          icon={financeStats.netIncome >= 0 ? TrendingUp : TrendingDown}
        />
        <StatCard
          title="Overdue Invoices"
          value={feeStats.overdueCount}
          description={formatCurrency(feeStats.totalOverdue)}
          icon={AlertTriangle}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Invoices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Invoices</CardTitle>
              <CardDescription>Latest fee invoices</CardDescription>
            </div>
            <Link href="/dashboard/fees/invoices">
              <Button variant="outline" size="sm">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border"
                >
                  <div>
                    <p className="font-medium text-foreground">{invoice.studentName}</p>
                    <p className="text-sm text-muted-foreground">
                      {invoice.className} - Due {formatDate(invoice.dueDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-foreground">
                      {formatCurrency(invoice.totalAmount)}
                    </p>
                    <Badge variant={getStatusColor(invoice.status)} className="mt-1">
                      {invoice.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Financial Summary</CardTitle>
            <CardDescription>Overview of accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950/30">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-foreground">Total Assets</span>
                </div>
                <span className="font-bold text-green-600">
                  {formatCurrency(financeStats.totalAssets)}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-950/30">
                <div className="flex items-center gap-3">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  <span className="font-medium text-foreground">Total Liabilities</span>
                </div>
                <span className="font-bold text-red-600">
                  {formatCurrency(financeStats.totalLiabilities)}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-foreground">Total Income</span>
                </div>
                <span className="font-bold text-blue-600">
                  {formatCurrency(financeStats.totalIncome)}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30">
                <div className="flex items-center gap-3">
                  <Receipt className="h-5 w-5 text-orange-600" />
                  <span className="font-medium text-foreground">Total Expenses</span>
                </div>
                <span className="font-bold text-orange-600">
                  {formatCurrency(financeStats.totalExpenses)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <Link href="/dashboard/fees/invoices">
              <Button variant="outline" className="w-full bg-transparent">Record Payment</Button>
            </Link>
            <Link href="/dashboard/finance/expenses">
              <Button variant="outline" className="w-full bg-transparent">Add Expense</Button>
            </Link>
            <Link href="/dashboard/finance/transactions">
              <Button variant="outline" className="w-full bg-transparent">New Transaction</Button>
            </Link>
            <Link href="/dashboard/finance">
              <Button variant="outline" className="w-full bg-transparent">View Reports</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
