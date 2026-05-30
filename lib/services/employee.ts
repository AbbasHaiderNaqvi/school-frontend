import { storage, STORAGE_KEYS } from './storage'
import type { Employee, JobOpening, JobApplication, LeaveRequest } from '../types'
import { generateId } from '../utils'
import { auditService } from './audit'

// Initialize demo data
const initializeEmployeeData = (tenantId: string): void => {
  const employees = storage.get<Employee[]>(STORAGE_KEYS.EMPLOYEES) || []
  const jobOpenings = storage.get<JobOpening[]>(STORAGE_KEYS.JOB_OPENINGS) || []
  const leaveRequests = storage.get<LeaveRequest[]>(STORAGE_KEYS.LEAVE_REQUESTS) || []

  if (employees.filter(e => e.tenantId === tenantId).length === 0) {
    const demoEmployees: Employee[] = [
      {
        id: generateId(), tenantId, userId: 'user_1', employeeCode: 'EMP001', name: 'John Teacher',
        email: 'john@school.com', phone: '+1234567890', department: 'Science', designation: 'Senior Teacher',
        joiningDate: '2020-01-15', salary: 55000, status: 'active', leaveBalance: 15,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      },
      {
        id: generateId(), tenantId, userId: 'user_2', employeeCode: 'EMP002', name: 'Sarah Accountant',
        email: 'sarah@school.com', phone: '+1234567891', department: 'Finance', designation: 'Accountant',
        joiningDate: '2019-06-01', salary: 45000, status: 'active', leaveBalance: 12,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      },
      {
        id: generateId(), tenantId, userId: 'user_3', employeeCode: 'EMP003', name: 'Mike HR',
        email: 'mike@school.com', phone: '+1234567892', department: 'Human Resources', designation: 'HR Manager',
        joiningDate: '2018-03-10', salary: 60000, status: 'active', leaveBalance: 18,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      },
      {
        id: generateId(), tenantId, userId: 'user_4', employeeCode: 'EMP004', name: 'Emily Math',
        email: 'emily@school.com', phone: '+1234567893', department: 'Mathematics', designation: 'Teacher',
        joiningDate: '2021-08-15', salary: 48000, status: 'on_leave', leaveBalance: 8,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      },
      {
        id: generateId(), tenantId, userId: 'user_5', employeeCode: 'EMP005', name: 'David Sports',
        email: 'david@school.com', phone: '+1234567894', department: 'Physical Education', designation: 'Sports Coach',
        joiningDate: '2022-02-01', salary: 42000, status: 'active', leaveBalance: 10,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      },
    ]
    storage.set(STORAGE_KEYS.EMPLOYEES, [...employees, ...demoEmployees])
  }

  if (jobOpenings.filter(j => j.tenantId === tenantId).length === 0) {
    const demoJobs: JobOpening[] = [
      {
        id: generateId(), tenantId, title: 'English Teacher', department: 'Languages',
        description: 'Looking for an experienced English teacher', requirements: ['BA in English', '3+ years experience', 'Good communication'],
        status: 'open', applicationsCount: 5, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      },
      {
        id: generateId(), tenantId, title: 'Lab Assistant', department: 'Science',
        description: 'Lab assistant for science department', requirements: ['Science background', 'Lab safety knowledge'],
        status: 'open', applicationsCount: 3, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      },
    ]
    storage.set(STORAGE_KEYS.JOB_OPENINGS, [...jobOpenings, ...demoJobs])
  }

  if (leaveRequests.filter(l => l.tenantId === tenantId).length === 0) {
    const demoLeaves: LeaveRequest[] = [
      {
        id: generateId(), tenantId, employeeId: 'emp_1', employeeName: 'John Teacher', leaveType: 'sick',
        startDate: '2025-02-01', endDate: '2025-02-03', reason: 'Medical appointment', status: 'pending',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      },
      {
        id: generateId(), tenantId, employeeId: 'emp_2', employeeName: 'Emily Math', leaveType: 'casual',
        startDate: '2025-01-28', endDate: '2025-02-05', reason: 'Family vacation', status: 'approved', approvedBy: 'Mike HR',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      },
    ]
    storage.set(STORAGE_KEYS.LEAVE_REQUESTS, [...leaveRequests, ...demoLeaves])
  }
}

