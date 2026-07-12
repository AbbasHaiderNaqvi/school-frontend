import { api, toPaginated } from './api-client'

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

// ── Departments ───────────────────────────────────────────────────────────────

export interface Department {
  id: string
  name: string
  code: string
  description?: string
  head_of_department_id?: string | null
  head_name?: string | null
  is_active: boolean
  sort_order?: number
  created_at: string
  updated_at?: string | null
}

export interface CreateDepartmentRequest {
  name: string
  code: string
  description?: string
  headOfDepartmentId?: string
  sortOrder?: number
}


// ── Designations ──────────────────────────────────────────────────────────────

export interface Designation {
  id: string
  name: string
  code: string
  departmentId?: string
  departmentName?: string
  description?: string
  level?: string
  createdAt: string
  updatedAt?: string
}

export interface CreateDesignationRequest {
  name: string
  code: string
  departmentId?: string
  description?: string
  level?: string
}

// ── Employees ─────────────────────────────────────────────────────────────────

export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'TEMPORARY'
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED' | 'RESIGNED'
export type Gender = 'MALE' | 'FEMALE' | 'OTHER'

function normalizeEmployee(raw: Record<string, unknown>): Employee {
  return {
    id: raw.id as string,
    employeeCode: (raw.employee_code ?? raw.employeeCode) as string | undefined,
    firstName: (raw.first_name ?? raw.firstName) as string,
    lastName: (raw.last_name ?? raw.lastName) as string,
    fullName: (raw.full_name ?? raw.fullName) as string | undefined,
    email: raw.email as string,
    phone: (raw.phone as string | null) ?? undefined,
    gender: (raw.gender as Gender) ?? undefined,
    dateOfBirth: (raw.date_of_birth ?? raw.dateOfBirth) as string | undefined,
    nationality: raw.nationality as string | undefined,
    cnicOrPassport: (raw.cnic_or_passport ?? raw.cnicOrPassport) as string | undefined,
    address: raw.address as string | undefined,
    departmentId: (raw.department_id ?? raw.departmentId) as string | undefined,
    departmentName: (raw.department_name ?? raw.departmentName) as string | undefined,
    designationId: (raw.designation_id ?? raw.designationId) as string | undefined,
    designationName: (raw.designation_name ?? raw.designationName) as string | undefined,
    employmentType: (raw.employment_type ?? raw.employmentType) as EmploymentType | undefined,
    joiningDate: (raw.joining_date ?? raw.joiningDate) as string | undefined,
    contractEndDate: (raw.contract_end_date ?? raw.contractEndDate) as string | undefined,
    probationEndDate: (raw.probation_end_date ?? raw.probationEndDate) as string | undefined,
    status: (raw.status as EmployeeStatus),
    profilePicture: (raw.profile_picture_url ?? raw.profilePicture) as string | undefined,
    emergencyContactName: (raw.emergency_contact_name ?? raw.emergencyContactName) as string | undefined,
    emergencyContactPhone: (raw.emergency_contact_phone ?? raw.emergencyContactPhone) as string | undefined,
    emergencyContactRelation: (raw.emergency_contact_relation ?? raw.emergencyContactRelation) as string | undefined,
    bankAccountNumber: (raw.bank_account_number ?? raw.bankAccountNumber) as string | undefined,
    bankName: (raw.bank_name ?? raw.bankName) as string | undefined,
    notes: raw.notes as string | undefined,
    userId: (raw.user_id ?? raw.userId) as string | undefined,
    createdAt: (raw.created_at ?? raw.createdAt) as string,
    updatedAt: (raw.updated_at ?? raw.updatedAt) as string | undefined,
  }
}

export interface Employee {
  id: string
  employeeCode?: string
  firstName: string
  lastName: string
  fullName?: string
  email: string
  phone?: string
  gender?: Gender
  dateOfBirth?: string
  nationality?: string
  cnicOrPassport?: string
  address?: string
  departmentId?: string
  departmentName?: string
  designationId?: string
  designationName?: string
  employmentType?: EmploymentType
  joiningDate?: string
  contractEndDate?: string
  probationEndDate?: string
  status: EmployeeStatus
  profilePicture?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
  emergencyContactRelation?: string
  bankAccountNumber?: string
  bankName?: string
  notes?: string
  userId?: string
  createdAt: string
  updatedAt?: string
}

