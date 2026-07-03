'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/layout/page-header'
import { AccessDenied } from '@/components/ui/access-denied'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { money } from '@/lib/currency'
import {
  RefreshCw, Users, UserCheck, Clock, Briefcase,
  TrendingUp, AlertCircle, Building2, CalendarCheck, DollarSign,
} from 'lucide-react'
import { OverviewPageSkeleton } from '@/components/ui/page-skeleton'
import { hrService } from '@/lib/services/hr'
import type { HrDashboardSummary, DepartmentStat, AttendanceTrendPoint, LeaveBalanceSummary } from '@/lib/services/hr'
import Link from 'next/link'

export default function HROverviewPage() {
  const { can } = useAuth()

  const [summary, setSummary] = useState<HrDashboardSummary | null>(null)
  const [deptStats, setDeptStats] = useState<DepartmentStat[]>([])
  const [attendanceTrend, setAttendanceTrend] = useState<AttendanceTrendPoint[]>([])
  const [leaveSummary, setLeaveSummary] = useState<LeaveBalanceSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const [sum, dept, att, leave] = await Promise.all([
        hrService.getDashboardSummary(),
        hrService.getDepartmentStats(),
        hrService.getAttendanceTrend(),
        hrService.getLeaveBalanceSummary(),
      ])
      setSummary(sum)
      setDeptStats(dept)
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
  if (isLoading) return <OverviewPageSkeleton />

  const emp = summary?.employees
  const today = summary?.todayAttendance
  const month = summary?.thisMonthAttendance
  const leaves = summary?.leaves
  const payroll = summary?.payroll

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

      {/* ── Top Stats ──────────────────────────────────────────────── */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{emp?.total ?? '—'}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {emp?.byType.fullTime ?? 0} full-time · {emp?.byType.partTime ?? 0} part-time
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Active</CardTitle>
                <UserCheck className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{emp?.active ?? '—'}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {emp?.byGender.male ?? 0}M · {emp?.byGender.female ?? 0}F
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Pending Leaves</CardTitle>
                <AlertCircle className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{leaves?.pendingApplications ?? '—'}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {leaves?.thisYear.approved.count ?? 0} approved · {leaves?.thisYear.rejected.count ?? 0} rejected this year
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Open Positions</CardTitle>
                <Briefcase className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{summary?.recruitment.openPositions ?? '—'}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary?.recruitment.totalVacancies ?? 0} total vacancies
                </p>
              </CardContent>
            </Card>
          </div>

          {/* ── Attendance + Payroll Row ───────────────────────────────── */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CalendarCheck className="h-4 w-4" /> Today's Attendance
                </CardTitle>
                <CardDescription>{today?.date}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-1">
                  <span className="text-2xl font-bold">{today?.attendanceRate ?? 0}%</span>
                  <span className="text-xs text-muted-foreground mb-1">rate</span>
                </div>
                <div className="flex gap-3 mt-2 text-xs">
                  <span className="text-green-600">✓ {today?.present ?? 0} present</span>
                  <span className="text-red-500">✗ {today?.absent ?? 0} absent</span>
                  {(today?.late ?? 0) > 0 && <span className="text-yellow-600">⏱ {today?.late} late</span>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CalendarCheck className="h-4 w-4" /> This Month
                </CardTitle>
                <CardDescription>Attendance summary</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-y-1 text-sm">
                  <span className="text-muted-foreground">Present</span>
                  <span className="font-medium text-green-600">{month?.present ?? 0}</span>
                  <span className="text-muted-foreground">Absent</span>
                  <span className="font-medium text-red-500">{month?.absent ?? 0}</span>
                  <span className="text-muted-foreground">Late</span>
                  <span className="font-medium text-yellow-600">{month?.late ?? 0}</span>
                  <span className="text-muted-foreground">On Leave</span>
                  <span className="font-medium">{month?.onLeave ?? 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4" /> Payroll
                </CardTitle>
                <CardDescription>{payroll?.employeesWithSalary ?? 0} employees</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{money(payroll?.totalNetPayroll)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Gross: {money(payroll?.totalGrossPayroll)}
                </p>
                {(payroll?.pendingPosting ?? 0) > 0 && (
                  <Badge variant="destructive" className="text-xs mt-2">
                    {payroll?.pendingPosting} pending posting
                  </Badge>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* ── Department Breakdown ─────────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" /> Departments
                </CardTitle>
                <CardDescription>{deptStats.filter(d => d.employee_count > 0).length} active departments</CardDescription>
              </CardHeader>
              <CardContent>
                {deptStats.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No department data</p>
                ) : (
                  <div className="space-y-3">
                    {deptStats
                      .filter(d => d.employee_count > 0)
                      .sort((a, b) => b.employee_count - a.employee_count)
                      .map(d => {
                        const activeRate = d.employee_count > 0
                          ? Math.round((d.active_count / d.employee_count) * 100)
                          : 0
                        return (
                          <div key={d.id}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="min-w-0">
                                <span className="text-sm font-medium truncate block">{d.name}</span>
                                <span className="text-xs text-muted-foreground">{d.code}</span>
                              </div>
                              <div className="flex items-center gap-2 ml-2 shrink-0">
                                <span className="text-xs text-muted-foreground">{d.active_count}/{d.employee_count}</span>
                                {parseFloat(d.totalPayroll) > 0 && (
                                  <span className="text-xs text-muted-foreground">{money(d.totalPayroll)}</span>
                                )}
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

            {/* ── Leave Types Summary ──────────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Leave Balances
                </CardTitle>
                <CardDescription>Year {leaveSummary?.year} · leave type utilization</CardDescription>
              </CardHeader>
              <CardContent>
                {!leaveSummary || leaveSummary.leaveTypes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No leave data</p>
                ) : (
                  <div className="space-y-3">
                    {leaveSummary.leaveTypes
                      .filter(lt => parseFloat(lt.total_allocated) > 0)
                      .map((lt, i) => {
                        const allocated = parseFloat(lt.total_allocated)
                        const used = parseFloat(lt.total_used)
                        const pending = parseFloat(lt.total_pending)
                        const usedPct = allocated > 0 ? Math.round((used / allocated) * 100) : 0
                        return (
                          <div key={i}>
                            <div className="flex items-center justify-between mb-1">
                              <div>
                                <span className="text-sm font-medium">{lt.leave_type}</span>
                                {!lt.is_paid && (
                                  <Badge variant="outline" className="text-xs ml-2">Unpaid</Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground text-right">
                                <span className="text-foreground font-medium">{used}</span>/{allocated} days
                                {pending > 0 && <span className="text-orange-500 ml-1">+{pending} pending</span>}
                              </div>
                            </div>
                            <div className="w-full bg-muted rounded-full h-1.5">
                              <div
                                className={`rounded-full h-1.5 transition-all ${usedPct >= 80 ? 'bg-red-500' : usedPct >= 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                style={{ width: `${Math.min(usedPct, 100)}%` }}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{lt.employees_with_balance} employees with balance</p>
                          </div>
                        )
                      })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Attendance Trend ─────────────────────────────────────────── */}
          {attendanceTrend.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> Attendance Trend
                </CardTitle>
                <CardDescription>Daily breakdown — last {attendanceTrend.length} days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {attendanceTrend.slice(-10).map((point, i) => {
                    const rate = point.total > 0 ? Math.round((point.present / point.total) * 100) : 0
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-20 shrink-0">{point.date}</span>
                        <div className="flex-1 bg-muted rounded-full h-5 relative overflow-hidden">
                          <div
                            className={`rounded-full h-5 transition-all flex items-center justify-end pr-2 ${
                              rate >= 90 ? 'bg-green-500' : rate >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.max(rate, 6)}%` }}
                          >
                            <span className="text-[10px] text-white font-medium">{rate}%</span>
                          </div>
                        </div>
                        <div className="flex gap-2 text-xs text-muted-foreground w-32 shrink-0">
                          <span className="text-green-600">✓{point.present}</span>
                          {point.absent > 0 && <span className="text-red-500">✗{point.absent}</span>}
                          {point.late > 0 && <span className="text-yellow-600">⏱{point.late}</span>}
                          <span className="text-muted-foreground">/{point.total}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Quick Links ──────────────────────────────────────────────── */}
          <Card>
            <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
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
    </div>
  )
}
