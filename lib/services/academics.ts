import { api } from './api-client'

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

export const academicsService = {
  // Classes
  async getClasses(params: { page?: number; limit?: number; search?: string } = {}): Promise<Paginated<AcademicClass>> {
    const q = new URLSearchParams()
    if (params.page) q.set('page', String(params.page))
    if (params.limit) q.set('limit', String(params.limit))
    if (params.search) q.set('search', params.search)
    const qs = q.toString()
    const { data } = await api.get<Paginated<AcademicClass>>(`/academics/classes${qs ? `?${qs}` : ''}`)
    return data || { data: [], total: 0, page: 1, limit: 20 }
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
  async getSections(params: { classId?: string; page?: number; limit?: number } = {}): Promise<Paginated<AcademicSection>> {
    const q = new URLSearchParams()
    if (params.classId) q.set('classId', params.classId)
    if (params.page) q.set('page', String(params.page))
    if (params.limit) q.set('limit', String(params.limit))
    const qs = q.toString()
    const { data } = await api.get<Paginated<AcademicSection>>(`/academics/sections${qs ? `?${qs}` : ''}`)
    return data || { data: [], total: 0, page: 1, limit: 20 }
  },

  async getSectionById(id: string): Promise<AcademicSection | null> {
    const { data } = await api.get<AcademicSection>(`/academics/sections/${id}`)
    return data || null
  },

  async createSection(payload: { classId: string; name: string; capacity?: number }): Promise<{ section: AcademicSection | null; error?: string }> {
    const { data, error } = await api.post<AcademicSection>('/academics/sections', payload)
    if (error || !data) return { section: null, error: error || 'Failed to create section' }
    return { section: data }
  },

  async updateSection(id: string, payload: { name?: string; capacity?: number; isActive?: boolean }): Promise<AcademicSection | null> {
    const { data } = await api.patch<AcademicSection>(`/academics/sections/${id}`, payload)
    return data || null
  },

  async deleteSection(id: string): Promise<boolean> {
    const { error } = await api.delete(`/academics/sections/${id}`)
    return !error
  },
}
