'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/layout/page-header'
import { AccessDenied } from '@/components/ui/access-denied'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw, Users, UserCheck, Clock, Briefcase, TrendingUp, AlertCircle, Calendar, Building2 } from 'lucide-react'
import { hrService } from '@/lib/services/hr'
import type {
  HrDashboardSummary, DepartmentStat, HeadcountTrendPoint,
  AttendanceTrendPoint, LeaveBalanceSummary,
} from '@/lib/services/hr'
import Link from 'next/link'

export default function HROverviewPage() {
  const { can } = useAuth()

  const [summary, setSummary] = useState<HrDashboardSummary | null>(null)
  const [deptStats, setDeptStats] = useState<DepartmentStat[]>([])
  const [headcountTrend, setHeadcountTrend] = useState<HeadcountTrendPoint[]>([])
  const [attendanceTrend, setAttendanceTrend] = useState<AttendanceTrendPoint[]>([])
  const [leaveSummary, setLeaveSummary] = useState<LeaveBalanceSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const [sum, dept, hc, att, leave] = await Promise.all([
        hrService.getDashboardSummary(),
        hrService.getDepartmentStats(),
        hrService.getHeadcountTrend(),
        hrService.getAttendanceTrend(),
        hrService.getLeaveBalanceSummary(),
      ])
      setSummary(sum)
      setDeptStats(dept)
      setHeadcountTrend(hc)
      setAttendanceTrend(att)
      setLeaveSummary(leave)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load HR dashboard.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  if (!can('hr.dashboard.read')) return <AccessDenied />

  // Derived attendance values from last entry in trend
  const latestAttendance = attendanceTrend[attendanceTrend.length - 1]
  const attendanceRate = latestAttendance
    ? Math.round((latestAttendance.present / (latestAttendance.present + latestAttendance.absent + (latestAttendance.onLeave ?? 0))) * 100)
    : null

  // Last 6 headcount points for mini trend
  const recentHeadcount = headcountTrend.slice(-6)

  return (
    <div className="space-y-6">
      <PageHeader
        title="HR Overview"
        description="Workforce summary and HR analytics"
        action={
          <Button variant="outline" size="icon" onClick={loadData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        }
      />

      {loadError && (
        <Alert variant="destructive">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* ── Key Stats ───────────────────────────────────────────────── */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary?.totalEmployees ?? '—'}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary?.activeEmployees ?? 0} active · {summary?.onLeave ?? 0} on leave
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
                <UserCheck className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{summary?.activeEmployees ?? '—'}</div>
                <p className="text-xs text-muted-foreground mt-1">Currently working</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">On Leave</CardTitle>
                <Clock className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{summary?.onLeave ?? '—'}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary?.pendingLeaveRequests ?? 0} requests pending
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Pending Leaves</CardTitle>
                <AlertCircle className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{summary?.pendingLeaveRequests ?? '—'}</div>
                <p className="text-xs text-muted-foreground mt-1">Awaiting approval</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Open Positions</CardTitle>
                <Briefcase className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{summary?.openPositions ?? '—'}</div>
                <p className="text-xs text-muted-foreground mt-1">Active job openings</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">New Hires</CardTitle>
                <Calendar className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{summary?.newHiresThisMonth ?? '—'}</div>
                <p className="text-xs text-muted-foreground mt-1">This month</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* ── Department Breakdown ─────────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" /> Department Breakdown
                </CardTitle>
                <CardDescription>{deptStats.length} departments</CardDescription>
              </CardHeader>
              <CardContent>
                {deptStats.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No department data</p>
                ) : (
                  <div className="space-y-3">
                    {deptStats.map((d, i) => {
                      const activeRate = d.total > 0 ? Math.round((d.active / d.total) * 100) : 0
                      return (
                        <div key={i}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">{d.department}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{d.active}/{d.total}</span>
                              <Badge variant={activeRate >= 90 ? 'default' : activeRate >= 70 ? 'secondary' : 'destructive'} className="text-xs">
                                {activeRate}%
                              </Badge>
                            </div>
                          </div>
                          <div className="w-full bg-muted rounded-full h-1.5">
                            <div
                              className="bg-primary rounded-full h-1.5 transition-all"
                              style={{ width: `${activeRate}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Leave Balance Summary ────────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Leave Balance Summary
                </CardTitle>
                <CardDescription>Staff leave quota status</CardDescription>
              </CardHeader>
              <CardContent>
                {!leaveSummary ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No leave data</p>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
                        <p className="text-2xl font-bold text-blue-600">{leaveSummary.averageBalance?.toFixed(1) ?? '—'}</p>
                        <p className="text-xs text-muted-foreground mt-1">Avg. Balance</p>
                      </div>
                      <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950">
                        <p className="text-2xl font-bold text-orange-600">{leaveSummary.lowBalanceCount ?? 0}</p>
                        <p className="text-xs text-muted-foreground mt-1">Low Balance</p>
                      </div>
                      <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950">
                        <p className="text-2xl font-bold text-red-600">{leaveSummary.exhaustedCount ?? 0}</p>
                        <p className="text-xs text-muted-foreground mt-1">Exhausted</p>
                      </div>
                    </div>
                    {leaveSummary.details && leaveSummary.details.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">LOW BALANCE STAFF</p>
                        <div className="space-y-1.5">
                          {leaveSummary.details.slice(0, 5).map((d, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                              <span className="truncate max-w-[160px]">{d.employeeName}</span>
                              <div className="flex items-center gap-2">
                                {d.department && <span className="text-xs text-muted-foreground">{d.department}</span>}
                                <Badge variant={d.leaveBalance <= 0 ? 'destructive' : 'secondary'} className="text-xs">
                                  {d.leaveBalance} days
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* ── Headcount Trend ──────────────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> Headcount Trend
                </CardTitle>
                <CardDescription>Last {recentHeadcount.length} months</CardDescription>
              </CardHeader>
              <CardContent>
                {recentHeadcount.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No trend data</p>
                ) : (
                  <div className="space-y-2">
                    {(() => {
                      const max = Math.max(...recentHeadcount.map(p => p.count), 1)
                      return recentHeadcount.map((point, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground w-14 shrink-0">{point.month}</span>
                          <div className="flex-1 bg-muted rounded-full h-5 relative overflow-hidden">
                            <div
                              className="bg-primary rounded-full h-5 transition-all flex items-center justify-end pr-2"
                              style={{ width: `${Math.max((point.count / max) * 100, 8)}%` }}
                            >
                              <span className="text-[10px] text-primary-foreground font-medium">{point.count}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Attendance Trend ─────────────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4" /> Attendance Trend
                </CardTitle>
                <CardDescription>
                  {attendanceRate !== null ? `Latest rate: ${attendanceRate}%` : 'Recent attendance'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {attendanceTrend.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No attendance data</p>
                ) : (
                  <div className="space-y-2">
                    {attendanceTrend.slice(-6).map((point, i) => {
                      const total = point.present + point.absent + (point.onLeave ?? 0)
                      const rate = total > 0 ? Math.round((point.present / total) * 100) : 0
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground w-20 shrink-0">{point.date}</span>
                          <div className="flex-1 bg-muted rounded-full h-5 relative overflow-hidden">
                            <div
                              className="bg-green-500 rounded-full h-5 transition-all flex items-center justify-end pr-2"
                              style={{ width: `${Math.max(rate, 8)}%` }}
                            >
                              <span className="text-[10px] text-white font-medium">{rate}%</span>
                            </div>
                          </div>
                          <div className="flex gap-1 text-xs text-muted-foreground w-20 shrink-0">
                            <span className="text-green-600">{point.present}✓</span>
                            {point.absent > 0 && <span className="text-red-500">{point.absent}✗</span>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Quick Links ─────────────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { href: '/dashboard/hr/employees', label: 'Employees', desc: 'View & manage staff records', icon: Users },
                  { href: '/dashboard/hr/leaves', label: 'Leave Requests', desc: 'Review & approve applications', icon: Clock },
                  { href: '/dashboard/hr/jobs', label: 'Job Openings', desc: 'Manage recruitment', icon: Briefcase },
                  { href: '/dashboard/hr/payroll', label: 'Payroll', desc: 'Salary & pay records', icon: TrendingUp },
                ].map(({ href, label, desc, icon: Icon }) => (
                  <Link key={href} href={href} className="block p-4 rounded-lg border hover:bg-accent transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">{label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
