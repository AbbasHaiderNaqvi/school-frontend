import { storage, STORAGE_KEYS } from './storage'
import type { Attendance, AttendanceSummary } from '../types'
import { generateId } from '../utils'
import { employeeService } from './employee'

// Initialize demo data
const initializeAttendanceData = (tenantId: string): void => {
  const attendance = storage.get<Attendance[]>(STORAGE_KEYS.ATTENDANCE) || []
  
  if (attendance.filter(a => a.tenantId === tenantId).length === 0) {
    const today = new Date()
    const demoAttendance: Attendance[] = []
    
    // Generate last 7 days of attendance for demo employees
    const employeeNames = ['John Teacher', 'Sarah Accountant', 'Mike HR', 'Emily Math', 'David Sports']
    
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = new Date(today)
      date.setDate(date.getDate() - dayOffset)
      const dateStr = date.toISOString().split('T')[0]
      
      employeeNames.forEach((name, idx) => {
        const statuses: Attendance['status'][] = ['present', 'present', 'present', 'late', 'absent', 'on_leave', 'half_day']
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)]
        
        demoAttendance.push({
          id: generateId(),
          tenantId,
          employeeId: `emp_${idx + 1}`,
          employeeName: name,
          date: dateStr,
          checkIn: randomStatus === 'absent' || randomStatus === 'on_leave' ? undefined : '09:00',
          checkOut: randomStatus === 'absent' || randomStatus === 'on_leave' ? undefined : '17:00',
          status: randomStatus,
        })
      })
    }
    
    storage.set(STORAGE_KEYS.ATTENDANCE, [...attendance, ...demoAttendance])
  }
}

export const attendanceService = {
  async getAttendance(tenantId: string, date?: string): Promise<Attendance[]> {
    initializeAttendanceData(tenantId)
    const attendance = storage.get<Attendance[]>(STORAGE_KEYS.ATTENDANCE) || []
    let filtered = attendance.filter(a => a.tenantId === tenantId)
    
    if (date) {
      filtered = filtered.filter(a => a.date === date)
    }
    
    return filtered
  },

  async getEmployeeAttendance(tenantId: string, employeeId: string, startDate?: string, endDate?: string): Promise<Attendance[]> {
    const attendance = await this.getAttendance(tenantId)
    let filtered = attendance.filter(a => a.employeeId === employeeId)
    
    if (startDate) {
      filtered = filtered.filter(a => a.date >= startDate)
    }
    if (endDate) {
      filtered = filtered.filter(a => a.date <= endDate)
    }
    
    return filtered
  },

  async markAttendance(data: Omit<Attendance, 'id'>): Promise<Attendance> {
    const attendance = storage.get<Attendance[]>(STORAGE_KEYS.ATTENDANCE) || []
    
    // Check if attendance already exists for this employee on this date
    const existingIndex = attendance.findIndex(
      a => a.tenantId === data.tenantId && a.employeeId === data.employeeId && a.date === data.date
    )
    
    if (existingIndex !== -1) {
      // Update existing
      attendance[existingIndex] = { ...attendance[existingIndex], ...data }
      storage.set(STORAGE_KEYS.ATTENDANCE, attendance)
      return attendance[existingIndex]
    }
    
    // Create new
    const newAttendance: Attendance = {
      ...data,
      id: generateId(),
    }
    
    attendance.push(newAttendance)
    storage.set(STORAGE_KEYS.ATTENDANCE, attendance)
    
    return newAttendance
  },

  async bulkMarkAttendance(tenantId: string, date: string, records: Array<{
    employeeId: string
    employeeName: string
    status: Attendance['status']
    checkIn?: string
    checkOut?: string
    remarks?: string
  }>): Promise<Attendance[]> {
    const results: Attendance[] = []
    
    for (const record of records) {
      const result = await this.markAttendance({
        tenantId,
        date,
        ...record,
      })
      results.push(result)
    }
    
    return results
  },

  async updateAttendance(id: string, data: Partial<Attendance>): Promise<Attendance | null> {
    const attendance = storage.get<Attendance[]>(STORAGE_KEYS.ATTENDANCE) || []
    const index = attendance.findIndex(a => a.id === id)
    
    if (index === -1) return null
    
    attendance[index] = { ...attendance[index], ...data }
    storage.set(STORAGE_KEYS.ATTENDANCE, attendance)
    
    return attendance[index]
  },

  async getAttendanceSummary(tenantId: string, startDate: string, endDate: string): Promise<AttendanceSummary[]> {
    const attendance = await this.getAttendance(tenantId)
    const filtered = attendance.filter(a => a.date >= startDate && a.date <= endDate)
    
    // Group by employee
    const employeeMap = new Map<string, { 
      employeeName: string
      present: number
      absent: number
      late: number
      leave: number
      total: number
    }>()
    
    filtered.forEach(a => {
      const current = employeeMap.get(a.employeeId) || {
        employeeName: a.employeeName,
        present: 0,
        absent: 0,
        late: 0,
        leave: 0,
        total: 0,
      }
      
      current.total++
      if (a.status === 'present') current.present++
      else if (a.status === 'absent') current.absent++
      else if (a.status === 'late') current.late++
      else if (a.status === 'on_leave') current.leave++
      else if (a.status === 'half_day') current.present += 0.5
      
      employeeMap.set(a.employeeId, current)
    })
    
    return Array.from(employeeMap.entries()).map(([employeeId, data]) => ({
      employeeId,
      employeeName: data.employeeName,
      totalDays: data.total,
      presentDays: data.present,
      absentDays: data.absent,
      lateDays: data.late,
      leaveDays: data.leave,
    }))
  },

  async getTodayStats(tenantId: string): Promise<{
    total: number
    present: number
    absent: number
    late: number
    onLeave: number
    attendanceRate: number
  }> {
    const today = new Date().toISOString().split('T')[0]
    const attendance = await this.getAttendance(tenantId, today)
    const employees = await employeeService.getEmployees(tenantId)
    
    const present = attendance.filter(a => a.status === 'present' || a.status === 'half_day').length
    const absent = attendance.filter(a => a.status === 'absent').length
    const late = attendance.filter(a => a.status === 'late').length
    const onLeave = attendance.filter(a => a.status === 'on_leave').length
    const total = employees.length
    
    return {
      total,
      present,
      absent,
      late,
      onLeave,
      attendanceRate: total > 0 ? Math.round((present / total) * 100) : 0,
    }
  },
}