export interface CreateEmployeeRequest {
  firstName: string
  lastName: string
  email: string
  phone?: string
  gender?: Gender
  dateOfBirth?: string
  nationality?: string
  cnicOrPassport?: string
  address?: string
  departmentId?: string
  designationId?: string
  employmentType?: EmploymentType
  joiningDate?: string
  contractEndDate?: string
  probationEndDate?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
  emergencyContactRelation?: string
  bankAccountNumber?: string
  bankName?: string
  notes?: string
  userId?: string
}

export interface Paginated<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

// ── Leave Types ──────────────────────────────────────────────────────────────

export interface LeaveType {
  id: string
  name: string
  code: string
  description?: string
  totalDaysAllowed: number
  isPaid: boolean
  carryForward: boolean
  maxCarryForwardDays: number
  isActive?: boolean
  createdAt?: string
}

function normalizeLeaveType(raw: Record<string, unknown>): LeaveType {
  return {
    id: raw.id as string,
    name: raw.name as string,
    code: raw.code as string,
    description: raw.description as string | undefined,
    totalDaysAllowed: Number(raw.total_days_allowed ?? raw.totalDaysAllowed ?? 0),
    isPaid: Boolean(raw.is_paid ?? raw.isPaid),
    carryForward: Boolean(raw.carry_forward ?? raw.carryForward),
    maxCarryForwardDays: Number(raw.max_carry_forward_days ?? raw.maxCarryForwardDays ?? 0),
    isActive: (raw.is_active ?? raw.isActive) === undefined ? undefined : Boolean(raw.is_active ?? raw.isActive),
    createdAt: (raw.created_at ?? raw.createdAt) as string | undefined,
  }
}

// ── Leave Applications ───────────────────────────────────────────────────────

export type LeaveApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
// The create-payload example repeated "APPROVED" for both the approve and
// reject/cancel sections (looks like a copy-paste slip) — REJECTED/CANCELLED
// are inferred from LeaveApplicationStatus, not separately confirmed.
export type LeaveReviewDecision = 'APPROVED' | 'REJECTED' | 'CANCELLED'

export interface LeaveApplication {
  id: string
  employeeId: string
  employeeName?: string
  leaveTypeId: string
  leaveTypeName?: string
  startDate: string
  endDate: string
  days?: number
  reason?: string
  status: LeaveApplicationStatus
  reviewedByUserId?: string
  reviewedAt?: string
  reviewComment?: string
  createdAt: string
}

function numOrUndef(...values: unknown[]): number | undefined {
  for (const v of values) {
    if (v !== undefined && v !== null) return Number(v)
  }
  return undefined
}

function normalizeLeaveApplication(raw: Record<string, unknown>): LeaveApplication {
  return {
    id: raw.id as string,
    employeeId: (raw.employee_id ?? raw.employeeId) as string,
    employeeName: (raw.employee_name ?? raw.employeeName) as string | undefined,
    leaveTypeId: (raw.leave_type_id ?? raw.leaveTypeId) as string,
    leaveTypeName: (raw.leave_type_name ?? raw.leaveTypeName) as string | undefined,
    startDate: (raw.start_date ?? raw.startDate) as string,
    endDate: (raw.end_date ?? raw.endDate) as string,
    days: numOrUndef(raw.days),
    reason: raw.reason as string | undefined,
    status: raw.status as LeaveApplicationStatus,
    reviewedByUserId: (raw.reviewed_by_user_id ?? raw.reviewedByUserId ?? raw.reviewed_by ?? raw.reviewedBy) as string | undefined,
    reviewedAt: (raw.reviewed_at ?? raw.reviewedAt) as string | undefined,
    reviewComment: (raw.review_comment ?? raw.reviewComment ?? raw.comment) as string | undefined,
    createdAt: (raw.created_at ?? raw.createdAt) as string,
  }
}

// ── Leave Balances ───────────────────────────────────────────────────────────

