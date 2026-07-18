import { api, toPaginated } from './api-client'

export interface AcademicClass {
  id: string
  tenantId: string
  name: string
  gradeLevel?: number
  sortOrder: number
  description?: string
  isActive: boolean
  createdAt: string
  updatedAt?: string
}

export interface AcademicSection {
  id: string
  tenantId: string
  classId: string
  className: string
  name: string
  capacity?: number
  isActive: boolean
  createdAt: string
}

export interface Paginated<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

export type EnrollmentStatus = 'active' | 'promoted' | 'withdrawn' | 'transferred' | 'completed'

export interface Enrollment {
  id: string
  studentId: string
  classId: string
  sectionId?: string | null
  academicYear: string
  rollNumber?: string | null
  status: EnrollmentStatus
  notes?: string | null
  studentName?: string
  studentCode?: string
  studentRoll?: string
  className?: string
  sectionName?: string | null
  createdAt?: string
  updatedAt?: string | null
  [key: string]: unknown
}

export interface CreateEnrollmentRequest {
  studentId: string
  classId: string
  sectionId?: string
  academicYear: string
  rollNumber?: string
  notes?: string
}

export interface PromoteEnrollmentsRequest {
  classId: string
  academicYear: string
  targetClassId: string
  targetAcademicYear: string
  targetSectionId?: string
}

export interface PromoteEnrollmentsResult {
  promoted: number
  created: number
  skipped: number
}

// The backend returns snake_case, flat fields for /academics/enrollments
// (student_id, class_id, academic_year, roll_number, student_name, class_name, section_name, …).
function normalizeEnrollment(raw: Record<string, unknown>): Enrollment {
  return {
    id: raw.id as string,
    studentId: (raw.studentId ?? raw.student_id) as string,
    classId: (raw.classId ?? raw.class_id) as string,
    sectionId: (raw.sectionId ?? raw.section_id) as string | null | undefined,
    academicYear: (raw.academicYear ?? raw.academic_year) as string,
    rollNumber: (raw.rollNumber ?? raw.roll_number) as string | null | undefined,
    status: raw.status as EnrollmentStatus,
    notes: raw.notes as string | null | undefined,
    studentName: (raw.studentName ?? raw.student_name) as string | undefined,
    studentCode: (raw.studentCode ?? raw.student_code) as string | undefined,
    studentRoll: (raw.studentRoll ?? raw.student_roll) as string | undefined,
    className: (raw.className ?? raw.class_name) as string | undefined,
    sectionName: (raw.sectionName ?? raw.section_name) as string | null | undefined,
    createdAt: (raw.createdAt ?? raw.created_at) as string | undefined,
    updatedAt: (raw.updatedAt ?? raw.updated_at) as string | null | undefined,
  }
}

