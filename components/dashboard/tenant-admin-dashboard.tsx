'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/layout/page-header'
import { StatCard } from '@/components/dashboard/stat-card'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  feeService, 
  employeeService, 
  taskService, 
  attendanceService,
  auditService 
} from '@/lib/services'
import { dashboardService } from '@/lib/services/dashboard'
import type { Task, AuditLog } from '@/lib/types'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import {
  Users,
  DollarSign,
  Clock,
  ListTodo,
  Activity,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'

export function TenantAdminDashboard() {
  const { user, tenant } = useAuth()
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    income: 0,
    expenses: 0,
    netIncome: 0,
    enabledFeatures: 0,
    // local fallback stats
    totalEmployees: 0,
    pendingFees: 0,
    totalCollected: 0,
    attendanceRate: 0,
    pendingTasks: 0,
    pendingLeaves: 0,
  })
  const [recentTasks, setRecentTasks] = useState<Task[]>([])
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      if (!user?.tenantId) return

      // Fetch real API summary alongside local data in parallel
      const [summary, feeStats, hrStats, taskStats, attendanceStats, tasks, logs] = await Promise.all([
        dashboardService.getSummary(),
        feeService.getFeeSummary(user.tenantId),
        employeeService.getHRStats(user.tenantId),
        taskService.getTaskStats(user.tenantId),
        attendanceService.getTodayStats(user.tenantId),
        taskService.getTasks(user.tenantId),
        auditService.getRecent(5, user.tenantId),
      ])

      setStats({
        // From real API
        totalUsers: summary?.users?.total ?? 0,
        activeUsers: summary?.users?.active ?? 0,
        income: parseFloat(summary?.finance?.income ?? '0'),
        expenses: parseFloat(summary?.finance?.expenses ?? '0'),
        netIncome: parseFloat(summary?.finance?.netIncome ?? '0'),
        enabledFeatures: summary?.features?.enabledCount ?? 0,
        // From local services (fallback / supplemental)
        totalEmployees: hrStats.totalEmployees || 0,
        pendingFees: feeStats.totalPending || 0,
        totalCollected: feeStats.totalCollected || 0,
        attendanceRate: Number.isFinite(attendanceStats.attendanceRate) ? attendanceStats.attendanceRate : 0,
        pendingTasks: (taskStats.pending || 0) + (taskStats.inProgress || 0),
        pendingLeaves: hrStats.pendingLeaves || 0,
      })
      setRecentTasks(tasks.slice(0, 5))
      setRecentLogs(logs)
      setIsLoading(false)
    }
    loadData()
  }, [user?.tenantId])

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'destructive'
      case 'high':
        return 'default'
      case 'medium':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title={`Welcome back, ${user?.name}`} 
          description={tenant?.name || 'Loading...'} 
        />
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
      <PageHeader 
        title={`Welcome back, ${user?.name}`} 
        description={tenant?.name || 'School Dashboard'} 
      />

      {/* Stats Grid */}
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    <StatCard
      title="Total Users"
      value={stats.totalUsers}
      description={`${stats.activeUsers} active`}
      icon={Users}
    />
    <StatCard
      title="Income"
      value={formatCurrency(stats.income)}
      description="This period"
      icon={TrendingUp}
    />
    <StatCard
      title="Expenses"
      value={formatCurrency(stats.expenses)}
      description={`Net: ${formatCurrency(stats.netIncome)}`}
      icon={DollarSign}
    />
    <StatCard
      title="Attendance Rate"
      value={`${stats.attendanceRate.toFixed(1)}%`}
      description={`${stats.enabledFeatures} features enabled`}
      icon={Clock}
    />
  </div>

      {/* Alerts */}
      {(stats.pendingLeaves > 0 || stats.pendingFees > 10000) && (
        <div className="grid gap-4 md:grid-cols-2">
          {stats.pendingLeaves > 0 && (
            <Card className="border-l-4 border-l-yellow-500">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">
                    {stats.pendingLeaves} Pending Leave Request{stats.pendingLeaves > 1 ? 's' : ''}
                  </p>
                  <p className="text-sm text-muted-foreground">Requires your approval</p>
                </div>
                <Link href="/dashboard/hr/leaves">
                  <Button variant="outline" size="sm">Review</Button>
                </Link>
              </CardContent>
            </Card>
          )}
          {stats.pendingFees > 10000 && (
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <DollarSign className="h-5 w-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">
                    {formatCurrency(stats.pendingFees)} Pending Fees
                  </p>
                  <p className="text-sm text-muted-foreground">Outstanding payments</p>
                </div>
                <Link href="/dashboard/fees/invoices">
                  <Button variant="outline" size="sm">View</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Tasks</CardTitle>
              <CardDescription>Tasks requiring attention</CardDescription>
            </div>
            <Link href="/dashboard/tasks">
              <Button variant="outline" size="sm">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No tasks found
                </p>
              ) : (
                recentTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border"
                  >
                    <div className="flex-1 min-w-0 mr-4">
                      <p className="font-medium text-foreground truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                          {task.priority}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Due {formatDate(task.dueDate)}
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant={
                        task.status === 'completed'
                          ? 'default'
                          : task.status === 'in_progress'
                          ? 'secondary'
                          : 'outline'
                      }
                    >
                      {task.status.replace('_', ' ')}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest actions in your school</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No recent activity
                </p>
              ) : (
                recentLogs.map((log) => (
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
            <Link href="/dashboard/attendance">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2 bg-transparent">
                <Clock className="h-5 w-5" />
                <span>Mark Attendance</span>
              </Button>
            </Link>
            <Link href="/dashboard/tasks">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2 bg-transparent">
                <ListTodo className="h-5 w-5" />
                <span>Create Task</span>
              </Button>
            </Link>
            <Link href="/dashboard/hr/employees">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2 bg-transparent">
                <Users className="h-5 w-5" />
                <span>Manage Staff</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