export interface LeaveBalanceEntry {
  leaveTypeId?: string
  leaveTypeName?: string
  leaveTypeCode?: string
  year?: string
  allocatedDays: number
  usedDays: number
  pendingDays?: number
  remainingDays?: number
}

function normalizeLeaveBalanceEntry(raw: Record<string, unknown>): LeaveBalanceEntry {
  return {
    leaveTypeId: (raw.leave_type_id ?? raw.leaveTypeId) as string | undefined,
    leaveTypeName: (raw.leave_type_name ?? raw.leaveTypeName ?? raw.leave_type ?? raw.leaveType) as string | undefined,
    leaveTypeCode: (raw.leave_type_code ?? raw.leaveTypeCode ?? raw.leave_code ?? raw.leaveCode) as string | undefined,
    year: raw.year !== undefined ? String(raw.year) : undefined,
    allocatedDays: Number(raw.allocated_days ?? raw.allocatedDays ?? raw.total_days ?? raw.totalDays ?? 0),
    usedDays: Number(raw.used_days ?? raw.usedDays ?? 0),
    pendingDays: numOrUndef(raw.pending_days, raw.pendingDays),
    remainingDays: numOrUndef(raw.remaining_days, raw.remainingDays, raw.balance_days, raw.balanceDays),
  }
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
  employeeCode?: string
  employeeName?: string
  departmentName?: string
  effectiveDate: string
  basicSalary: number
  grossSalary: number
  allowances: Record<string, number>
  deductions: Record<string, number>
  netSalary: number
  currency: string
  isActive: boolean
  postedToFinanceAt?: string
  journalEntryId?: string
  createdAt: string
  updatedAt?: string
}

export interface CreatePayrollRequest {
  employeeId: string
  effectiveDate: string
  basicSalary: number
  allowances: Record<string, number>
  deductions: Record<string, number>
  currency: string
}

export interface PayrollSummary {
  totalEmployees: number
  totalBasicSalary: number
  totalAllowances: number
  totalDeductions: number
  totalNetSalary: number
  byStatus: Record<string, { count: number; totalNet: number }>
  currency: string
}