export const academicsService = {
  // Classes
  async getClasses(params: { page?: number; limit?: number; search?: string; isActive?: boolean } = {}): Promise<Paginated<AcademicClass>> {
    const q = new URLSearchParams()
    if (params.page) q.set('page', String(params.page))
    if (params.limit) q.set('limit', String(params.limit))
    if (params.search) q.set('search', params.search)
    if (params.isActive !== undefined) q.set('isActive', String(params.isActive))
    const qs = q.toString()
    const { data, error } = await api.get<Paginated<AcademicClass>>(`/academics/classes${qs ? `?${qs}` : ''}`)
    if (error) throw new Error(error)
    return toPaginated(data)
  },

  async getClassById(id: string): Promise<AcademicClass | null> {
    const { data } = await api.get<AcademicClass>(`/academics/classes/${id}`)
    return data || null
  },

  async createClass(payload: { name: string; gradeLevel?: number; description?: string; sortOrder?: number }): Promise<{ cls: AcademicClass | null; error?: string }> {
    const { data, error } = await api.post<AcademicClass>('/academics/classes', payload)
    if (error || !data) return { cls: null, error: error || 'Failed to create class' }
    return { cls: data }
  },

  async updateClass(id: string, payload: { name?: string; gradeLevel?: number; description?: string; sortOrder?: number; isActive?: boolean }): Promise<{ cls: AcademicClass | null; error?: string }> {
    const { data, error } = await api.patch<AcademicClass>(`/academics/classes/${id}`, payload)
    if (error || !data) return { cls: null, error: error || 'Failed to update class' }
    return { cls: data }
  },

  async deleteClass(id: string): Promise<boolean> {
    const { error } = await api.delete(`/academics/classes/${id}`)
    return !error
  },

  // Sections
  async getSections(params: { classId?: string; page?: number; limit?: number; isActive?: boolean } = {}): Promise<Paginated<AcademicSection>> {
    const q = new URLSearchParams()
    if (params.classId) q.set('classId', params.classId)
    if (params.page) q.set('page', String(params.page))
    if (params.limit) q.set('limit', String(params.limit))
    if (params.isActive !== undefined) q.set('isActive', String(params.isActive))
    const qs = q.toString()
    const { data, error } = await api.get<Paginated<AcademicSection>>(`/academics/sections${qs ? `?${qs}` : ''}`)
    if (error) throw new Error(error)
    return toPaginated(data)
  },

  async getSectionById(id: string): Promise<AcademicSection | null> {
    const { data } = await api.get<AcademicSection>(`/academics/sections/${id}`)
    return data || null
  },

  async createSection(payload: { classId: string; name: string; sortOrder?: number; capacity?: number }): Promise<{ section: AcademicSection | null; error?: string }> {
    const { data, error } = await api.post<AcademicSection>('/academics/sections', payload)
    if (error || !data) return { section: null, error: error || 'Failed to create section' }
    return { section: data }
  },

  async updateSection(id: string, payload: { name?: string; sortOrder?: number; capacity?: number; isActive?: boolean }): Promise<AcademicSection | null> {
    const { data } = await api.patch<AcademicSection>(`/academics/sections/${id}`, payload)
    return data || null
  },

  async deleteSection(id: string): Promise<boolean> {
    const { error } = await api.delete(`/academics/sections/${id}`)
    return !error
  },

  // Enrollments
  async getEnrollments(params: { classId?: string; academicYear?: string; status?: EnrollmentStatus; page?: number; limit?: number } = {}): Promise<Paginated<Enrollment>> {
    const q = new URLSearchParams()
    if (params.classId) q.set('classId', params.classId)
    if (params.academicYear) q.set('academicYear', params.academicYear)
    if (params.status) q.set('status', params.status)
    if (params.page) q.set('page', String(params.page))
    if (params.limit) q.set('limit', String(params.limit))
    const qs = q.toString()
    const { data, error } = await api.get<unknown>(`/academics/enrollments${qs ? `?${qs}` : ''}`)
    if (error) throw new Error(error)
    const page = toPaginated<Record<string, unknown>>(data)
    return { ...page, data: page.data.map(normalizeEnrollment) }
  },

  async getEnrollmentHistory(studentId: string): Promise<Enrollment[]> {
    const { data, error } = await api.get<unknown>(`/academics/enrollments/student/${studentId}`)
    if (error) throw new Error(error)
    const list = Array.isArray(data) ? data : (data as { data?: unknown[] } | null)?.data ?? []
    return (list as Record<string, unknown>[]).map(normalizeEnrollment)
  },

  async createEnrollment(payload: CreateEnrollmentRequest): Promise<{ data: Enrollment | null; error?: string }> {
    const { data, error } = await api.post<Record<string, unknown>>('/academics/enrollments', payload)
    if (error || !data) return { data: null, error: error || 'Failed to create enrollment' }
    return { data: normalizeEnrollment(data) }
  },

  async promoteEnrollments(payload: PromoteEnrollmentsRequest): Promise<{ data: PromoteEnrollmentsResult | null; error?: string }> {
    const { data, error } = await api.post<PromoteEnrollmentsResult>('/academics/enrollments/promote', payload)
    if (error || !data) return { data: null, error: error || 'Failed to promote enrollments' }
    return { data }
  },
}
