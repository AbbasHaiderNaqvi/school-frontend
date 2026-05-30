import { storage, STORAGE_KEYS } from './storage'
import type { Employee, JobOpening, JobApplication, LeaveRequest } from '../types'
import { generateId } from '../utils'
import { auditService } from './audit'

// Initialize demo employee data
function initializeEmployeeData(tenantId: string) {
  const employees = storage.get<Employee[]>(STORAGE_KEYS.EMPLOYEES) || []
  
  if (employees.filter(e => e.tenantId === tenantId).length === 0) {
    const demoEmployees: Employee[] = [
      {
        id: generateId(),
        tenantId,
        userId: 'user_teacher_1',
        employeeCode: 'EMP001',
        name: 'Mrs. Noor Jahan',
        email: 'teacher@mdgrammar.edu',
        phone: '+880-1711-000001',
        department: 'Teaching',
        designation: 'Senior Teacher',
        joiningDate: '2020-01-15',
        salary: 35000,
        status: 'active',
        leaveBalance: 12,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: generateId(),
        tenantId,
        userId: 'user_hr_1',
        employeeCode: 'EMP002',
        name: 'Mr. Arif Hassan',
        email: 'hr@mdgrammar.edu',
        phone: '+880-1711-000002',
        department: 'Administration',
        designation: 'HR Manager',
        joiningDate: '2019-06-01',
        salary: 42000,
        status: 'active',
        leaveBalance: 8,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: generateId(),
        tenantId,
        userId: 'user_accountant_1',
        employeeCode: 'EMP003',
        name: 'Ms. Nasrin Ahmed',
        email: 'accountant@mdgrammar.edu',
        phone: '+880-1711-000003',
        department: 'Finance',
        designation: 'Senior Accountant',
        joiningDate: '2018-03-10',
        salary: 38000,
        status: 'active',
        leaveBalance: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: generateId(),
        tenantId,
        userId: 'user_principal_1',
        employeeCode: 'EMP004',
        name: 'Dr. Fatima Begum',
        email: 'principal@mdgrammar.edu',
        phone: '+880-1711-000004',
        department: 'Administration',
        designation: 'Principal',
        joiningDate: '2015-01-01',
        salary: 60000,
        status: 'active',
        leaveBalance: 15,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: generateId(),
        tenantId,
        userId: 'user_vp_1',
        employeeCode: 'EMP005',
        name: 'Mr. Jahir Uddin',
        email: 'vp@mdgrammar.edu',
        phone: '+880-1711-000005',
        department: 'Administration',
        designation: 'Vice Principal',
        joiningDate: '2016-07-15',
        salary: 50000,
        status: 'active',
        leaveBalance: 14,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]

    storage.set(STORAGE_KEYS.EMPLOYEES, [...employees, ...demoEmployees])
  }
}

export const hrService = {
  // Employee Management
  async getEmployees(tenantId: string): Promise<Employee[]> {
    initializeEmployeeData(tenantId)
    const employees = storage.get<Employee[]>(STORAGE_KEYS.EMPLOYEES) || []
    return employees.filter(e => e.tenantId === tenantId)
  },

  async getEmployeesByTenant(tenantId: string): Promise<Employee[]> {
    return this.getEmployees(tenantId)
  },

  async getEmployee(id: string): Promise<Employee | null> {
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

    employees[index] = {
      ...employees[index],
      ...data,
      updatedAt: new Date().toISOString(),
    }
    
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

  async deleteEmployee(id: string): Promise<boolean> {
    const employees = storage.get<Employee[]>(STORAGE_KEYS.EMPLOYEES) || []
    const index = employees.findIndex(e => e.id === id)
    
    if (index === -1) return false

    const employee = employees[index]
    employees.splice(index, 1)
    storage.set(STORAGE_KEYS.EMPLOYEES, employees)

    auditService.log({
      action: 'DELETE',
      entity: 'Employee',
      entityId: id,
      details: `Deleted employee: ${employee.name}`,
      tenantId: employee.tenantId,
    })

    return true
  },

  // Job Openings
  async getJobOpenings(tenantId: string): Promise<JobOpening[]> {
    const jobs = storage.get<JobOpening[]>(STORAGE_KEYS.JOB_OPENINGS) || []
    return jobs.filter(j => j.tenantId === tenantId)
  },

  async createJobOpening(data: Omit<JobOpening, 'id' | 'createdAt' | 'updatedAt'>): Promise<JobOpening> {
    const jobs = storage.get<JobOpening[]>(STORAGE_KEYS.JOB_OPENINGS) || []
    
    const newJob: JobOpening = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    jobs.push(newJob)
    storage.set(STORAGE_KEYS.JOB_OPENINGS, jobs)

    return newJob
  },

  async updateJobOpening(id: string, data: Partial<JobOpening>): Promise<JobOpening | null> {
    const jobs = storage.get<JobOpening[]>(STORAGE_KEYS.JOB_OPENINGS) || []
    const index = jobs.findIndex(j => j.id === id)
    
    if (index === -1) return null

    jobs[index] = {
      ...jobs[index],
      ...data,
      updatedAt: new Date().toISOString(),
    }
    
    storage.set(STORAGE_KEYS.JOB_OPENINGS, jobs)
    return jobs[index]
  },

  // Leave Requests
  async getLeaveRequests(tenantId: string): Promise<LeaveRequest[]> {
    const leaves = storage.get<LeaveRequest[]>(STORAGE_KEYS.LEAVE_REQUESTS) || []
    return leaves.filter(l => l.tenantId === tenantId)
  },

  async createLeaveRequest(data: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveRequest> {
    const leaves = storage.get<LeaveRequest[]>(STORAGE_KEYS.LEAVE_REQUESTS) || []
    
    const newLeave: LeaveRequest = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    leaves.push(newLeave)
    storage.set(STORAGE_KEYS.LEAVE_REQUESTS, leaves)

    return newLeave
  },

  async updateLeaveRequest(id: string, data: Partial<LeaveRequest>): Promise<LeaveRequest | null> {
    const leaves = storage.get<LeaveRequest[]>(STORAGE_KEYS.LEAVE_REQUESTS) || []
    const index = leaves.findIndex(l => l.id === id)
    
    if (index === -1) return null

    leaves[index] = {
      ...leaves[index],
      ...data,
      updatedAt: new Date().toISOString(),
    }
    
    storage.set(STORAGE_KEYS.LEAVE_REQUESTS, leaves)

    auditService.log({
      action: 'UPDATE',
      entity: 'LeaveRequest',
      entityId: id,
      details: `Updated leave request status: ${data.status}`,
      tenantId: leaves[index].tenantId,
    })

    return leaves[index]
  },

  // Stats
  async getHRStats(tenantId: string): Promise<{
    totalEmployees: number
    activeEmployees: number
    onLeave: number
    pendingLeaves: number
    openJobs: number
  }> {
    const employees = await this.getEmployees(tenantId)
    const leaves = await this.getLeaveRequests(tenantId)
    const jobs = await this.getJobOpenings(tenantId)

    return {
      totalEmployees: employees.length,
      activeEmployees: employees.filter(e => e.status === 'active').length,
      onLeave: employees.filter(e => e.status === 'on_leave').length,
      pendingLeaves: leaves.filter(l => l.status === 'pending').length,
      openJobs: jobs.filter(j => j.status === 'open').length,
    }
  },
}

// Export alias for compatibility
export const employeeService = hrService
