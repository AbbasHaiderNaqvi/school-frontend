import { api, toPaginated } from './api-client'

export interface Parent {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  cnic?: string | null
  occupation?: string | null
  address?: string | null
  isEmergencyContact?: boolean
  portalEnabled?: boolean
  portalStatus?: string | null
  userId?: string | null
  students?: LinkedStudent[]
  createdAt?: string
  updatedAt?: string | null
  [key: string]: unknown
}

export interface CreateParentRequest {
  firstName: string
  lastName: string
  email: string
  phone: string
  cnic?: string
  occupation?: string
  address?: string
  isEmergencyContact?: boolean
}

export interface ParentDropdownItem {
  id: string
  name: string
  email?: string
  [key: string]: unknown
}

export interface Paginated<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

export interface LinkedStudent {
  studentId: string
  studentName?: string
  relationship?: string
  isPrimary?: boolean
  [key: string]: unknown
}

export interface LinkStudentRequest {
  studentId: string
  relationship: string
  isPrimary?: boolean
}

// The backend returns snake_case for /parents (first_name, is_emergency_contact, …)
// while the rest of this codebase's services use camelCase — normalize at the boundary.
// The embedded/linked "students" list itself already comes back camelCase (studentId, studentName, …).
function normalizeLinkedStudent(raw: Record<string, unknown>): LinkedStudent {
  return {
    studentId: (raw.studentId ?? raw.student_id) as string,
    studentName: (raw.studentName ?? raw.student_name) as string | undefined,
    relationship: raw.relationship as string | undefined,
    isPrimary: (raw.isPrimary ?? raw.is_primary) as boolean | undefined,
  }
}

function normalizeParent(raw: Record<string, unknown>): Parent {
  const students = raw.students as unknown[] | undefined
  return {
    id: raw.id as string,
    firstName: (raw.firstName ?? raw.first_name) as string,
    lastName: (raw.lastName ?? raw.last_name) as string,
    email: raw.email as string,
    phone: (raw.phone as string | null | undefined) ?? null,
    cnic: raw.cnic as string | null | undefined,
    occupation: raw.occupation as string | null | undefined,
    address: raw.address as string | null | undefined,
    isEmergencyContact: (raw.isEmergencyContact ?? raw.is_emergency_contact) as boolean | undefined,
    portalEnabled: (raw.portalEnabled ?? raw.portal_enabled) as boolean | undefined,
    portalStatus: (raw.portalStatus ?? raw.portal_status) as string | null | undefined,
    userId: (raw.userId ?? raw.user_id) as string | null | undefined,
    students: Array.isArray(students) ? students.map(s => normalizeLinkedStudent(s as Record<string, unknown>)) : undefined,
    createdAt: (raw.createdAt ?? raw.created_at) as string | undefined,
    updatedAt: (raw.updatedAt ?? raw.updated_at) as string | null | undefined,
  }
}

function normalizeParentDropdownItem(raw: Record<string, unknown>): ParentDropdownItem {
  const fullName = (raw.fullName ?? raw.full_name) as string | undefined
  const firstName = (raw.firstName ?? raw.first_name) as string | undefined
  const lastName = (raw.lastName ?? raw.last_name) as string | undefined
  const email = raw.email as string | undefined
  const name = (raw.name as string | undefined) ?? fullName ?? [firstName, lastName].filter(Boolean).join(' ')
  return {
    id: raw.id as string,
    name: name || email || 'Unknown',
    email,
  }
}

export const parentService = {
  async getParents(params: { page?: number; limit?: number; search?: string } = {}): Promise<Paginated<Parent>> {
    const q = new URLSearchParams()
    if (params.page) q.set('page', String(params.page))
    if (params.limit) q.set('limit', String(params.limit))
    if (params.search) q.set('search', params.search)
    const qs = q.toString()
    const { data, error } = await api.get<unknown>(`/parents${qs ? `?${qs}` : ''}`)
    if (error) throw new Error(error)
    const page = toPaginated<Record<string, unknown>>(data)
    return { ...page, data: page.data.map(normalizeParent) }
  },

  async getParent(id: string): Promise<Parent | null> {
    const { data } = await api.get<Record<string, unknown>>(`/parents/${id}`)
    return data ? normalizeParent(data) : null
  },

  async getParentsDropdown(): Promise<ParentDropdownItem[]> {
    const { data } = await api.get<unknown>('/parents/dropdown')
    const list = Array.isArray(data) ? data : (data as { data?: unknown[] } | null)?.data ?? []
    return (list as Record<string, unknown>[]).map(normalizeParentDropdownItem)
  },

  async createParent(payload: CreateParentRequest): Promise<{ data: Parent | null; error?: string }> {
    const { data, error } = await api.post<Record<string, unknown>>('/parents', payload)
    if (error || !data) return { data: null, error: error || 'Failed to create parent' }
    return { data: normalizeParent(data) }
  },

  async updateParent(id: string, payload: Partial<CreateParentRequest>): Promise<{ data: Parent | null; error?: string }> {
    const { data, error } = await api.patch<Record<string, unknown>>(`/parents/${id}`, payload)
    if (error || !data) return { data: null, error: error || 'Failed to update parent' }
    return { data: normalizeParent(data) }
  },

  async deleteParent(id: string): Promise<{ error?: string }> {
    const { error } = await api.delete(`/parents/${id}`)
    return { error: error || undefined }
  },

  async getChildren(parentId: string): Promise<LinkedStudent[]> {
    const parent = await this.getParent(parentId)
    return parent?.students ?? []
  },

  async getLinkedStudents(parentId: string): Promise<LinkedStudent[]> {
    const { data, error } = await api.get<unknown>(`/academics/parents/${parentId}/students`)
    if (error) throw new Error(error)
    const list = Array.isArray(data) ? data : (data as { data?: unknown[] } | null)?.data ?? []
    return (list as Record<string, unknown>[]).map(normalizeLinkedStudent)
  },

  async linkStudent(parentId: string, payload: LinkStudentRequest): Promise<{ data: LinkedStudent | null; error?: string }> {
    const { data, error } = await api.post<Record<string, unknown>>(`/parents/${parentId}/link-student`, {
      studentId: payload.studentId,
      studentUserId: payload.studentId,
      relationship: payload.relationship,
      isPrimary: payload.isPrimary,
    })
    if (error || !data) return { data: null, error: error || 'Failed to link student' }
    return { data: normalizeLinkedStudent(data) }
  },
}
