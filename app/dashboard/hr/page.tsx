'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { employeeService } from '@/lib/services/hr'
import { useUser } from '@/lib/hooks/use-user'
import { Users, UserCheck, Clock, Briefcase, Calendar, AlertCircle } from 'lucide-react'

export default function HROverviewPage() {
  const { user } = useUser()
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    onLeave: 0,
    pendingLeaves: 0,
    openPositions: 0,
    newHires: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [user])

  const loadStats = async () => {
    if (!user?.tenantId) return

    try {
      setLoading(true)
      const [employees, leaves, jobs] = await Promise.all([
        employeeService.getEmployees(user.tenantId),
        employeeService.getLeaveRequests(user.tenantId),
        employeeService.getJobOpenings(user.tenantId),
      ])

      const activeEmployees = employees.filter(e => e.status === 'active')
      const onLeave = employees.filter(e => e.status === 'on_leave')
      const pendingLeaves = leaves.filter(l => l.status === 'pending')
      const openPositions = jobs.filter(j => j.status === 'open')
      
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const newHires = employees.filter(e => {
        const joinDate = new Date(e.joinDate)
        return joinDate >= thirtyDaysAgo
      })

      setStats({
        totalEmployees: employees.length,
        activeEmployees: activeEmployees.length,
        onLeave: onLeave.length,
        pendingLeaves: pendingLeaves.length,
        openPositions: openPositions.length,
        newHires: newHires.length,
      })
    } catch (error) {
      console.error('[v0] Error loading HR stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">HR & Employees Overview</h1>
          <p className="text-muted-foreground">Loading HR statistics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">HR & Employees Overview</h1>
        <p className="text-muted-foreground">Comprehensive view of workforce and HR activities</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmployees}</div>
            <p className="text-xs text-muted-foreground">All registered employees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeEmployees}</div>
            <p className="text-xs text-muted-foreground">Currently working</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Leave</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.onLeave}</div>
            <p className="text-xs text-muted-foreground">Employees on leave</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Leave Requests</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pendingLeaves}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Positions</CardTitle>
            <Briefcase className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.openPositions}</div>
            <p className="text-xs text-muted-foreground">Job openings available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Hires</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.newHires}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common HR tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <a href="/dashboard/hr/employees" className="block p-3 rounded-lg hover:bg-accent transition-colors">
              <div className="font-medium">Manage Employees</div>
              <div className="text-sm text-muted-foreground">View and update employee records</div>
            </a>
            <a href="/dashboard/hr/leaves" className="block p-3 rounded-lg hover:bg-accent transition-colors">
              <div className="font-medium">Leave Requests</div>
              <div className="text-sm text-muted-foreground">Review and approve leave applications</div>
            </a>
            <a href="/dashboard/hr/jobs" className="block p-3 rounded-lg hover:bg-accent transition-colors">
              <div className="font-medium">Job Openings</div>
              <div className="text-sm text-muted-foreground">Manage recruitment and positions</div>
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workforce Summary</CardTitle>
            <CardDescription>Current status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Active</span>
              <Badge className="bg-green-100 text-green-800">{stats.activeEmployees} employees</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">On Leave</span>
              <Badge className="bg-yellow-100 text-yellow-800">{stats.onLeave} employees</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Pending Approvals</span>
              <Badge className="bg-orange-100 text-orange-800">{stats.pendingLeaves} requests</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
