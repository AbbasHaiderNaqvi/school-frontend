'use client'

import { money } from '@/lib/currency'
import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/layout/page-header'
import { StatCard } from '@/components/dashboard/stat-card'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { dashboardService } from '@/lib/services/dashboard'
import type { DashboardSummary } from '@/lib/services/dashboard'
import { feeService } from '@/lib/services/fee'
import type { FeeDashboardSummary } from '@/lib/services/fee'
import { auditService } from '@/lib/services/audit'
import type { AuditLog } from '@/lib/services/audit'
import {
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  ArrowRight,
  Clock,
  ListTodo,
} from 'lucide-react'
import Link from 'next/link'

function fmt(val: string | number | undefined): string {
  const n = parseFloat(String(val ?? 0))
  return isNaN(n) ? '0.00' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function TenantAdminDashboard() {
  const { user, tenant } = useAuth()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [feeSummary, setFeeSummary] = useState<FeeDashboardSummary | null>(null)
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      const [s, f, logs] = await Promise.all([
        dashboardService.getSummary(),
        feeService.getDashboardSummary(),
        auditService.getPlatformLogs({ limit: 5 }),
      ])
      setSummary(s)
      setFeeSummary(f)
      setRecentLogs(logs.data)
      setIsLoading(false)
    }
    loadData()
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={`Welcome back, ${user?.name}`}
          description={tenant?.name || 'Loading...'}
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const netIncome = parseFloat(summary?.finance?.netIncome ?? '0')

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${user?.name}`}
        description={tenant?.name || 'School Dashboard'}
      />

      {/* Top stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={summary?.users?.total ?? 0}
          description={`${summary?.users?.active ?? 0} active · ${summary?.users?.invited ?? 0} invited`}
          icon={Users}
        />
        <StatCard
          title="Income"
          value={`${money(summary?.finance?.income)}`}
          description="This period"
          icon={TrendingUp}
        />
        <StatCard
          title="Expenses"
          value={`${money(summary?.finance?.expenses)}`}
          description={`Net: ${netIncome >= 0 ? '+' : ''}${money(netIncome)}`}
          icon={TrendingDown}
        />
        <StatCard
          title="Features Enabled"
          value={summary?.features?.enabledCount ?? 0}
          description={`${summary?.features?.disabledCount ?? 0} disabled`}
          icon={Zap}
        />
      </div>

      {/* Fee summary */}
      {feeSummary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Invoiced</p>
              <p className="text-2xl font-bold text-blue-600">{money(feeSummary.totalInvoiced)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Collected</p>
              <p className="text-2xl font-bold text-green-600">{money(feeSummary.totalCollected)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Outstanding</p>
              <p className="text-2xl font-bold text-orange-600">{money(feeSummary.totalOutstanding)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Collection Rate</p>
              <p className="text-2xl font-bold text-purple-600">{fmt(feeSummary.collectionRate)}%</p>
              {parseFloat(feeSummary.totalOverdue) > 0 && (
                <p className="text-xs text-red-500 mt-1">Overdue: {money(feeSummary.totalOverdue)}</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest actions in your school</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
              ) : (
                recentLogs.map(log => (
                  <div key={log.id} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mt-0.5 flex-shrink-0">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">
                        <span className="font-medium">{log.actorUserId ? log.actorUserId.slice(-8) : 'System'}</span>{' '}
                        <span className="text-muted-foreground">{log.action.toLowerCase().replace(/_/g, ' ')}</span>
                        {log.entityType && (
                          <> <span className="font-medium">{log.entityType}</span></>
                        )}
                      </p>
                      {log.module && (
                        <Badge variant="outline" className="text-xs mt-1">{log.module}</Badge>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(log.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* User summary */}
        <Card>
          <CardHeader>
            <CardTitle>User Overview</CardTitle>
            <CardDescription>Account status breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { label: 'Active Users', value: summary?.users?.active ?? 0, color: 'bg-green-500', textColor: 'text-green-700' },
                { label: 'Invited (Pending)', value: summary?.users?.invited ?? 0, color: 'bg-yellow-500', textColor: 'text-yellow-700' },
                { label: 'Inactive Users', value: summary?.users?.inactive ?? 0, color: 'bg-gray-400', textColor: 'text-gray-600' },
              ].map(row => {
                const total = summary?.users?.total || 1
                const pct = Math.round((row.value / total) * 100)
                return (
                  <div key={row.label} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{row.label}</span>
                      <span className={`font-semibold ${row.textColor}`}>{row.value} <span className="text-muted-foreground font-normal">({pct}%)</span></span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full ${row.color} rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
              <Link href="/dashboard/users">
                <Button variant="outline" size="sm" className="w-full mt-2">
                  Manage Users <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <Link href="/dashboard/fees/invoices">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2 bg-transparent">
                <DollarSign className="h-5 w-5" />
                <span>Record Payment</span>
              </Button>
            </Link>
            <Link href="/dashboard/fees/students">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2 bg-transparent">
                <Users className="h-5 w-5" />
                <span>Student Fees</span>
              </Button>
            </Link>
            <Link href="/dashboard/finance/cashier">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2 bg-transparent">
                <Clock className="h-5 w-5" />
                <span>Finance Entry</span>
              </Button>
            </Link>
            <Link href="/dashboard/users">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2 bg-transparent">
                <ListTodo className="h-5 w-5" />
                <span>Manage Users</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
