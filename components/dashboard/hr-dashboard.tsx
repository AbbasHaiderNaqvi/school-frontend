'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/layout/page-header'
import { StatCard } from '@/components/dashboard/stat-card'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { employeeService, attendanceService } from '@/lib/services'
import type { Employee, LeaveRequest, JobOpening } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import {
  Users,
  UserPlus,
  Calendar,
  Clock,
  Briefcase,
  AlertCircle,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'

export function HRDashboard() {
  const { user, tenant } = useAuth()
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    onLeave: 0,
    pendingLeaves: 0,
    openPositions: 0,
    attendanceRate: 0,
  })
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([])
  const [openJobs, setOpenJobs] = useState<JobOpening[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      if (!user?.tenantId) return

      const [hrStats, leaves, jobs, attendanceStats] = await Promise.all([
        employeeService.getHRStats(user.tenantId),
        employeeService.getLeaveRequests(user.tenantId),
        employeeService.getJobOpenings(user.tenantId),
        attendanceService.getTodayStats(user.tenantId),
      ])

      setStats({
        ...hrStats,
        attendanceRate: attendanceStats.attendanceRate,
      })
      setPendingLeaves(leaves.filter(l => l.status === 'pending').slice(0, 5))
      setOpenJobs(jobs.filter(j => j.status === 'open').slice(0, 5))
      setIsLoading(false)
    }
    loadData()
  }, [user?.tenantId])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="HR Dashboard" description="Loading..." />
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
        title="HR Dashboard" 
        description={tenant?.name || 'Human Resources'} 
      />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Employees"
          value={stats.totalEmployees}
          description={`${stats.activeEmployees} active`}
          icon={Users}
        />
        <StatCard
          title="On Leave Today"
          value={stats.onLeave}
          description="Employees on leave"
          icon={Calendar}
        />
        <StatCard
          title="Attendance Rate"
          value={`${stats.attendanceRate}%`}
          description="Today's attendance"
          icon={Clock}
        />
        <StatCard
          title="Open Positions"
          value={stats.openPositions}
          description="Recruiting"
          icon={Briefcase}
        />
      </div>

      {/* Pending Leaves Alert */}
      {stats.pendingLeaves > 0 && (
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">
                {stats.pendingLeaves} Leave Request{stats.pendingLeaves > 1 ? 's' : ''} Pending
              </p>
              <p className="text-sm text-muted-foreground">Requires your review and approval</p>
            </div>
            <Link href="/dashboard/hr/leaves">
              <Button>Review Now</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending Leave Requests */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Pending Leave Requests</CardTitle>
              <CardDescription>Awaiting approval</CardDescription>
            </div>
            <Link href="/dashboard/hr/leaves">
              <Button variant="outline" size="sm">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingLeaves.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No pending leave requests
                </p>
              ) : (
                pendingLeaves.map((leave) => (
                  <div
                    key={leave.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border"
                  >
                    <div>
                      <p className="font-medium text-foreground">{leave.employeeName}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                      </p>
                    </div>
                    <Badge variant="secondary" className="capitalize">
                      {leave.leaveType}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Open Positions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Open Positions</CardTitle>
              <CardDescription>Active job openings</CardDescription>
            </div>
            <Link href="/dashboard/hr/jobs">
              <Button variant="outline" size="sm">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {openJobs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No open positions
                </p>
              ) : (
                openJobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border"
                  >
                    <div>
                      <p className="font-medium text-foreground">{job.title}</p>
                      <p className="text-sm text-muted-foreground">{job.department}</p>
                    </div>
                    <Badge variant="outline">
                      {job.applicationsCount} applicant{job.applicationsCount !== 1 ? 's' : ''}
                    </Badge>
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
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <Link href="/dashboard/hr/employees">
              <Button variant="outline" className="w-full bg-transparent">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Employee
              </Button>
            </Link>
            <Link href="/dashboard/hr/jobs">
              <Button variant="outline" className="w-full bg-transparent">
                <Briefcase className="h-4 w-4 mr-2" />
                Post Job
              </Button>
            </Link>
            <Link href="/dashboard/attendance">
              <Button variant="outline" className="w-full bg-transparent">
                <Clock className="h-4 w-4 mr-2" />
                View Attendance
              </Button>
            </Link>
            <Link href="/dashboard/hr/leaves">
              <Button variant="outline" className="w-full bg-transparent">
                <Calendar className="h-4 w-4 mr-2" />
                Manage Leaves
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
