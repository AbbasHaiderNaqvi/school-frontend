import { api } from './api-client'

function toArray<T>(raw: unknown): T[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw as T[]
  const p = raw as Record<string, unknown>
  if (Array.isArray(p.data)) return p.data as T[]
  return []
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export interface HrDashboardSummary {
  employees: {
    total: number
    active: number
    onLeave: number
    terminated: number
    resigned: number
    byType: { fullTime: number; partTime: number; contract: number; temporary: number }
    byGender: { male: number; female: number }
  }
  departments: { total: number }
  todayAttendance: {
    date: string
    totalMarked: number
    present: number
    absent: number
    late: number
    halfDay: number
    onLeave: number
    attendanceRate: number
  }
  thisMonthAttendance: {
    present: number
    absent: number
    late: number
    halfDay: number
    onLeave: number
    holiday: number
    weekend: number
  }
  leaves: {
    pendingApplications: number
    thisYear: {
      pending: { count: number; totalDays: number }
      approved: { count: number; totalDays: number }
      rejected: { count: number; totalDays: number }
      cancelled: { count: number; totalDays: number }
    }
  }
  recruitment: { openPositions: number; totalVacancies: number }
  payroll: {
    employeesWithSalary: number
    totalNetPayroll: string
    totalGrossPayroll: string
    totalBasic: string
    postedToFinance: number
    pendingPosting: number
  }
  alerts: {
    recentHires: unknown[]
    contractsExpiringSoon: unknown[]
    probationsEndingSoon: unknown[]
  }
  generatedAt: string
}

export interface DepartmentStat {
  id: string
  name: string
  code: string
  sort_order: number
  employee_count: number
  active_count: number
  on_leave_count: number
  full_time: number
  contract: number
  designation_count: number
  total_payroll: string
  totalPayroll: string
}

export interface HeadcountTrendPoint {
  month: string
  count: number
}

export interface AttendanceTrendPoint {
  date: string
  present: number
  absent: number
  late: number
  total: number
}

export interface LeaveTypeBalance {
  leave_type: string
  leave_code: string
  is_paid: boolean
  total_allocated: string
  total_used: string
  total_pending: string
  employees_with_balance: number
}

export interface LeaveBalanceSummary {
  year: string
  leaveTypes: LeaveTypeBalance[]
}

// ── Employees ─────────────────────────────────────────────────────────────────

export interface Employee {
  id: string
  employeeCode: string
  fullName: string
  email: string
  phone?: string
  department?: string
  designation?: string
  joiningDate?: string
  salary?: number
  status: 'active' | 'inactive' | 'on_leave' | 'terminated'
  isActive: boolean
  createdAt: string
  updatedAt?: string
}

export interface Paginated<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

// ── Leave Requests ─────────────────────────────────────────────────────────────

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
export type LeaveType = 'ANNUAL' | 'SICK' | 'CASUAL' | 'UNPAID' | 'MATERNITY' | 'PATERNITY' | 'OTHER'

export interface LeaveRequest {
  id: string
  employeeId: string
  employeeName?: string
  department?: string
  leaveType: LeaveType
  startDate: string
  endDate: string
  days: number
  reason?: string
  status: LeaveStatus
  reviewedBy?: string
  reviewNote?: string
  createdAt: string
}

// ── Job Openings ──────────────────────────────────────────────────────────────

export type JobStatus = 'OPEN' | 'CLOSED' | 'DRAFT' | 'ON_HOLD'

export interface JobOpening {
  id: string
  title: string
  department?: string
  description?: string
  requirements?: string
  vacancies: number
  status: JobStatus
  postedDate?: string
  closingDate?: string
  createdAt: string
}

// ── Payroll ───────────────────────────────────────────────────────────────────

export interface PayrollRecord {
  id: string
  employeeId: string
  employeeName?: string
  department?: string
  month: string
  basicSalary: string
  allowances?: string
  deductions?: string
  netSalary: string
  status: 'DRAFT' | 'APPROVED' | 'PAID'
  paidAt?: string
  createdAt: string
}

export const hrService = {
  // ── Dashboard ──────────────────────────────────────────────────────────────

  async getDashboardSummary(): Promise<HrDashboardSummary | null> {
    const { data, error } = await api.get<HrDashboardSummary>('/hr/dashboard/summary')
    if (error) throw new Error(error)
    return data || null
  },

  async getDepartmentStats(): Promise<DepartmentStat[]> {
    const { data, error } = await api.get<{ departments: DepartmentStat[] }>('/hr/dashboard/department-stats')
    if (error) throw new Error(error)
    return data?.departments ?? []
  },

  async getHeadcountTrend(): Promise<HeadcountTrendPoint[]> {
    const { data, error } = await api.get<unknown>('/hr/dashboard/headcount-trend')
    if (error) throw new Error(error)
    return toArray<HeadcountTrendPoint>(data)
  },

  async getAttendanceTrend(): Promise<AttendanceTrendPoint[]> {
    const { data, error } = await api.get<{ trend: AttendanceTrendPoint[]; days: number }>('/hr/dashboard/attendance-trend')
    if (error) throw new Error(error)
    return data?.trend ?? []
  },

  async getLeaveBalanceSummary(): Promise<LeaveBalanceSummary | null> {
    const { data, error } = await api.get<LeaveBalanceSummary>('/hr/dashboard/leave-balance-summary')
    if (error) throw new Error(error)
    return data || null
  },

  // ── Employees ──────────────────────────────────────────────────────────────

  async getEmployees(params: { page?: number; limit?: number; search?: string; department?: string; status?: string } = {}): Promise<Paginated<Employee>> {
    const q = new URLSearchParams()
    if (params.page) q.set('page', String(params.page))
    if (params.limit) q.set('limit', String(params.limit))
    if (params.search) q.set('search', params.search)
    if (params.department) q.set('department', params.department)
    if (params.status) q.set('status', params.status)
    const qs = q.toString()
    const { data, error } = await api.get<Paginated<Employee>>(`/hr/employees${qs ? `?${qs}` : ''}`)
    if (error) throw new Error(error)
    const raw = data as unknown
    if (Array.isArray(raw)) return { data: raw as Employee[], total: (raw as Employee[]).length, page: 1, limit: 200 }
    const p = raw as Paginated<Employee>
    return p || { data: [], total: 0, page: 1, limit: 20 }
  },

  async getEmployeeById(id: string): Promise<Employee | null> {
    const { data } = await api.get<Employee>(`/hr/employees/${id}`)
    return data || null
  },

  async createEmployee(payload: {
    fullName: string; email: string; phone?: string; department?: string
    designation?: string; joiningDate?: string; salary?: number; employeeCode?: string
  }): Promise<{ employee: Employee | null; error?: string }> {
    const { data, error } = await api.post<Employee>('/hr/employees', payload)
    if (error || !data) return { employee: null, error: error || 'Failed to create employee' }
    return { employee: data }
  },

  async updateEmployee(id: string, payload: Partial<{
    fullName: string; phone: string; department: string; designation: string
    joiningDate: string; salary: number; status: string; isActive: boolean
  }>): Promise<{ employee: Employee | null; error?: string }> {
    const { data, error } = await api.patch<Employee>(`/hr/employees/${id}`, payload)
    if (error || !data) return { employee: null, error: error || 'Failed to update employee' }
    return { employee: data }
  },

  async deleteEmployee(id: string): Promise<boolean> {
    const { error } = await api.delete(`/hr/employees/${id}`)
    return !error
  },

  // ── Leave Requests ─────────────────────────────────────────────────────────

  async getLeaveRequests(params: { page?: number; limit?: number; status?: LeaveStatus; employeeId?: string } = {}): Promise<Paginated<LeaveRequest>> {
    const q = new URLSearchParams()
    if (params.page) q.set('page', String(params.page))
    if (params.limit) q.set('limit', String(params.limit))
    if (params.status) q.set('status', params.status)
    if (params.employeeId) q.set('employeeId', params.employeeId)
    const qs = q.toString()
    const { data, error } = await api.get<unknown>(`/hr/leaves${qs ? `?${qs}` : ''}`)
    if (error) throw new Error(error)
    const raw = data as unknown
    if (Array.isArray(raw)) return { data: raw as LeaveRequest[], total: (raw as LeaveRequest[]).length, page: 1, limit: 200 }
    const p = raw as Paginated<LeaveRequest>
    return p || { data: [], total: 0, page: 1, limit: 20 }
  },

  async createLeaveRequest(payload: {
    employeeId: string; leaveType: LeaveType; startDate: string; endDate: string; reason?: string
  }): Promise<{ leave: LeaveRequest | null; error?: string }> {
    const { data, error } = await api.post<LeaveRequest>('/hr/leaves', payload)
    if (error || !data) return { leave: null, error: error || 'Failed to create leave request' }
    return { leave: data }
  },

  async approveLeave(id: string, note?: string): Promise<boolean> {
    const { error } = await api.post(`/hr/leaves/${id}/approve`, { note })
    return !error
  },

  async rejectLeave(id: string, note?: string): Promise<boolean> {
    const { error } = await api.post(`/hr/leaves/${id}/reject`, { note })
    return !error
  },

  // ── Job Openings ───────────────────────────────────────────────────────────

  async getJobOpenings(params: { page?: number; limit?: number; status?: JobStatus } = {}): Promise<Paginated<JobOpening>> {
    const q = new URLSearchParams()
    if (params.page) q.set('page', String(params.page))
    if (params.limit) q.set('limit', String(params.limit))
    if (params.status) q.set('status', params.status)
    const qs = q.toString()
    const { data, error } = await api.get<unknown>(`/hr/jobs${qs ? `?${qs}` : ''}`)
    if (error) throw new Error(error)
    const raw = data as unknown
    if (Array.isArray(raw)) return { data: raw as JobOpening[], total: (raw as JobOpening[]).length, page: 1, limit: 200 }
    const p = raw as Paginated<JobOpening>
    return p || { data: [], total: 0, page: 1, limit: 20 }
  },

  async createJobOpening(payload: {
    title: string; department?: string; description?: string; requirements?: string
    vacancies?: number; closingDate?: string
  }): Promise<{ job: JobOpening | null; error?: string }> {
    const { data, error } = await api.post<JobOpening>('/hr/jobs', payload)
    if (error || !data) return { job: null, error: error || 'Failed to create job opening' }
    return { job: data }
  },

  async updateJobOpening(id: string, payload: Partial<{ title: string; status: JobStatus; vacancies: number; closingDate: string }>): Promise<boolean> {
    const { error } = await api.patch(`/hr/jobs/${id}`, payload)
    return !error
  },

  // ── Payroll ────────────────────────────────────────────────────────────────

  async getPayroll(params: { page?: number; limit?: number; month?: string; status?: string } = {}): Promise<Paginated<PayrollRecord>> {
    const q = new URLSearchParams()
    if (params.page) q.set('page', String(params.page))
    if (params.limit) q.set('limit', String(params.limit))
    if (params.month) q.set('month', params.month)
    if (params.status) q.set('status', params.status)
    const qs = q.toString()
    const { data, error } = await api.get<unknown>(`/hr/payroll${qs ? `?${qs}` : ''}`)
    if (error) throw new Error(error)
    const raw = data as unknown
    if (Array.isArray(raw)) return { data: raw as PayrollRecord[], total: (raw as PayrollRecord[]).length, page: 1, limit: 200 }
    const p = raw as Paginated<PayrollRecord>
    return p || { data: [], total: 0, page: 1, limit: 20 }
  },
}