export const employeeService = {
  // Employees
  async getEmployees(tenantId: string): Promise<Employee[]> {
    initializeEmployeeData(tenantId)
    const employees = storage.get<Employee[]>(STORAGE_KEYS.EMPLOYEES) || []
    return employees.filter(e => e.tenantId === tenantId)
  },

  async getEmployeeById(id: string): Promise<Employee | null> {
    const employees = storage.get<Employee[]>(STORAGE_KEYS.EMPLOYEES) || []
    return employees.find(e => e.id === id) || null
  },

  async createEmployee(data: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>): Promise<Employee> {
    const employees = storage.get<Employee[]>(STORAGE_KEYS.EMPLOYEES) || []
    
    const newEmployee: Employee = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    employees.push(newEmployee)
    storage.set(STORAGE_KEYS.EMPLOYEES, employees)

    auditService.log({
      action: 'CREATE',
      entity: 'Employee',
      entityId: newEmployee.id,
      details: `Created employee: ${data.name}`,
      tenantId: data.tenantId,
    })

    return newEmployee
  },

  async updateEmployee(id: string, data: Partial<Employee>): Promise<Employee | null> {
    const employees = storage.get<Employee[]>(STORAGE_KEYS.EMPLOYEES) || []
    const index = employees.findIndex(e => e.id === id)
    
    if (index === -1) return null

    employees[index] = { ...employees[index], ...data, updatedAt: new Date().toISOString() }
    storage.set(STORAGE_KEYS.EMPLOYEES, employees)

    auditService.log({
      action: 'UPDATE',
      entity: 'Employee',
      entityId: id,
      details: `Updated employee: ${employees[index].name}`,
      tenantId: employees[index].tenantId,
    })

    return employees[index]
  },

  async terminateEmployee(id: string): Promise<Employee | null> {
    return this.updateEmployee(id, { status: 'terminated' })
  },

  // Job Openings
  async getJobOpenings(tenantId: string): Promise<JobOpening[]> {
    initializeEmployeeData(tenantId)
    const openings = storage.get<JobOpening[]>(STORAGE_KEYS.JOB_OPENINGS) || []
    return openings.filter(j => j.tenantId === tenantId)
  },

  async createJobOpening(data: Omit<JobOpening, 'id' | 'createdAt' | 'updatedAt' | 'applicationsCount'>): Promise<JobOpening> {
    const openings = storage.get<JobOpening[]>(STORAGE_KEYS.JOB_OPENINGS) || []
    
    const newOpening: JobOpening = {
      ...data,
      id: generateId(),
      applicationsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    openings.push(newOpening)
    storage.set(STORAGE_KEYS.JOB_OPENINGS, openings)

    return newOpening
  },

  async updateJobOpening(id: string, data: Partial<JobOpening>): Promise<JobOpening | null> {
    const openings = storage.get<JobOpening[]>(STORAGE_KEYS.JOB_OPENINGS) || []
    const index = openings.findIndex(j => j.id === id)
    
    if (index === -1) return null

    openings[index] = { ...openings[index], ...data, updatedAt: new Date().toISOString() }
    storage.set(STORAGE_KEYS.JOB_OPENINGS, openings)

    return openings[index]
  },

  // Job Applications
  async getJobApplications(tenantId: string, jobOpeningId?: string): Promise<JobApplication[]> {
    const applications = storage.get<JobApplication[]>(STORAGE_KEYS.JOB_APPLICATIONS) || []
    let filtered = applications.filter(a => a.tenantId === tenantId)
    if (jobOpeningId) {
      filtered = filtered.filter(a => a.jobOpeningId === jobOpeningId)
    }
    return filtered
  },

  async createJobApplication(data: Omit<JobApplication, 'id' | 'createdAt' | 'updatedAt'>): Promise<JobApplication> {
    const applications = storage.get<JobApplication[]>(STORAGE_KEYS.JOB_APPLICATIONS) || []
    
    const newApplication: JobApplication = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    applications.push(newApplication)
    storage.set(STORAGE_KEYS.JOB_APPLICATIONS, applications)

    // Update job opening count
    const openings = storage.get<JobOpening[]>(STORAGE_KEYS.JOB_OPENINGS) || []
    const openingIndex = openings.findIndex(j => j.id === data.jobOpeningId)
    if (openingIndex !== -1) {
      openings[openingIndex].applicationsCount++
      storage.set(STORAGE_KEYS.JOB_OPENINGS, openings)
    }

    return newApplication
  },

  async updateApplicationStatus(id: string, status: JobApplication['status']): Promise<JobApplication | null> {
    const applications = storage.get<JobApplication[]>(STORAGE_KEYS.JOB_APPLICATIONS) || []
    const index = applications.findIndex(a => a.id === id)
    
    if (index === -1) return null

    applications[index] = { ...applications[index], status, updatedAt: new Date().toISOString() }
    storage.set(STORAGE_KEYS.JOB_APPLICATIONS, applications)

    return applications[index]
  },

  // Leave Requests
  async getLeaveRequests(tenantId: string): Promise<LeaveRequest[]> {
    initializeEmployeeData(tenantId)
    const requests = storage.get<LeaveRequest[]>(STORAGE_KEYS.LEAVE_REQUESTS) || []
    return requests.filter(l => l.tenantId === tenantId)
  },

  async createLeaveRequest(data: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveRequest> {
    const requests = storage.get<LeaveRequest[]>(STORAGE_KEYS.LEAVE_REQUESTS) || []
    
    const newRequest: LeaveRequest = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    requests.push(newRequest)
    storage.set(STORAGE_KEYS.LEAVE_REQUESTS, requests)

    return newRequest
  },

  async approveLeaveRequest(id: string, approvedBy: string): Promise<LeaveRequest | null> {
    const requests = storage.get<LeaveRequest[]>(STORAGE_KEYS.LEAVE_REQUESTS) || []
    const index = requests.findIndex(l => l.id === id)
    
    if (index === -1) return null

    requests[index] = {
      ...requests[index],
      status: 'approved',
      approvedBy,
      updatedAt: new Date().toISOString(),
    }

    storage.set(STORAGE_KEYS.LEAVE_REQUESTS, requests)

    return requests[index]
  },

  async rejectLeaveRequest(id: string): Promise<LeaveRequest | null> {
    const requests = storage.get<LeaveRequest[]>(STORAGE_KEYS.LEAVE_REQUESTS) || []
    const index = requests.findIndex(l => l.id === id)
    
    if (index === -1) return null

    requests[index] = { ...requests[index], status: 'rejected', updatedAt: new Date().toISOString() }
    storage.set(STORAGE_KEYS.LEAVE_REQUESTS, requests)

    return requests[index]
  },

  // Stats
  async getHRStats(tenantId: string): Promise<{
    totalEmployees: number
    activeEmployees: number
    onLeave: number
    pendingLeaves: number
    openPositions: number
  }> {
    const employees = await this.getEmployees(tenantId)
    const leaveRequests = await this.getLeaveRequests(tenantId)
    const jobOpenings = await this.getJobOpenings(tenantId)

    return {
      totalEmployees: employees.length,
      activeEmployees: employees.filter(e => e.status === 'active').length,
      onLeave: employees.filter(e => e.status === 'on_leave').length,
      pendingLeaves: leaveRequests.filter(l => l.status === 'pending').length,
      openPositions: jobOpenings.filter(j => j.status === 'open').length,
    }
  },
}
