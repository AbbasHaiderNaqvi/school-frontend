import { api, toPaginated } from './api-client'

export type StudentGender = 'MALE' | 'FEMALE' | 'OTHER'

export interface Student {
  id: string
  admissionNumber?: string
  firstName: string
  lastName: string
  admissionDate: string
  gender?: StudentGender
  dateOfBirth?: string
  bloodGroup?: string
  nationality?: string
  address?: string
  medicalNotes?: string
  previousSchool?: string
  email?: string
  grNumber?: string
  enrollmentNo?: string
  guardianIncome?: string
  householdIncome?: string
  familyMembersCount?: number
  status?: string
  portalEnabled?: boolean
  portalEmail?: string | null
  userId?: string | null
  campusId?: string | null
  guardian?: { id: string; firstName?: string; lastName?: string; email?: string; relationship?: string } | null
  createdAt?: string
  updatedAt?: string
  [key: string]: unknown
}

export interface GuardianRef {
  parentUserId: string
  relationship: string
}

export interface CreateStudentRequest {
  firstName: string
  lastName: string
  admissionDate: string
  guardian: GuardianRef
  gender?: StudentGender
  dateOfBirth?: string
  bloodGroup?: string
  nationality?: string
  address?: string
  medicalNotes?: string
  previousSchool?: string
  email?: string
  grNumber?: string
  enrollmentNo?: string
  guardianIncome?: string
  householdIncome?: string
  familyMembersCount?: number
}

export type UpdateStudentRequest = Partial<Omit<CreateStudentRequest, 'guardian'>>

export interface StudentDropdownItem {
  id: string
  name: string
  admissionNumber?: string
  [key: string]: unknown
}

export interface Paginated<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

// The backend returns snake_case for /students (admission_number, first_name, date_of_birth, …)
// while the rest of this codebase's services use camelCase — normalize at the boundary.
function normalizeStudent(raw: Record<string, unknown>): Student {
  const g = raw.guardian as Record<string, unknown> | null | undefined
  return {
    id: raw.id as string,
    admissionNumber: (raw.admissionNumber ?? raw.admission_number) as string | undefined,
    firstName: (raw.firstName ?? raw.first_name) as string,
    lastName: (raw.lastName ?? raw.last_name) as string,
    admissionDate: (raw.admissionDate ?? raw.admission_date) as string,
    gender: raw.gender as StudentGender | undefined,
    dateOfBirth: (raw.dateOfBirth ?? raw.date_of_birth) as string | undefined,
    bloodGroup: (raw.bloodGroup ?? raw.blood_group) as string | undefined,
    nationality: raw.nationality as string | undefined,
    address: raw.address as string | undefined,
    medicalNotes: (raw.medicalNotes ?? raw.medical_notes) as string | undefined,
    previousSchool: (raw.previousSchool ?? raw.previous_school) as string | undefined,
    email: raw.email as string | undefined,
    grNumber: (raw.grNumber ?? raw.gr_number) as string | undefined,
    enrollmentNo: (raw.enrollmentNo ?? raw.enrollment_no) as string | undefined,
    guardianIncome: (raw.guardianIncome ?? raw.guardian_income) as string | undefined,
    householdIncome: (raw.householdIncome ?? raw.household_income) as string | undefined,
    familyMembersCount: (raw.familyMembersCount ?? raw.family_members_count) as number | undefined,
    status: raw.status as string | undefined,
    portalEnabled: (raw.portalEnabled ?? raw.portal_enabled) as boolean | undefined,
    portalEmail: (raw.portalEmail ?? raw.portal_email) as string | null | undefined,
    userId: (raw.userId ?? raw.user_id) as string | null | undefined,
    campusId: (raw.campusId ?? raw.campus_id) as string | null | undefined,
    guardian: g
      ? {
          id: g.id as string,
          firstName: (g.firstName ?? g.first_name) as string | undefined,
          lastName: (g.lastName ?? g.last_name) as string | undefined,
          email: g.email as string | undefined,
          relationship: g.relationship as string | undefined,
        }
      : null,
    createdAt: (raw.createdAt ?? raw.created_at) as string | undefined,
    updatedAt: (raw.updatedAt ?? raw.updated_at) as string | undefined,
  }
}

function normalizeStudentDropdownItem(raw: Record<string, unknown>): StudentDropdownItem {
  const firstName = (raw.firstName ?? raw.first_name) as string | undefined
  const lastName = (raw.lastName ?? raw.last_name) as string | undefined
  return {
    id: raw.id as string,
    name: (raw.name as string | undefined) ?? [firstName, lastName].filter(Boolean).join(' '),
    admissionNumber: (raw.admissionNumber ?? raw.admission_number) as string | undefined,
  }
}

export const studentService = {
  async getStudents(params: { page?: number; limit?: number; search?: string } = {}): Promise<Paginated<Student>> {
    const q = new URLSearchParams()
    if (params.page) q.set('page', String(params.page))
    if (params.limit) q.set('limit', String(params.limit))
    if (params.search) q.set('search', params.search)
    const qs = q.toString()
    const { data, error } = await api.get<unknown>(`/students${qs ? `?${qs}` : ''}`)
    if (error) throw new Error(error)
    const page = toPaginated<Record<string, unknown>>(data)
    return { ...page, data: page.data.map(normalizeStudent) }
  },

  async getStudent(id: string): Promise<Student | null> {
    const { data } = await api.get<Record<string, unknown>>(`/students/${id}`)
    return data ? normalizeStudent(data) : null
  },

  async getStudentsDropdown(): Promise<StudentDropdownItem[]> {
    const { data } = await api.get<unknown>('/students/dropdown')
    const list = Array.isArray(data) ? data : (data as { data?: unknown[] } | null)?.data ?? []
    return (list as Record<string, unknown>[]).map(normalizeStudentDropdownItem)
  },

  async createStudent(payload: CreateStudentRequest): Promise<{ data: Student | null; error?: string }> {
    const { data, error } = await api.post<Record<string, unknown>>('/students', payload)
    if (error || !data) return { data: null, error: error || 'Failed to create student' }
    return { data: normalizeStudent(data) }
  },

  async updateStudent(id: string, payload: UpdateStudentRequest): Promise<{ data: Student | null; error?: string }> {
    const { data, error } = await api.patch<Record<string, unknown>>(`/students/${id}`, payload)
    if (error || !data) return { data: null, error: error || 'Failed to update student' }
    return { data: normalizeStudent(data) }
  },

  async deleteStudent(id: string): Promise<{ error?: string }> {
    const { error } = await api.delete(`/students/${id}`)
    return { error: error || undefined }
  },
}
