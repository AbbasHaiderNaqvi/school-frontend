'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { attendanceManagerService } from '@/lib/services/attendance-manager'
import { employeeService } from '@/lib/services/hr'
import { PageHeader } from '@/components/layout/page-header'
import { StatCard } from '@/components/dashboard/stat-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Attendance, AttendanceSummary, Employee } from '@/lib/types'
import { Calendar, UserCheck, UserX, Clock } from 'lucide-react'
import { TablePageSkeleton } from '@/components/ui/page-skeleton'

export default function AttendancePage() {
  const { user, tenant } = useAuth()
  const [attendances, setAttendances] = useState<Attendance[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedEmployee, setSelectedEmployee] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [isBulkMarkOpen, setIsBulkMarkOpen] = useState(false)
  const [bulkMarkData, setBulkMarkData] = useState<Record<string, 'present' | 'absent' | 'late' | 'half_day'>>({})

  useEffect(() => {
    if (user?.tenantId) {
      loadData()
    }
  }, [user?.tenantId, selectedDate])

  const loadData = async () => {
    setIsLoading(true)
    const emps = await employeeService.getEmployeesByTenant(user!.tenantId)
    setEmployees(emps)

    if (selectedEmployee) {
      const atts = await attendanceManagerService.getEmployeeAttendance(user!.tenantId, selectedEmployee)
      setAttendances(atts)
    }
    setIsLoading(false)
  }

  const handleDayAttendance = async (status: 'present' | 'absent' | 'late' | 'half_day') => {
    if (!selectedEmployee) return

    const employee = employees.find(e => e.id === selectedEmployee)
    if (!employee) return

    await attendanceManagerService.markAttendance(
      user!.tenantId,
      selectedEmployee,
      employee.name,
      selectedDate,
      status,
      undefined,
      undefined,
    )

    loadData()
  }

  const handleBulkMark = async () => {
    if (Object.keys(bulkMarkData).length === 0) return

    const bulkData = employees
      .filter(e => bulkMarkData[e.id])
      .map(e => ({
        employeeId: e.id,
        employeeName: e.name,
        status: bulkMarkData[e.id],
      }))

    await attendanceManagerService.bulkMarkAttendance(user!.tenantId, selectedDate, bulkData)

    setBulkMarkData({})
    setIsBulkMarkOpen(false)
    loadData()
  }

  const todayAttendance = attendances.filter(a => a.date === selectedDate)
  const presentCount = todayAttendance.filter(a => a.status === 'present').length
  const absentCount = todayAttendance.filter(a => a.status === 'absent').length
  const lateCount = todayAttendance.filter(a => a.status === 'late').length

  if (isLoading) {
    return <TablePageSkeleton />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance Management"
        description={`Track and manage attendance for ${tenant?.name || 'your organization'}`}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Total Employees" value={employees.length.toString()} icon={UserCheck} />
        <StatCard title="Present Today" value={presentCount.toString()} icon={UserCheck} />
        <StatCard title="Absent Today" value={absentCount.toString()} icon={UserX} />
        <StatCard title="Late Today" value={lateCount.toString()} icon={Clock} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mark Attendance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md"
              />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Employee</label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedEmployee && (
            <div className="flex gap-2">
              <Button onClick={() => handleDayAttendance('present')} className="flex-1">
                Mark Present
              </Button>
              <Button onClick={() => handleDayAttendance('absent')} variant="destructive" className="flex-1">
                Mark Absent
              </Button>
              <Button onClick={() => handleDayAttendance('late')} variant="outline" className="flex-1">
                Mark Late
              </Button>
              <Button onClick={() => handleDayAttendance('half_day')} variant="outline" className="flex-1">
                Mark Half Day
              </Button>
            </div>
          )}

          <Dialog open={isBulkMarkOpen} onOpenChange={setIsBulkMarkOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full bg-transparent">
                Bulk Mark Attendance
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[600px] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Bulk Mark Attendance for {selectedDate}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                {employees.map(emp => (
                  <div key={emp.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <span>{emp.name}</span>
                    <Select
                      value={bulkMarkData[emp.id] || ''}
                      onValueChange={val =>
                        setBulkMarkData({
                          ...bulkMarkData,
                          [emp.id]: val as 'present' | 'absent' | 'late' | 'half_day',
                        })
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="present">Present</SelectItem>
                        <SelectItem value="absent">Absent</SelectItem>
                        <SelectItem value="late">Late</SelectItem>
                        <SelectItem value="half_day">Half Day</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
                <Button onClick={handleBulkMark} className="w-full">
                  Save Attendance
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Attendance Records</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {todayAttendance.length > 0 ? (
                todayAttendance.map(att => (
                  <TableRow key={att.id}>
                    <TableCell>{att.employeeName}</TableCell>
                    <TableCell>{att.date}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          att.status === 'present'
                            ? 'bg-green-100 text-green-800'
                            : att.status === 'absent'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {att.status.toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell>{att.checkIn ? new Date(att.checkIn).toLocaleTimeString() : '-'}</TableCell>
                    <TableCell>{att.checkOut ? new Date(att.checkOut).toLocaleTimeString() : '-'}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No attendance records for this date
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
