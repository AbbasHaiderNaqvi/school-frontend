import { storage, STORAGE_KEYS } from './storage'
import type { Student, StudentFee, StudentFeeComponent, BulkFeeUpdate, FeeStructure } from '../types'
import { generateId } from '../utils'
import { auditService } from './audit'

// Initialize demo students
const initializeStudentData = (tenantId: string): void => {
  const students = storage.get<Student[]>(STORAGE_KEYS.STUDENTS) || []
  const studentFees = storage.get<StudentFee[]>(STORAGE_KEYS.STUDENT_FEES) || []

  if (students.filter(s => s.tenantId === tenantId).length === 0) {
    const classes = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5']
    const demoStudents: Student[] = []
    
    classes.forEach((className, classIndex) => {
      for (let i = 1; i <= 8; i++) {
        demoStudents.push({
          id: generateId(),
          tenantId,
          name: getRandomName(),
          rollNumber: `${className.replace('Grade ', '')}${String(i).padStart(3, '0')}`,
          className,
          section: i <= 4 ? 'A' : 'B',
          email: `student${classIndex}${i}@school.com`,
          phone: `555-${String(classIndex).padStart(2, '0')}${String(i).padStart(2, '0')}`,
          parentName: `Parent of Student ${classIndex}${i}`,
          parentPhone: `555-${String(classIndex + 10).padStart(2, '0')}${String(i).padStart(2, '0')}`,
          admissionDate: '2024-04-01',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      }
    })

    storage.set(STORAGE_KEYS.STUDENTS, [...students, ...demoStudents])

    // Initialize student fees for each student
    const baseFeeComponents: Record<string, number[]> = {
      'Grade 1': [5000, 500, 200, 300],
      'Grade 2': [5500, 600, 200, 350],
      'Grade 3': [6000, 700, 250, 400],
      'Grade 4': [6500, 800, 250, 450],
      'Grade 5': [7000, 900, 300, 500],
    }

    const componentNames = ['Tuition Fee', 'Lab Fee', 'Library Fee', 'Activity Fee']

    const newStudentFees: StudentFee[] = demoStudents.map((student, idx) => {
      const baseAmounts = baseFeeComponents[student.className] || baseFeeComponents['Grade 1']
      const components: StudentFeeComponent[] = componentNames.map((name, compIdx) => ({
        id: generateId(),
        componentName: name,
        baseAmount: baseAmounts[compIdx],
        adjustedAmount: baseAmounts[compIdx],
        paidAmount: idx % 4 === 0 ? baseAmounts[compIdx] : idx % 4 === 1 ? Math.floor(baseAmounts[compIdx] * 0.5) : 0,
        dueDate: '2025-09-01',
        status: idx % 4 === 0 ? 'paid' : idx % 4 === 1 ? 'partial' : idx % 5 === 0 ? 'overdue' : 'pending',
      }))

      const totalAmount = components.reduce((sum, c) => sum + c.adjustedAmount, 0)
      const paidAmount = components.reduce((sum, c) => sum + c.paidAmount, 0)

      return {
        id: generateId(),
        tenantId,
        studentId: student.id,
        studentName: student.name,
        className: student.className,
        rollNumber: student.rollNumber,
        academicYear: '2025-2026',
        feeComponents: components,
        totalAmount,
        paidAmount,
        discountPercentage: idx % 7 === 0 ? 10 : 0,
        discountAmount: idx % 7 === 0 ? totalAmount * 0.1 : 0,
        scholarshipPercentage: idx % 10 === 0 ? 25 : 0,
        scholarshipAmount: idx % 10 === 0 ? totalAmount * 0.25 : 0,
        netAmount: totalAmount - (idx % 7 === 0 ? totalAmount * 0.1 : 0) - (idx % 10 === 0 ? totalAmount * 0.25 : 0),
        status: idx % 4 === 0 ? 'paid' : idx % 4 === 1 ? 'partial' : idx % 5 === 0 ? 'overdue' : 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    })

    storage.set(STORAGE_KEYS.STUDENT_FEES, [...studentFees, ...newStudentFees])
  }
}

const firstNames = ['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason', 'Isabella', 'William', 'Mia', 'James', 'Charlotte', 'Benjamin', 'Amelia', 'Lucas', 'Harper', 'Henry', 'Evelyn', 'Alexander']
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin']

function getRandomName(): string {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]
  return `${firstName} ${lastName}`
}

export const studentService = {
  // Students
  async getStudents(tenantId: string): Promise<Student[]> {
    initializeStudentData(tenantId)
    const students = storage.get<Student[]>(STORAGE_KEYS.STUDENTS) || []
    return students.filter(s => s.tenantId === tenantId)
  },

  async getStudentsByClass(tenantId: string, className: string): Promise<Student[]> {
    const students = await this.getStudents(tenantId)
    return students.filter(s => s.className === className)
  },

  async getStudent(studentId: string): Promise<Student | null> {
    const students = storage.get<Student[]>(STORAGE_KEYS.STUDENTS) || []
    return students.find(s => s.id === studentId) || null
  },

  async createStudent(data: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>): Promise<Student> {
    const students = storage.get<Student[]>(STORAGE_KEYS.STUDENTS) || []
    
    const newStudent: Student = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    students.push(newStudent)
    storage.set(STORAGE_KEYS.STUDENTS, students)

    auditService.log({
      action: 'CREATE',
      entity: 'Student',
      entityId: newStudent.id,
      details: `Created student ${data.name}`,
      tenantId: data.tenantId,
    })

    return newStudent
  },

  async updateStudent(id: string, data: Partial<Student>): Promise<Student | null> {
    const students = storage.get<Student[]>(STORAGE_KEYS.STUDENTS) || []
    const index = students.findIndex(s => s.id === id)
    
    if (index === -1) return null

    students[index] = { ...students[index], ...data, updatedAt: new Date().toISOString() }
    storage.set(STORAGE_KEYS.STUDENTS, students)

    return students[index]
  },

  // Student Fees
  async getStudentFees(tenantId: string): Promise<StudentFee[]> {
    initializeStudentData(tenantId)
    const fees = storage.get<StudentFee[]>(STORAGE_KEYS.STUDENT_FEES) || []
    return fees.filter(f => f.tenantId === tenantId)
  },

  async getStudentFeesByClass(tenantId: string, className: string): Promise<StudentFee[]> {
    const fees = await this.getStudentFees(tenantId)
    return fees.filter(f => f.className === className)
  },

  async getStudentFee(studentFeeId: string): Promise<StudentFee | null> {
    const fees = storage.get<StudentFee[]>(STORAGE_KEYS.STUDENT_FEES) || []
    return fees.find(f => f.id === studentFeeId) || null
  },

  async getStudentFeeByStudentId(studentId: string, academicYear?: string): Promise<StudentFee | null> {
    const fees = storage.get<StudentFee[]>(STORAGE_KEYS.STUDENT_FEES) || []
    return fees.find(f => f.studentId === studentId && (!academicYear || f.academicYear === academicYear)) || null
  },

  async createStudentFee(data: Omit<StudentFee, 'id' | 'createdAt' | 'updatedAt'>): Promise<StudentFee> {
    const fees = storage.get<StudentFee[]>(STORAGE_KEYS.STUDENT_FEES) || []
    
    const newFee: StudentFee = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    fees.push(newFee)
    storage.set(STORAGE_KEYS.STUDENT_FEES, fees)

    auditService.log({
      action: 'CREATE',
      entity: 'StudentFee',
      entityId: newFee.id,
      details: `Created fee record for ${data.studentName}`,
      tenantId: data.tenantId,
    })

    return newFee
  },

  async updateStudentFee(id: string, data: Partial<StudentFee>): Promise<StudentFee | null> {
    const fees = storage.get<StudentFee[]>(STORAGE_KEYS.STUDENT_FEES) || []
    const index = fees.findIndex(f => f.id === id)
    
    if (index === -1) return null

    // Recalculate totals if components changed
    let updatedData = { ...data }
    if (data.feeComponents) {
      const totalAmount = data.feeComponents.reduce((sum, c) => sum + c.adjustedAmount, 0)
      const paidAmount = data.feeComponents.reduce((sum, c) => sum + c.paidAmount, 0)
      const discountAmount = totalAmount * ((data.discountPercentage ?? fees[index].discountPercentage) / 100)
      const scholarshipAmount = totalAmount * ((data.scholarshipPercentage ?? fees[index].scholarshipPercentage) / 100)
      
      updatedData = {
        ...updatedData,
        totalAmount,
        paidAmount,
        discountAmount,
        scholarshipAmount,
        netAmount: totalAmount - discountAmount - scholarshipAmount,
      }
    }

    fees[index] = { ...fees[index], ...updatedData, updatedAt: new Date().toISOString() }
    storage.set(STORAGE_KEYS.STUDENT_FEES, fees)

    return fees[index]
  },

  // Bulk Fee Operations
  async bulkUpdateFees(tenantId: string, update: BulkFeeUpdate): Promise<{ success: number; failed: number }> {
    const fees = storage.get<StudentFee[]>(STORAGE_KEYS.STUDENT_FEES) || []
    let successCount = 0
    let failedCount = 0

    const updatedFees = fees.map(fee => {
      if (!update.studentIds.includes(fee.studentId) || fee.tenantId !== tenantId) {
        return fee
      }

      try {
        let updatedComponents = [...fee.feeComponents]

        switch (update.updateType) {
          case 'fixed_amount':
            if (update.componentId) {
              updatedComponents = updatedComponents.map(c => 
                c.id === update.componentId 
                  ? { ...c, adjustedAmount: update.value }
                  : c
              )
            } else {
              // Apply fixed amount to all components proportionally
              const totalBase = updatedComponents.reduce((sum, c) => sum + c.baseAmount, 0)
              updatedComponents = updatedComponents.map(c => ({
                ...c,
                adjustedAmount: Math.round((c.baseAmount / totalBase) * update.value)
              }))
            }
            break

          case 'percentage_increase':
            if (update.componentId) {
              updatedComponents = updatedComponents.map(c => 
                c.id === update.componentId 
                  ? { ...c, adjustedAmount: Math.round(c.adjustedAmount * (1 + update.value / 100)) }
                  : c
              )
            } else {
              updatedComponents = updatedComponents.map(c => ({
                ...c,
                adjustedAmount: Math.round(c.adjustedAmount * (1 + update.value / 100))
              }))
            }
            break

          case 'percentage_decrease':
            if (update.componentId) {
              updatedComponents = updatedComponents.map(c => 
                c.id === update.componentId 
                  ? { ...c, adjustedAmount: Math.round(c.adjustedAmount * (1 - update.value / 100)) }
                  : c
              )
            } else {
              updatedComponents = updatedComponents.map(c => ({
                ...c,
                adjustedAmount: Math.round(c.adjustedAmount * (1 - update.value / 100))
              }))
            }
            break

          case 'set_discount':
            const totalAmountForDiscount = updatedComponents.reduce((sum, c) => sum + c.adjustedAmount, 0)
            return {
              ...fee,
              feeComponents: updatedComponents,
              discountPercentage: update.value,
              discountAmount: Math.round(totalAmountForDiscount * (update.value / 100)),
              netAmount: totalAmountForDiscount - Math.round(totalAmountForDiscount * (update.value / 100)) - fee.scholarshipAmount,
              updatedAt: new Date().toISOString(),
            }

          case 'set_scholarship':
            const totalAmountForScholarship = updatedComponents.reduce((sum, c) => sum + c.adjustedAmount, 0)
            return {
              ...fee,
              feeComponents: updatedComponents,
              scholarshipPercentage: update.value,
              scholarshipAmount: Math.round(totalAmountForScholarship * (update.value / 100)),
              netAmount: totalAmountForScholarship - fee.discountAmount - Math.round(totalAmountForScholarship * (update.value / 100)),
              updatedAt: new Date().toISOString(),
            }
        }

        const totalAmount = updatedComponents.reduce((sum, c) => sum + c.adjustedAmount, 0)
        const paidAmount = updatedComponents.reduce((sum, c) => sum + c.paidAmount, 0)
        const discountAmount = Math.round(totalAmount * (fee.discountPercentage / 100))
        const scholarshipAmount = Math.round(totalAmount * (fee.scholarshipPercentage / 100))

        successCount++
        return {
          ...fee,
          feeComponents: updatedComponents,
          totalAmount,
          paidAmount,
          discountAmount,
          scholarshipAmount,
          netAmount: totalAmount - discountAmount - scholarshipAmount,
          updatedAt: new Date().toISOString(),
        }
      } catch {
        failedCount++
        return fee
      }
    })

    storage.set(STORAGE_KEYS.STUDENT_FEES, updatedFees)

    auditService.log({
      action: 'BULK_UPDATE',
      entity: 'StudentFee',
      entityId: 'multiple',
      details: `Bulk updated fees for ${successCount} students (${update.updateType}: ${update.value})`,
      tenantId,
    })

    return { success: successCount, failed: failedCount }
  },

  // Update single component for a student
  async updateStudentFeeComponent(
    studentFeeId: string, 
    componentId: string, 
    newAmount: number
  ): Promise<StudentFee | null> {
    const fees = storage.get<StudentFee[]>(STORAGE_KEYS.STUDENT_FEES) || []
    const index = fees.findIndex(f => f.id === studentFeeId)
    
    if (index === -1) return null

    const updatedComponents = fees[index].feeComponents.map(c => 
      c.id === componentId ? { ...c, adjustedAmount: newAmount } : c
    )

    const totalAmount = updatedComponents.reduce((sum, c) => sum + c.adjustedAmount, 0)
    const paidAmount = updatedComponents.reduce((sum, c) => sum + c.paidAmount, 0)
    const discountAmount = Math.round(totalAmount * (fees[index].discountPercentage / 100))
    const scholarshipAmount = Math.round(totalAmount * (fees[index].scholarshipPercentage / 100))

    fees[index] = {
      ...fees[index],
      feeComponents: updatedComponents,
      totalAmount,
      paidAmount,
      discountAmount,
      scholarshipAmount,
      netAmount: totalAmount - discountAmount - scholarshipAmount,
      updatedAt: new Date().toISOString(),
    }

    storage.set(STORAGE_KEYS.STUDENT_FEES, fees)
    return fees[index]
  },

  // Get unique class names
  async getClasses(tenantId: string): Promise<string[]> {
    const students = await this.getStudents(tenantId)
    return [...new Set(students.map(s => s.className))].sort()
  },

  // Get fee summary by class
  async getFeeSummaryByClass(tenantId: string): Promise<{
    className: string
    studentCount: number
    totalAmount: number
    collectedAmount: number
    pendingAmount: number
  }[]> {
    const fees = await this.getStudentFees(tenantId)
    const classMap = new Map<string, { count: number; total: number; collected: number }>()

    fees.forEach(fee => {
      const existing = classMap.get(fee.className) || { count: 0, total: 0, collected: 0 }
      classMap.set(fee.className, {
        count: existing.count + 1,
        total: existing.total + fee.netAmount,
        collected: existing.collected + fee.paidAmount,
      })
    })

    return Array.from(classMap.entries()).map(([className, data]) => ({
      className,
      studentCount: data.count,
      totalAmount: data.total,
      collectedAmount: data.collected,
      pendingAmount: data.total - data.collected,
    })).sort((a, b) => a.className.localeCompare(b.className))
  },
}