function normalizePayrollRecord(raw: Record<string, unknown>): PayrollRecord {
  const toNum = (v: unknown) => (v == null ? 0 : parseFloat(String(v)) || 0)
  const toObj = (v: unknown): Record<string, number> => {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return {}
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>).map(([k, val]) => [k, toNum(val)])
    )
  }
  const firstName = (raw.first_name ?? raw.firstName ?? '') as string
  const lastName = (raw.last_name ?? raw.lastName ?? '') as string
  const employeeName = [firstName, lastName].filter(Boolean).join(' ') || undefined
  const allowances = toObj(raw.allowances)
  const deductions = toObj(raw.deductions)
  const basic = toNum(raw.basic_salary ?? raw.basicSalary)
  const gross = toNum(raw.gross_salary ?? raw.grossSalary)
  const net = toNum(raw.net_salary ?? raw.netSalary)
  return {
    id: raw.id as string,
    employeeId: (raw.employee_id ?? raw.employeeId) as string,
    employeeCode: (raw.employee_code ?? raw.employeeCode) as string | undefined,
    employeeName,
    departmentName: (raw.department_name ?? raw.departmentName) as string | undefined,
    effectiveDate: (raw.effective_date ?? raw.effectiveDate) as string,
    basicSalary: basic,
    grossSalary: gross || basic,
    allowances,
    deductions,
    netSalary: net,
    currency: (raw.currency as string) || 'PKR',
    isActive: Boolean(raw.is_active ?? raw.isActive),
    postedToFinanceAt: (raw.posted_to_finance_at ?? raw.postedToFinanceAt) as string | undefined,
    journalEntryId: (raw.journal_entry_id ?? raw.journalEntryId) as string | undefined,
    createdAt: (raw.created_at ?? raw.createdAt) as string,
    updatedAt: (raw.updated_at ?? raw.updatedAt) as string | undefined,
  }
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

  async getEmployees(params: { page?: number; limit?: number; search?: string; departmentId?: string; status?: EmployeeStatus; employmentType?: EmploymentType } = {}): Promise<Paginated<Employee>> {
    const q = new URLSearchParams()
    if (params.page) q.set('page', String(params.page))
    if (params.limit) q.set('limit', String(params.limit))
    if (params.search) q.set('search', params.search)
    if (params.departmentId) q.set('departmentId', params.departmentId)
    if (params.status) q.set('status', params.status)
    if (params.employmentType) q.set('employmentType', params.employmentType)
    const qs = q.toString()
    const { data, error } = await api.get<unknown>(`/hr/employees${qs ? `?${qs}` : ''}`)
    if (error) throw new Error(error)
    const paginated = toPaginated<Record<string, unknown>>(data)
    return { ...paginated, data: paginated.data.map(normalizeEmployee) }
  },

  async getEmployeeById(id: string): Promise<Employee | null> {
    const { data, error } = await api.get<Record<string, unknown>>(`/hr/employees/${id}`)
    if (error) throw new Error(error)
    return data ? normalizeEmployee(data) : null
  },

  async createEmployee(payload: CreateEmployeeRequest): Promise<{ employee: Employee | null; error?: string }> {
    const { data, error } = await api.post<Record<string, unknown>>('/hr/employees', payload)
    if (error || !data) return { employee: null, error: error || 'Failed to create employee' }
    return { employee: normalizeEmployee(data) }
  },

  async updateEmployee(id: string, payload: Partial<CreateEmployeeRequest>): Promise<{ employee: Employee | null; error?: string }> {
    const { data, error } = await api.patch<Record<string, unknown>>(`/hr/employees/${id}`, payload)
    if (error || !data) return { employee: null, error: error || 'Failed to update employee' }
    return { employee: normalizeEmployee(data) }
  },

  async updateEmployeeStatus(id: string, status: EmployeeStatus, reason?: string): Promise<boolean> {
    const { error } = await api.patch(`/hr/employees/${id}/status`, { status, reason })
    return !error
  },

  async deleteEmployee(id: string): Promise<boolean> {
    const { error } = await api.delete(`/hr/employees/${id}`)
    return !error
  },

  async linkEmployeeUser(id: string, userId: string): Promise<boolean> {
    const { error } = await api.post(`/hr/employees/${id}/link-user`, { userId })
    return !error
  },

  async updateProfilePicture(id: string, url: string): Promise<boolean> {
    const { error } = await api.patch(`/hr/employees/${id}/profile-picture`, { url })
    return !error
  },

  // ── Leave Types ──────────────────────────────────────────────────────────────

  async getLeaveTypes(): Promise<LeaveType[]> {
    const { data, error } = await api.get<unknown>('/hr/leaves/types')
    if (error) throw new Error(error)
    return toArray<Record<string, unknown>>(data).map(normalizeLeaveType)
  },

  async getLeaveTypeById(id: string): Promise<LeaveType | null> {
    const { data } = await api.get<Record<string, unknown>>(`/hr/leaves/types/${id}`)
    return data ? normalizeLeaveType(data) : null
  },

  async createLeaveType(payload: {
    name: string
    code: string
    description?: string
    totalDaysAllowed: number
    isPaid: boolean
    carryForward: boolean
    maxCarryForwardDays?: number
  }): Promise<{ leaveType: LeaveType | null; error?: string }> {
    const { data, error } = await api.post<Record<string, unknown>>('/hr/leaves/types', payload)
    if (error || !data) return { leaveType: null, error: error || 'Failed to create leave type' }
    return { leaveType: normalizeLeaveType(data) }
  },

  async updateLeaveType(id: string, payload: Partial<{
    name: string
    code: string
    description: string
    totalDaysAllowed: number
    isPaid: boolean
    carryForward: boolean
    maxCarryForwardDays: number
    isActive: boolean
  }>): Promise<LeaveType | null> {
    const { data } = await api.patch<Record<string, unknown>>(`/hr/leaves/types/${id}`, payload)
    return data ? normalizeLeaveType(data) : null
  },

  async deleteLeaveType(id: string): Promise<boolean> {
    const { error } = await api.delete(`/hr/leaves/types/${id}`)
    return !error
  },

  // ── Leave Allocation ─────────────────────────────────────────────────────────
  // No endpoint URL was given for this action — inferred from the sibling
  // resource naming (/hr/leaves/types, /hr/leaves/balances, /hr/leaves/applications).
  async allocateLeaveType(payload: { employeeId: string; leaveTypeId: string; year: string; days: number }): Promise<{ success: boolean; error?: string }> {
    const { error } = await api.post('/hr/leaves/allocations', payload)
    return { success: !error, error: error ?? undefined }
  },

  // ── Leave Balances ───────────────────────────────────────────────────────────
  async getLeaveBalance(employeeId: string, year?: string): Promise<LeaveBalanceEntry[]> {
    const qs = year ? `?year=${encodeURIComponent(year)}` : ''
    const { data, error } = await api.get<unknown>(`/hr/leaves/balances/${employeeId}${qs}`)
    if (error) throw new Error(error)
    return toArray<Record<string, unknown>>(data).map(normalizeLeaveBalanceEntry)
  },

  // ── Leave Applications ───────────────────────────────────────────────────────
  async getLeaveApplications(params: { page?: number; limit?: number; status?: LeaveApplicationStatus; employeeId?: string } = {}): Promise<Paginated<LeaveApplication>> {
    const q = new URLSearchParams()
    if (params.page) q.set('page', String(params.page))
    if (params.limit) q.set('limit', String(params.limit))
    if (params.status) q.set('status', params.status)
    if (params.employeeId) q.set('employeeId', params.employeeId)
    const qs = q.toString()
    const { data, error } = await api.get<unknown>(`/hr/leaves/applications${qs ? `?${qs}` : ''}`)
    if (error) throw new Error(error)
    const paginated = toPaginated<Record<string, unknown>>(data)
    return { ...paginated, data: paginated.data.map(normalizeLeaveApplication) }
  },

  async createLeaveApplication(payload: {
    employeeId: string
    leaveTypeId: string
    startDate: string
    endDate: string
    reason?: string
  }): Promise<{ application: LeaveApplication | null; error?: string }> {
    const { data, error } = await api.post<Record<string, unknown>>('/hr/leaves/applications', payload)
    if (error || !data) return { application: null, error: error || 'Failed to submit leave application' }
    return { application: normalizeLeaveApplication(data) }
  },

  async reviewLeaveApplication(id: string, decision: LeaveReviewDecision, comment?: string): Promise<{ application: LeaveApplication | null; error?: string }> {
    const { data, error } = await api.post<Record<string, unknown>>(`/hr/leaves/applications/${id}/review`, { decision, comment })
    if (error || !data) return { application: null, error: error || 'Failed to review leave application' }
    return { application: normalizeLeaveApplication(data) }
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

  async getPayroll(params: { page?: number; limit?: number; employeeId?: string; status?: string } = {}): Promise<Paginated<PayrollRecord>> {
    const q = new URLSearchParams()
    if (params.page) q.set('page', String(params.page))
    if (params.limit) q.set('limit', String(params.limit))
    if (params.employeeId) q.set('employeeId', params.employeeId)
    if (params.status) q.set('status', params.status)
    const qs = q.toString()
    const { data, error } = await api.get<unknown>(`/hr/payroll${qs ? `?${qs}` : ''}`)
    if (error) throw new Error(error)
    const paginated = toPaginated<Record<string, unknown>>(data)
    return { ...paginated, data: paginated.data.map(normalizePayrollRecord) }
  },

  async createPayroll(payload: CreatePayrollRequest): Promise<{ record: PayrollRecord | null; error?: string }> {
    const { data, error } = await api.post<Record<string, unknown>>('/hr/payroll', payload)
    if (error || !data) return { record: null, error: error || 'Failed to create payroll record' }
    return { record: normalizePayrollRecord(data) }
  },

  async getPayrollSummary(): Promise<PayrollSummary | null> {
    const { data, error } = await api.get<Record<string, unknown>>('/hr/payroll/summary')
    if (error) throw new Error(error)
    if (!data) return null
    const toNum = (v: unknown) => parseFloat(String(v ?? 0)) || 0
    return {
      totalEmployees: toNum(data.total_employees ?? data.totalEmployees),
      totalBasicSalary: toNum(data.total_basic_salary ?? data.totalBasicSalary),
      totalAllowances: toNum(data.total_allowances ?? data.totalAllowances),
      totalDeductions: toNum(data.total_deductions ?? data.totalDeductions),
      totalNetSalary: toNum(data.total_net_salary ?? data.totalNetSalary),
      byStatus: (data.by_status ?? data.byStatus ?? {}) as Record<string, { count: number; totalNet: number }>,
      currency: (data.currency as string) || 'PKR',
    }
  },

  async getPayrollById(id: string): Promise<PayrollRecord | null> {
    const { data, error } = await api.get<Record<string, unknown>>(`/hr/payroll/${id}`)
    if (error) throw new Error(error)
    return data ? normalizePayrollRecord(data) : null
  },

  // ── Departments ──────────────────────────────────────────────────────────────

  async getDepartments(params: { page?: number; limit?: number; search?: string } = {}): Promise<Paginated<Department>> {
    const q = new URLSearchParams()
    if (params.page) q.set('page', String(params.page))
    if (params.limit) q.set('limit', String(params.limit))
    if (params.search) q.set('search', params.search)
    const qs = q.toString()
    const { data, error } = await api.get<unknown>(`/hr/departments${qs ? `?${qs}` : ''}`)
    if (error) throw new Error(error)
    return toPaginated<Department>(data)
  },

  async getDepartmentById(id: string): Promise<Department | null> {
    const { data, error } = await api.get<Department>(`/hr/departments/${id}`)
    if (error) throw new Error(error)
    return data || null
  },

  async createDepartment(payload: CreateDepartmentRequest): Promise<{ department: Department | null; error?: string }> {
    const { data, error } = await api.post<Department>('/hr/departments', payload)
    if (error || !data) return { department: null, error: error || 'Failed to create department' }
    return { department: data }
  },

  async updateDepartment(id: string, payload: Partial<CreateDepartmentRequest>): Promise<{ department: Department | null; error?: string }> {
    const { data, error } = await api.patch<Department>(`/hr/departments/${id}`, payload)
    if (error || !data) return { department: null, error: error || 'Failed to update department' }
    return { department: data }
  },

  async deleteDepartment(id: string): Promise<boolean> {
    const { error } = await api.delete(`/hr/departments/${id}`)
    return !error
  },

  // ── Designations ─────────────────────────────────────────────────────────────

  async getDesignations(params: { page?: number; limit?: number; search?: string; departmentId?: string } = {}): Promise<Paginated<Designation>> {
    const q = new URLSearchParams()
    if (params.page) q.set('page', String(params.page))
    if (params.limit) q.set('limit', String(params.limit))
    if (params.search) q.set('search', params.search)
    if (params.departmentId) q.set('departmentId', params.departmentId)
    const qs = q.toString()
    const { data, error } = await api.get<unknown>(`/hr/designations${qs ? `?${qs}` : ''}`)
    if (error) throw new Error(error)
    if (Array.isArray(data)) return { data: data as Designation[], total: (data as Designation[]).length, page: 1, limit: 200 }
    const p = data as Paginated<Designation>
    return p || { data: [], total: 0, page: 1, limit: 20 }
  },

  async getDesignationById(id: string): Promise<Designation | null> {
    const { data, error } = await api.get<Designation>(`/hr/designations/${id}`)
    if (error) throw new Error(error)
    return data || null
  },

  async createDesignation(payload: CreateDesignationRequest): Promise<{ designation: Designation | null; error?: string }> {
    const { data, error } = await api.post<Designation>('/hr/designations', payload)
    if (error || !data) return { designation: null, error: error || 'Failed to create designation' }
    return { designation: data }
  },

  async updateDesignation(id: string, payload: Partial<CreateDesignationRequest>): Promise<{ designation: Designation | null; error?: string }> {
    const { data, error } = await api.patch<Designation>(`/hr/designations/${id}`, payload)
    if (error || !data) return { designation: null, error: error || 'Failed to update designation' }
    return { designation: data }
  },

  async deleteDesignation(id: string): Promise<boolean> {
    const { error } = await api.delete(`/hr/designations/${id}`)
    return !error
  },
}

// Backward-compatible alias — some pages still import employeeService
export const employeeService = hrService
