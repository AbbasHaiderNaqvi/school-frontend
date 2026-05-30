import { storage, STORAGE_KEYS } from './storage'
import type { Attendance, AttendanceSummary, Employee } from '../types'
import { generateId } from '../utils'
import { auditService } from './audit'

export const attendanceManagerService = {
  // Mark attendance for employee
  async markAttendance(
    tenantId: string,
    employeeId: string,
    employeeName: string,
    date: string,
    status: Attendance['status'],
    checkIn?: string,
    checkOut?: string,
    remarks?: string,
  ): Promise<Attendance> {
    const attendances = storage.get<Attendance[]>(STORAGE_KEYS.ATTENDANCE) || []

    // Check if attendance already marked for this employee on this date
    const existingIndex = attendances.findIndex(
      a => a.employeeId === employeeId && a.date === date && a.tenantId === tenantId,
    )

    const attendance: Attendance = {
      id: existingIndex === -1 ? generateId() : attendances[existingIndex].id,
      tenantId,
      employeeId,
      employeeName,
      date,
      checkIn: checkIn || new Date().toISOString(),
      checkOut: checkOut || undefined,
      status,
      remarks,
    }

    if (existingIndex === -1) {
      attendances.push(attendance)
    } else {
      attendances[existingIndex] = attendance
    }

    storage.set(STORAGE_KEYS.ATTENDANCE, attendances)

    auditService.log({
      action: 'CREATE',
      entity: 'Attendance',
      entityId: attendance.id,
      details: `${employeeName} marked ${status} on ${date}`,
      tenantId,
    })

    return attendance
  },

  // Bulk mark attendance
  async bulkMarkAttendance(
    tenantId: string,
    date: string,
    attendanceData: Array<{
      employeeId: string
      employeeName: string
      status: Attendance['status']
      remarks?: string
    }>,
  ): Promise<Attendance[]> {
    const attendances = storage.get<Attendance[]>(STORAGE_KEYS.ATTENDANCE) || []

    const marked: Attendance[] = []

    for (const data of attendanceData) {
      const attendance: Attendance = {
        id: generateId(),
        tenantId,
        employeeId: data.employeeId,
        employeeName: data.employeeName,
        date,
        checkIn: new Date().toISOString(),
        status: data.status,
        remarks: data.remarks,
      }

      attendances.push(attendance)
      marked.push(attendance)
    }

    storage.set(STORAGE_KEYS.ATTENDANCE, attendances)
    return marked
  },

  // Get attendance for specific employee
  async getEmployeeAttendance(
    tenantId: string,
    employeeId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<Attendance[]> {
    const attendances = storage.get<Attendance[]>(STORAGE_KEYS.ATTENDANCE) || []

    return attendances.filter(a => {
      if (a.tenantId !== tenantId || a.employeeId !== employeeId) return false
      if (startDate && a.date < startDate) return false
      if (endDate && a.date > endDate) return false
      return true
    })
  },

  // Get attendance summary for employee
  async getAttendanceSummary(
    tenantId: string,
    employeeId: string,
    month?: string,
  ): Promise<AttendanceSummary | null> {
    const attendances = storage.get<Attendance[]>(STORAGE_KEYS.ATTENDANCE) || []
    const employees = storage.get<Employee[]>(STORAGE_KEYS.EMPLOYEES) || []

    const employee = employees.find(e => e.id === employeeId && e.tenantId === tenantId)
    if (!employee) return null

    let filtered = attendances.filter(a => a.employeeId === employeeId && a.tenantId === tenantId)

    if (month) {
      const [year, monthNum] = month.split('-')
      filtered = filtered.filter(a => a.date.startsWith(`${year}-${monthNum}`))
    }

    const summary: AttendanceSummary = {
      employeeId,
      employeeName: employee.name,
      totalDays: filtered.length,
      presentDays: filtered.filter(a => a.status === 'present').length,
      absentDays: filtered.filter(a => a.status === 'absent').length,
      lateDays: filtered.filter(a => a.status === 'late').length,
      halfDays: filtered.filter(a => a.status === 'half_day').length,
      onLeaveDays: filtered.filter(a => a.status === 'on_leave').length,
      attendancePercentage:
        filtered.length > 0
          ? Math.round(
              (filtered.filter(a => a.status === 'present' || a.status === 'late').length / filtered.length) * 100,
            )
          : 0,
    }

    return summary
  },

  // Get department attendance report
  async getDepartmentAttendanceReport(
    tenantId: string,
    department: string,
    date: string,
  ): Promise<{ present: number; absent: number; late: number; total: number }> {
    const attendances = storage.get<Attendance[]>(STORAGE_KEYS.ATTENDANCE) || []
    const employees = storage.get<Employee[]>(STORAGE_KEYS.EMPLOYEES) || []

    const deptEmployees = employees.filter(
      e => e.tenantId === tenantId && e.department === department && e.status === 'active',
    )

    const dayAttendances = attendances.filter(
      a => a.tenantId === tenantId && a.date === date && deptEmployees.some(e => e.id === a.employeeId),
    )

    return {
      present: dayAttendances.filter(a => a.status === 'present').length,
      absent: deptEmployees.length - dayAttendances.length,
      late: dayAttendances.filter(a => a.status === 'late').length,
      total: deptEmployees.length,
    }
  },

  // Check in/out
  async checkIn(tenantId: string, employeeId: string): Promise<Attendance | null> {
    const today = new Date().toISOString().split('T')[0]
    const attendances = storage.get<Attendance[]>(STORAGE_KEYS.ATTENDANCE) || []
    const employees = storage.get<Employee[]>(STORAGE_KEYS.EMPLOYEES) || []

    const employee = employees.find(e => e.id === employeeId && e.tenantId === tenantId)
    if (!employee) return null

    let attendance = attendances.find(
      a => a.employeeId === employeeId && a.date === today && a.tenantId === tenantId,
    )

    if (!attendance) {
      attendance = {
        id: generateId(),
        tenantId,
        employeeId,
        employeeName: employee.name,
        date: today,
        checkIn: new Date().toISOString(),
        status: 'present',
      }
      attendances.push(attendance)
    } else if (!attendance.checkOut) {
      attendance.checkOut = new Date().toISOString()
    }

    storage.set(STORAGE_KEYS.ATTENDANCE, attendances)
    return attendance
  },
}

interface AttendanceSummary {
  employeeId: string
  employeeName: string
  totalDays: number
  presentDays: number
  absentDays: number
  lateDays: number
  halfDays: number
  onLeaveDays: number
  attendancePercentage: number
}
