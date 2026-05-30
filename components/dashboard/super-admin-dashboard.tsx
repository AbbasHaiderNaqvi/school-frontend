'use client'

import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { StatCard } from '@/components/dashboard/stat-card'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { tenantService, auditService } from '@/lib/services'
import { dashboardService, type DashboardSummary } from '@/lib/services/dashboard'
import type { Tenant, AuditLog } from '@/lib/types'
import { formatDateTime } from '@/lib/utils'
import {
  Building2,
  Users,
  DollarSign,
  Activity,
  Plus,
  CheckCircle,
  XCircle,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'

export function SuperAdminDashboard() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([])
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      const [tenantsData, logsData, summaryData] = await Promise.all([
        tenantService.getAll(),
        auditService.getRecent(10),
        dashboardService.getSummary(),
      ])
      setTenants(tenantsData)
      setRecentLogs(logsData)
      setSummary(summaryData)
      setIsLoading(false)
    }
    loadData()
  }, [])

  const stats = {
    totalTenants: tenants.length,
    activeTenants: tenants.filter((t) => t.isActive).length,
    inactiveTenants: tenants.filter((t) => !t.isActive).length,
    totalUsers: summary?.users?.total ?? 0,
    activeUsers: summary?.users?.active ?? 0,
    income: parseFloat(summary?.finance?.income ?? '0'),
    expenses: parseFloat(summary?.finance?.expenses ?? '0'),
    netIncome: parseFloat(summary?.finance?.netIncome ?? '0'),
    enabledFeatures: summary?.features?.enabledCount ?? 0,
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Super Admin Dashboard" description="System overview and management" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
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

  return (
    <div className="space-y-6">
      <PageHeader title="Super Admin Dashboard" description="System overview and management">
        <Link href="/dashboard/tenants">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Tenant
          </Button>
        </Link>
      </PageHeader>

      {/* Stats Grid */}
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    <StatCard
      title="Total Users"
      value={stats.totalUsers}
      description={`${stats.activeUsers} active · ${summary?.users?.invited ?? 0} invited`}
      icon={Users}
    />
    <StatCard
      title="Income"
      value={`$${stats.income.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
      description="This period"
      icon={DollarSign}
    />
    <StatCard
      title="Expenses"
      value={`$${stats.expenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
      description={`Net: $${stats.netIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
      icon={Activity}
    />
    <StatCard
      title="Active Tenants"
      value={stats.activeTenants}
      description={`${stats.totalTenants} total · ${stats.enabledFeatures} features on`}
      icon={Building2}
    />
  </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tenants Overview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Tenants Overview</CardTitle>
              <CardDescription>All registered schools</CardDescription>
            </div>
            <Link href="/dashboard/tenants">
              <Button variant="outline" size="sm">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tenants.slice(0, 5).map((tenant) => (
                <div
                  key={tenant.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{tenant.name}</p>
                      <p className="text-sm text-muted-foreground">{tenant.subdomain}.mudir.com</p>
                    </div>
                  </div>
                  <Badge variant={tenant.isActive ? 'default' : 'secondary'}>
                    {tenant.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest system actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No recent activity
                </p>
              ) : (
                recentLogs.slice(0, 6).map((log) => (
                  <div key={log.id} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mt-0.5">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">
                        <span className="font-medium">{log.userName}</span>{' '}
                        <span className="text-muted-foreground">{log.action.toLowerCase()}</span>{' '}
                        <span className="font-medium">{log.entity}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDateTime(log.timestamp)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feature Flags Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Management</CardTitle>
          <CardDescription>Module availability per tenant</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                    Tenant
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
                    Finance
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
                    HR
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
                    Inventory
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
                    Tasks
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
                    Attendance
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
                    Fees
                  </th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="border-b border-border last:border-0">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{tenant.name}</span>
                        {!tenant.isActive && (
                          <Badge variant="secondary" className="text-xs">
                            Inactive
                          </Badge>
                        )}
                      </div>
                    </td>
                    {(['finance_module', 'hr_module', 'inventory_module', 'task_module', 'attendance_module', 'fee_module'] as const).map(
                      (feature) => (
                        <td key={feature} className="text-center py-3 px-4">
                          {tenant.features[feature] ? (
                            <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                          ) : (
                            <XCircle className="h-5 w-5 text-muted-foreground/50 mx-auto" />
                          )}
                        </td>
                      )
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
