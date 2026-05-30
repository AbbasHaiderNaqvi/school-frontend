import { storage, STORAGE_KEYS } from './storage'
import type { Parent, Student } from '../types'
import { generateId } from '../utils'
import { auditService } from './audit'

// Initialize demo parent data
const initializeParentData = (tenantId: string): void => {
  const parents = storage.get<Parent[]>(STORAGE_KEYS.PARENTS) || []
  const students = storage.get<Student[]>(STORAGE_KEYS.STUDENTS) || []

  if (parents.filter(p => p.tenantId === tenantId).length === 0) {
    const tenantStudents = students.filter(s => s.tenantId === tenantId)
    
    // Create parents for students (some parents have multiple children)
    const parentMap = new Map<string, Parent>()
    
    tenantStudents.forEach((student, idx) => {
      // Every 3rd student shares a parent with previous student
      const shareParent = idx > 0 && idx % 3 === 0
      
      if (shareParent && parentMap.size > 0) {
        const lastParent = Array.from(parentMap.values()).pop()!
        lastParent.studentIds.push(student.id)
        // Update student with parent info
        const studentIdx = students.findIndex(s => s.id === student.id)
        if (studentIdx !== -1) {
          students[studentIdx] = {
            ...students[studentIdx],
            parentId: lastParent.id,
            parentName: lastParent.name,
            parentPhone: lastParent.phone,
          }
        }
      } else {
        const parentId = generateId()
        const relations: Parent['relation'][] = ['father', 'mother', 'guardian']
        const newParent: Parent = {
          id: parentId,
          tenantId,
          name: student.parentName || `Parent of ${student.name}`,
          email: `parent_${idx}@example.com`,
          phone: student.parentPhone || `555-${String(idx).padStart(4, '0')}`,
          alternatePhone: `555-${String(idx + 1000).padStart(4, '0')}`,
          occupation: ['Engineer', 'Doctor', 'Teacher', 'Business Owner', 'Accountant'][idx % 5],
          address: `${100 + idx} Main Street, City`,
          relation: relations[idx % 3],
          studentIds: [student.id],
          isActive: true,
          canLogin: idx % 4 !== 0, // 75% can login
          userId: idx % 4 !== 0 ? `parent_user_${parentId}` : undefined,
          lastLogin: idx % 4 !== 0 ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString() : undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        
        parentMap.set(parentId, newParent)
        
        // Update student with parent info
        const studentIdx = students.findIndex(s => s.id === student.id)
        if (studentIdx !== -1) {
          students[studentIdx] = {
            ...students[studentIdx],
            parentId: parentId,
            parentName: newParent.name,
            parentPhone: newParent.phone,
          }
        }
      }
    })

    storage.set(STORAGE_KEYS.PARENTS, [...parents, ...Array.from(parentMap.values())])
    storage.set(STORAGE_KEYS.STUDENTS, students)
  }
}

export const parentService = {
  async getParents(tenantId: string): Promise<Parent[]> {
    initializeParentData(tenantId)
    const parents = storage.get<Parent[]>(STORAGE_KEYS.PARENTS) || []
    return parents.filter(p => p.tenantId === tenantId)
  },

  async getParent(parentId: string): Promise<Parent | null> {
    const parents = storage.get<Parent[]>(STORAGE_KEYS.PARENTS) || []
    return parents.find(p => p.id === parentId) || null
  },

  async getParentById(parentId: string): Promise<Parent | null> {
    const parents = storage.get<Parent[]>(STORAGE_KEYS.PARENTS) || []
    return parents.find(p => p.id === parentId) || null
  },

  async getParentByStudentId(studentId: string): Promise<Parent | null> {
    const parents = storage.get<Parent[]>(STORAGE_KEYS.PARENTS) || []
    return parents.find(p => p.studentIds.includes(studentId)) || null
  },

  async createParent(data: Omit<Parent, 'id' | 'createdAt' | 'updatedAt'>): Promise<Parent> {
    const parents = storage.get<Parent[]>(STORAGE_KEYS.PARENTS) || []
    
    const newParent: Parent = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    parents.push(newParent)
    storage.set(STORAGE_KEYS.PARENTS, parents)

    // Update students with parent info
    if (data.studentIds.length > 0) {
      const students = storage.get<Student[]>(STORAGE_KEYS.STUDENTS) || []
      data.studentIds.forEach(studentId => {
        const idx = students.findIndex(s => s.id === studentId)
        if (idx !== -1) {
          students[idx] = {
            ...students[idx],
            parentId: newParent.id,
            parentName: newParent.name,
            parentPhone: newParent.phone,
          }
        }
      })
      storage.set(STORAGE_KEYS.STUDENTS, students)
    }

    auditService.log({
      action: 'CREATE',
      entity: 'Parent',
      entityId: newParent.id,
      details: `Created parent ${data.name}`,
      tenantId: data.tenantId,
    })

    return newParent
  },

  async updateParent(id: string, data: Partial<Parent>): Promise<Parent | null> {
    const parents = storage.get<Parent[]>(STORAGE_KEYS.PARENTS) || []
    const index = parents.findIndex(p => p.id === id)
    
    if (index === -1) return null

    parents[index] = { ...parents[index], ...data, updatedAt: new Date().toISOString() }
    storage.set(STORAGE_KEYS.PARENTS, parents)

    // Update students if name or phone changed
    if (data.name || data.phone) {
      const students = storage.get<Student[]>(STORAGE_KEYS.STUDENTS) || []
      parents[index].studentIds.forEach(studentId => {
        const idx = students.findIndex(s => s.id === studentId)
        if (idx !== -1) {
          students[idx] = {
            ...students[idx],
            parentName: data.name || students[idx].parentName,
            parentPhone: data.phone || students[idx].parentPhone,
          }
        }
      })
      storage.set(STORAGE_KEYS.STUDENTS, students)
    }

    auditService.log({
      action: 'UPDATE',
      entity: 'Parent',
      entityId: id,
      details: `Updated parent ${parents[index].name}`,
      tenantId: parents[index].tenantId,
    })

    return parents[index]
  },

  async deleteParent(id: string): Promise<boolean> {
    const parents = storage.get<Parent[]>(STORAGE_KEYS.PARENTS) || []
    const parent = parents.find(p => p.id === id)
    const filtered = parents.filter(p => p.id !== id)
    
    if (filtered.length === parents.length) return false
    
    // Clear parent info from students
    if (parent) {
      const students = storage.get<Student[]>(STORAGE_KEYS.STUDENTS) || []
      parent.studentIds.forEach(studentId => {
        const idx = students.findIndex(s => s.id === studentId)
        if (idx !== -1) {
          students[idx] = {
            ...students[idx],
            parentId: undefined,
          }
        }
      })
      storage.set(STORAGE_KEYS.STUDENTS, students)

      auditService.log({
        action: 'DELETE',
        entity: 'Parent',
        entityId: id,
        details: `Deleted parent ${parent.name}`,
        tenantId: parent.tenantId,
      })
    }
    
    storage.set(STORAGE_KEYS.PARENTS, filtered)
    return true
  },

  async linkStudentToParent(parentId: string, studentId: string): Promise<Parent | null> {
    const parents = storage.get<Parent[]>(STORAGE_KEYS.PARENTS) || []
    const students = storage.get<Student[]>(STORAGE_KEYS.STUDENTS) || []
    
    const parentIndex = parents.findIndex(p => p.id === parentId)
    const studentIndex = students.findIndex(s => s.id === studentId)
    
    if (parentIndex === -1 || studentIndex === -1) return null
    
    // Add student to parent's list
    if (!parents[parentIndex].studentIds.includes(studentId)) {
      parents[parentIndex].studentIds.push(studentId)
      parents[parentIndex].updatedAt = new Date().toISOString()
    }
    
    // Update student's parent info
    students[studentIndex] = {
      ...students[studentIndex],
      parentId: parentId,
      parentName: parents[parentIndex].name,
      parentPhone: parents[parentIndex].phone,
    }
    
    storage.set(STORAGE_KEYS.PARENTS, parents)
    storage.set(STORAGE_KEYS.STUDENTS, students)
    
    return parents[parentIndex]
  },

  async unlinkStudentFromParent(parentId: string, studentId: string): Promise<Parent | null> {
    const parents = storage.get<Parent[]>(STORAGE_KEYS.PARENTS) || []
    const students = storage.get<Student[]>(STORAGE_KEYS.STUDENTS) || []
    
    const parentIndex = parents.findIndex(p => p.id === parentId)
    const studentIndex = students.findIndex(s => s.id === studentId)
    
    if (parentIndex === -1) return null
    
    // Remove student from parent's list
    parents[parentIndex].studentIds = parents[parentIndex].studentIds.filter(id => id !== studentId)
    parents[parentIndex].updatedAt = new Date().toISOString()
    
    // Clear student's parent info
    if (studentIndex !== -1) {
      students[studentIndex] = {
        ...students[studentIndex],
        parentId: undefined,
      }
    }
    
    storage.set(STORAGE_KEYS.PARENTS, parents)
    storage.set(STORAGE_KEYS.STUDENTS, students)
    
    return parents[parentIndex]
  },

  async toggleLoginAccess(parentId: string): Promise<Parent | null> {
    const parent = await this.getParent(parentId)
    if (!parent) return null
    
    const canLogin = !parent.canLogin
    return this.updateParent(parentId, {
      canLogin,
      userId: canLogin ? `parent_user_${parentId}` : undefined,
    })
  },

  async getParentsWithLoginAccess(tenantId: string): Promise<Parent[]> {
    const parents = await this.getParents(tenantId)
    return parents.filter(p => p.canLogin)
  },

  async getParentStats(tenantId: string): Promise<{
    total: number
    withLogin: number
    withoutLogin: number
    activeLastWeek: number
    multipleChildren: number
  }> {
    const parents = await this.getParents(tenantId)
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    
    return {
      total: parents.length,
      withLogin: parents.filter(p => p.canLogin).length,
      withoutLogin: parents.filter(p => !p.canLogin).length,
      activeLastWeek: parents.filter(p => p.lastLogin && p.lastLogin > oneWeekAgo).length,
      multipleChildren: parents.filter(p => p.studentIds.length > 1).length,
    }
  },
}
